import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrdersService } from 'src/orders/orders.service';
import { WalletService } from 'src/wallet/wallet.service';
import { ChatService } from './chat.service';
import { BadRequestException, Logger } from '@nestjs/common';
import { OfferStatus } from 'src/generated/prisma/enums';

type AuthenticatedSocket = Socket & { userId: number; email: string };
@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private onlineUsers = new Map<number, Set<string>>();
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
    private readonly ordersService: OrdersService,
    private readonly walletService: WalletService,
  ) {}

  private parsePriceValue(
    value?: Prisma.Decimal | number | string | null,
  ): number | never {
    if (value instanceof Prisma.Decimal) {
      return value.toNumber();
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    throw new BadRequestException('Invalid price value');
  }

  private emitInboxUpdate(
    userIds: number[],
    payload: {
      conversationId: number;
      senderId: number;
      content?: string | null;
      imageUrl?: string | null;
      createdAt: Date;
    },
  ) {
    const socketIds = [
      ...new Set(
        userIds.flatMap((userId) => [...(this.onlineUsers.get(userId) || [])]),
      ),
    ];

    socketIds.forEach((socketId) => {
      this.server.to(socketId).emit('inbox:emit', payload);
    });
  }

  private emitUnreadConversationCountToUser(userId: number, count: number) {
    const socketIds = [...(this.onlineUsers.get(userId) || [])];

    socketIds.forEach((socketId) => {
      this.server.to(socketId).emit('conversation:unread-count', { count });
    });
  }

  private async emitUnreadConversationCounts(userIds: number[]) {
    const uniqueUserIds = [...new Set(userIds)];
    const unreadCounts = await Promise.all(
      uniqueUserIds.map(async (userId) => ({
        userId,
        count: await this.chatService.getUnreadConversationCount(userId),
      })),
    );

    unreadCounts.forEach(({ userId, count }) => {
      this.emitUnreadConversationCountToUser(userId, count);
    });
  }

  @OnEvent('chat.message.created')
  handleRealtimeMessageCreated(payload: {
    id: number;
    conversationId: number;
    senderId: number;
    content: string;
    createdAt: Date;
    buyerId: number;
    sellerId: number;
  }) {
    this.server
      .to(`conversation:${payload.conversationId}`)
      .emit('conversation:newMessage', {
        messageId: payload.id,
        conversationId: payload.conversationId,
        senderId: payload.senderId,
        content: payload.content,
        createdAt: payload.createdAt,
      });

    this.emitInboxUpdate([payload.buyerId, payload.sellerId], {
      conversationId: payload.conversationId,
      senderId: payload.senderId,
      content: payload.content,
      createdAt: payload.createdAt,
    });

    void this.emitUnreadConversationCounts([payload.buyerId, payload.sellerId]);
  }

  @OnEvent('order.updated')
  handleRealtimeOrderUpdated(payload: {
    orderId: number;
    buyerId: number;
    sellerId: number;
  }) {
    const socketIds = [
      ...new Set([
        ...(this.onlineUsers.get(payload.buyerId) || []),
        ...(this.onlineUsers.get(payload.sellerId) || []),
      ]),
    ];

    socketIds.forEach((socketId) => {
      this.server.to(socketId).emit('order:updated', {
        orderId: payload.orderId,
      });
    });
  }

  async handleConnection(@ConnectedSocket() socket: AuthenticatedSocket) {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        Logger.warn('[chat] Missing token on websocket handshake');
        socket.disconnect();
        return;
      }
      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.userId ?? payload.sub;
      const email = payload.email;
      if (!userId) {
        Logger.warn('[chat] Websocket token missing user identifier', {
          email,
          payloadKeys: Object.keys(payload || {}),
        });
        socket.disconnect();
        return;
      }
      socket.userId = userId;
      socket.email = email;
      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
      }
      this.onlineUsers.get(userId)?.add(socket.id);
      Logger.log(
        `[chat] User ${email} (${userId}) connected with socket ID ${socket.id}`,
      );
      const unreadCount =
        await this.chatService.getUnreadConversationCount(userId);
      this.emitUnreadConversationCountToUser(userId, unreadCount);
    } catch (error) {
      Logger.error('WebSocket connection error:', error);
      socket.disconnect();
    }
  }
  async handleDisconnect(@ConnectedSocket() socket: AuthenticatedSocket) {
    const userId = socket.userId;
    const email = socket.email;
    if (this.onlineUsers.has(userId)) {
      this.onlineUsers.get(userId)?.delete(socket.id);
      if (this.onlineUsers.get(userId)?.size === 0) {
        this.onlineUsers.delete(userId);
      }
    }
    Logger.log(`User ${email} disconnected from socket ID ${socket.id}`);
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: number },
  ) {
    const userId = socket.userId;
    Logger.log(
      `[chat] conversation:join requested by user ${userId} for conversation ${data.conversationId}`,
    );
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: data.conversationId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
    });
    if (!conversation) {
      Logger.warn(
        `[chat] conversation:join denied for user ${userId} on conversation ${data.conversationId}`,
      );
      socket.emit('error', 'Conversation not found');
      return;
    }
    socket.join(`conversation:${data.conversationId}`);
    Logger.log(
      `[chat] User ${socket.email} joined conversation ${data.conversationId}`,
    );
    return {
      conversationId: conversation.id,
      success: true,
    };
  }
  @SubscribeMessage('conversations:get')
  async handleGetConversations(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { conversationId: number },
  ) {
    const userId = socket.userId;
    Logger.log(
      `[chat] conversations:get requested by user ${userId} for conversation ${data.conversationId}`,
    );
    const conversation = await this.chatService.getConversationMessages(
      userId,
      data.conversationId,
    );
    void this.emitUnreadConversationCounts([userId]);
    return conversation;
  }

  @SubscribeMessage('conversations:getAll')
  async handleGetAllConversations(
    @ConnectedSocket() socket: AuthenticatedSocket,
  ) {
    const userId = socket.userId;
    Logger.log(`[chat] conversations:getAll requested by user ${userId}`);
    return this.chatService.getAllConversations(userId);
  }

  @SubscribeMessage('conversation:message')
  async handleSendMessage(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody()
    data: { conversationId: number; content: string; imageUrl?: string },
  ) {
    const userId = socket.userId;
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: data.conversationId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
    });
    if (!conversation) {
      socket.emit('error', 'Conversation not found');
      return;
    }
    const message = await this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: userId,
        content: data.content,
        imageUrl: data.imageUrl,
      },
    });
    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('conversation:newMessage', {
        messageId: message.id,
        conversationId: data.conversationId,
        senderId: userId,
        content: data.content,
        imageUrl: data.imageUrl,
        createdAt: message.createdAt,
      });
    this.emitInboxUpdate([conversation.buyerId, conversation.sellerId], {
      conversationId: data.conversationId,
      senderId: userId,
      content: data.content,
      imageUrl: data.imageUrl,
      createdAt: message.createdAt,
    });
    void this.emitUnreadConversationCounts([
      conversation.buyerId,
      conversation.sellerId,
    ]);
    return {
      messageId: message.id,
      conversationId: data.conversationId,
      senderId: userId,
      content: data.content,
      imageUrl: data.imageUrl,
      createdAt: message.createdAt,
    };
  }
  @SubscribeMessage('conversation:offer')
  async handleMakeOffer(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody()
    data: {
      conversationId: number;
      offerAmount: number;
      offerQuantity?: number;
    },
  ) {
    const userId = socket.userId;
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: data.conversationId,
        OR: [{ buyerId: userId }],
      },
      include: {
        product: true,
      },
    });
    if (!conversation)
      throw new BadRequestException(
        'Conversation not found or user is not the buyer',
      );
    const productPrice = this.parsePriceValue(conversation.product.price);

    if (
      !(
        data.offerAmount > productPrice * 0.8 &&
        data.offerAmount <= productPrice
      )
    ) {
      throw new BadRequestException('Unable to offer');
    }
    const offerMessage = await this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: userId,
        content: `I would like to offer ₦${data.offerAmount.toLocaleString()} x ${data.offerQuantity || 1} for this item.`,
        offerAmount: data.offerAmount,
        offerQuantity: data.offerQuantity || 1,
        offerStatus: OfferStatus.PENDING,
      },
    });
    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('conversation:newOffer', {
        messageId: offerMessage.id,
        conversationId: data.conversationId,
        senderId: userId,
        content: offerMessage.content,
        offerAmount: this.parsePriceValue(
          offerMessage.offerAmount ?? data.offerAmount,
        ),
        offerQuantity: offerMessage.offerQuantity,
        createdAt: offerMessage.createdAt,
        offerStatus: offerMessage.offerStatus,
      });
    this.emitInboxUpdate([conversation.buyerId, conversation.sellerId], {
      conversationId: data.conversationId,
      senderId: userId,
      content: offerMessage.content,
      createdAt: offerMessage.createdAt,
    });
    void this.emitUnreadConversationCounts([
      conversation.buyerId,
      conversation.sellerId,
    ]);
  }

  @SubscribeMessage('conversation:offerResponse')
  async handleOfferResponse(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody()
    data: {
      conversationId: number;
      offerId: number;
      response: 'accept' | 'reject';
    },
  ) {
    const userId = socket.userId;
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: data.conversationId,
        OR: [{ sellerId: userId }],
      },
    });
    if (!conversation)
      throw new BadRequestException(
        'Conversation not found or user is not the seller',
      );
    const offerMessage = await this.prisma.message.findFirst({
      where: { id: data.offerId, conversationId: data.conversationId },
    });
    if (!offerMessage) throw new BadRequestException('Offer message not found');

    const updatedOffer = await this.prisma.message.update({
      where: { id: data.offerId },
      data: {
        offerStatus:
          data.response === 'accept'
            ? OfferStatus.ACCEPTED
            : OfferStatus.REJECTED,
      },
    });
    if (data.response === 'accept') {
      await this.prisma.conversation.update({
        where: {
          id: data.conversationId,
        },
        data: {
          offeredPrice: offerMessage.offerAmount,
        },
      });
    }
    socket
      .to(`conversation:${data.conversationId}`)
      .emit('conversation:offerResponse', {
        messageId: data.offerId,
        conversationId: data.conversationId,
        senderId: updatedOffer.senderId,
        content: updatedOffer.content,
        offerAmount: this.parsePriceValue(updatedOffer.offerAmount),
        offerQuantity: updatedOffer.offerQuantity,
        offerStatus: updatedOffer.offerStatus,
        createdAt: updatedOffer.createdAt,
      });
    this.emitInboxUpdate([conversation.buyerId, conversation.sellerId], {
      conversationId: data.conversationId,
      senderId: updatedOffer.senderId,
      content: updatedOffer.content,
      createdAt: updatedOffer.createdAt,
    });
    void this.emitUnreadConversationCounts([
      conversation.buyerId,
      conversation.sellerId,
    ]);
  }
}

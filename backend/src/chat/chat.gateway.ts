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
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrdersService } from 'src/orders/orders.service';
import { WalletService } from 'src/wallet/wallet.service';
import { ChatService } from './chat.service';

type AuthenticatedSocket = Socket & {
  data: {
    userId?: number;
  };
};

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

  private getToken(socket: Socket) {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string') return authToken;

    const authorization = socket.handshake.headers.authorization;
    if (typeof authorization === 'string') {
      return authorization.replace(/^Bearer\s+/i, '');
    }

    return null;
  }

  async handleConnection(socket: AuthenticatedSocket) {
    try {
      const token = this.getToken(socket);
      if (!token) return socket.disconnect(true);

      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, accountVerified: true },
      });

      if (!user?.accountVerified) return socket.disconnect(true);
      socket.data.userId = user.id;
      await socket.join(`user:${user.id}`);

      const userSockets = this.onlineUsers.get(user.id) ?? new Set<string>();
      userSockets.add(socket.id);
      this.onlineUsers.set(user.id, userSockets);

      this.server.emit('presence:update', {
        userId: user.id,
        online: true,
      });
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    const userId = socket.data.userId;
    if (!userId) return;

    const userSockets = this.onlineUsers.get(userId);
    if (!userSockets) return;

    userSockets.delete(socket.id);
    if (userSockets.size > 0) return;

    this.onlineUsers.delete(userId);
    this.server.emit('presence:update', {
      userId,
      online: false,
    });
  }

  isUserOnline(userId: number) {
    return this.onlineUsers.has(userId);
  }

  @SubscribeMessage('conversation:join')
  async joinConversation(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { conversationId?: number },
  ) {
    try {
      const userId = socket.data.userId;
      const conversationId = Number(body?.conversationId);
      if (!userId || !conversationId) return;

      await this.chatService.ensureParticipant(conversationId, userId);
      await socket.join(`conversation:${conversationId}`);
      socket.emit('conversation:joined', { conversationId });
      socket.emit('presence:snapshot', {
        onlineUserIds: Array.from(this.onlineUsers.keys()),
      });
    } catch (error: any) {
      socket.emit('chat:error', {
        message: error?.message || 'Unable to join conversation',
      });
    }
  }

  @SubscribeMessage('conversation:read')
  async markConversationRead(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { conversationId?: number },
  ) {
    try {
      const userId = socket.data.userId;
      const conversationId = Number(body?.conversationId);
      if (!userId || !conversationId) return;

      const readState = await this.chatService.markConversationRead(
        conversationId,
        userId,
      );
      this.emitConversationRead(conversationId, {
        ...readState,
        readerId: userId,
      });
      await this.emitUnreadCount(userId);
    } catch (error: any) {
      socket.emit('chat:error', {
        message: error?.message || 'Unable to mark messages read',
      });
    }
  }

  @SubscribeMessage('message:send')
  async sendMessage(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody()
    body: {
      clientRequestId?: string;
      conversationId?: number;
      content?: string;
      imageUrl?: string;
      offerAmount?: number;
      offerQuantity?: number;
    },
  ) {
    try {
      const userId = socket.data.userId;
      const conversationId = Number(body?.conversationId);
      if (!userId || !conversationId || (!body?.content && !body?.imageUrl)) {
        socket.emit('message:sent', {
          clientRequestId: body?.clientRequestId,
          ok: false,
          message: 'Message content is required',
        });
        return;
      }

      const message = await this.chatService.sendMessage(
        conversationId,
        userId,
        {
          content: body.content,
          imageUrl: body.imageUrl,
          offerAmount: body.offerAmount,
          offerQuantity: body.offerQuantity,
        },
      );

      await this.emitNewMessage(conversationId, message);
      socket.emit('message:sent', {
        clientRequestId: body?.clientRequestId,
        ok: true,
        message,
      });
    } catch (error: any) {
      socket.emit('message:sent', {
        clientRequestId: body?.clientRequestId,
        ok: false,
        message: error?.message || 'Message not sent',
      });
      socket.emit('chat:error', {
        message: error?.message || 'Message not sent',
      });
    }
  }

  @SubscribeMessage('offer:respond')
  async respondToOffer(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody()
    body: {
      clientRequestId?: string;
      conversationId?: number;
      offerMessageId?: number;
      accepted?: boolean;
    },
  ) {
    try {
      const userId = socket.data.userId;
      const conversationId = Number(body?.conversationId);
      const offerMessageId = Number(body?.offerMessageId);
      if (!userId || !conversationId || !offerMessageId) {
        socket.emit('offer:responded', {
          clientRequestId: body?.clientRequestId,
          ok: false,
          message: 'Offer unavailable',
        });
        return;
      }

      const result = await this.chatService.respondToOffer(
        conversationId,
        userId,
        offerMessageId,
        Boolean(body.accepted),
      );

      this.emitOfferUpdated(conversationId, result.offer);
      await this.emitNewMessage(conversationId, result.message);
      socket.emit('offer:responded', {
        clientRequestId: body?.clientRequestId,
        ok: true,
        ...result,
      });
    } catch (error: any) {
      socket.emit('offer:responded', {
        clientRequestId: body?.clientRequestId,
        ok: false,
        message: error?.message || 'Offer response not sent',
      });
      socket.emit('chat:error', {
        message: error?.message || 'Offer response not sent',
      });
    }
  }

  @SubscribeMessage('checkout:get-current')
  async getCurrentCheckout(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody()
    body: {
      clientRequestId?: string;
      productId?: number;
      conversationId?: number;
      offerMessageId?: number;
      source?: string;
    },
  ) {
    try {
      const userId = socket.data.userId;
      if (!userId) return;

      const data = await this.ordersService.getCurrentCheckout(userId, {
        productId: Number(body?.productId),
        conversationId: body?.conversationId
          ? Number(body.conversationId)
          : undefined,
        offerMessageId: body?.offerMessageId
          ? Number(body.offerMessageId)
          : undefined,
        source: body?.source,
      });

      socket.emit('checkout:current', {
        clientRequestId: body?.clientRequestId,
        ok: true,
        ...data,
      });
    } catch (error: any) {
      socket.emit('checkout:current', {
        clientRequestId: body?.clientRequestId,
        ok: false,
        message: error?.message || 'Checkout unavailable',
      });
      socket.emit('chat:error', {
        message: error?.message || 'Checkout unavailable',
      });
    }
  }

  @SubscribeMessage('order:create')
  async createOrder(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: any,
  ) {
    try {
      const userId = socket.data.userId;
      if (!userId) return;

      const data = await this.ordersService.createOrder(userId, body);
      await this.emitOrderUpdated(data.order.id);
      socket.emit('order:created', {
        clientRequestId: body?.clientRequestId,
        ok: true,
        ...data,
      });
    } catch (error: any) {
      socket.emit('order:created', {
        clientRequestId: body?.clientRequestId,
        ok: false,
        message: error?.message || 'Order unavailable',
      });
      socket.emit('chat:error', {
        message: error?.message || 'Order unavailable',
      });
    }
  }

  @SubscribeMessage('order:get')
  async getOrder(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { clientRequestId?: string; orderId?: number },
  ) {
    try {
      const userId = socket.data.userId;
      const orderId = Number(body?.orderId);
      if (!userId || !orderId) return;

      const order = await this.ordersService.getOrder(orderId, userId);
      socket.emit('order:loaded', {
        clientRequestId: body?.clientRequestId,
        ok: true,
        order,
      });
    } catch (error: any) {
      socket.emit('order:loaded', {
        clientRequestId: body?.clientRequestId,
        ok: false,
        message: error?.message || 'Order unavailable',
      });
      socket.emit('chat:error', {
        message: error?.message || 'Order unavailable',
      });
    }
  }

  @SubscribeMessage('order:status:update')
  async updateOrderStatus(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody()
    body: {
      clientRequestId?: string;
      orderId?: number;
      action?: string;
    },
  ) {
    try {
      const userId = socket.data.userId;
      const orderId = Number(body?.orderId);
      if (!userId || !orderId) return;

      const order = await this.ordersService.updateOrderStatus(
        orderId,
        userId,
        body?.action,
      );
      await this.emitOrderUpdated(order.id);
      socket.emit('order:status:updated', {
        clientRequestId: body?.clientRequestId,
        ok: true,
        order,
      });
    } catch (error: any) {
      socket.emit('order:status:updated', {
        clientRequestId: body?.clientRequestId,
        ok: false,
        message: error?.message || 'Order update failed',
      });
      socket.emit('chat:error', {
        message: error?.message || 'Order update failed',
      });
    }
  }

  @SubscribeMessage('payment:mock-transfer')
  async confirmMockTransfer(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody()
    body: {
      clientRequestId?: string;
      accountNumber?: string;
      amount?: number;
      reference?: string;
    },
  ) {
    try {
      const result = await this.walletService.sendMoneyToAccount(
        String(body?.accountNumber || ''),
        Number(body?.amount),
        body?.reference,
      );

      if (result.orderId) {
        await this.emitOrderUpdated(result.orderId);
      }

      const order =
        result.orderId && socket.data.userId
          ? await this.ordersService.getOrder(
              result.orderId,
              socket.data.userId,
            )
          : null;

      socket.emit('payment:mock-transfer:confirmed', {
        clientRequestId: body?.clientRequestId,
        ok: true,
        order,
        ...result,
      });
    } catch (error: any) {
      socket.emit('payment:mock-transfer:confirmed', {
        clientRequestId: body?.clientRequestId,
        ok: false,
        message: error?.message || 'Payment failed',
      });
      socket.emit('chat:error', {
        message: error?.message || 'Payment failed',
      });
    }
  }

  async emitNewMessage(conversationId: number, message: any) {
    const participantIds =
      await this.chatService.getConversationParticipantIds(conversationId);
    const rooms = [
      `conversation:${conversationId}`,
      ...participantIds.map((userId) => `user:${userId}`),
    ];

    this.server.to(rooms).emit('message:new', message);
    await this.emitUnreadCounts(participantIds);
  }

  emitConversationRead(conversationId: number, readState: any) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('conversation:read', readState);
  }

  emitOfferUpdated(conversationId: number, offer: any) {
    this.server.to(`conversation:${conversationId}`).emit('offer:updated', {
      conversationId,
      offer,
    });
  }

  async emitOrderUpdated(orderId: number) {
    const participantIds =
      await this.ordersService.getOrderParticipantIds(orderId);

    await Promise.all(
      participantIds.map(async (userId) => {
        const order = await this.ordersService.getOrder(orderId, userId);
        this.server.to(`user:${userId}`).emit('order:updated', order);
      }),
    );
  }

  private async emitUnreadCount(userId: number) {
    const count = await this.chatService.getUnreadCount(userId);
    this.server.to(`user:${userId}`).emit('conversation:unread-count', {
      count,
    });
  }

  private async emitUnreadCounts(userIds: number[]) {
    await Promise.all(userIds.map((userId) => this.emitUnreadCount(userId)));
  }
}

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

  async emitNewMessage(conversationId: number, message: any) {
    const participantIds =
      await this.chatService.getConversationParticipantIds(conversationId);
    const rooms = [
      `conversation:${conversationId}`,
      ...participantIds.map((userId) => `user:${userId}`),
    ];

    this.server.to(rooms).emit('message:new', message);
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
}

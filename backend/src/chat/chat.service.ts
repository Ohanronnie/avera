import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

const MIN_OFFER_PERCENT = 80;

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private userSelect = {
    id: true,
    username: true,
    firstName: true,
    lastName: true,
    avatarUrl: true,
  };

  private productSelect = {
    id: true,
    name: true,
    price: true,
    quantity: true,
    sellerId: true,
    images: {
      take: 1,
      select: {
        url: true,
      },
    },
  };

  private conversationInclude = {
    buyer: { select: this.userSelect },
    seller: { select: this.userSelect },
    product: { select: this.productSelect },
    messages: {
      take: 1,
      orderBy: { createdAt: 'desc' as const },
      include: {
        sender: { select: this.userSelect },
      },
    },
  };

  private messageInclude = {
    sender: { select: this.userSelect },
  };

  private getDisplayName(user: {
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return fullName || user.username || 'Avera user';
  }

  private mapMessage(message: any) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: this.getDisplayName(message.sender),
      content: message.content,
      imageUrl: message.imageUrl,
      offerAmount: message.offerAmount ? Number(message.offerAmount) : null,
      offerQuantity: message.offerQuantity || null,
      offerStatus: message.offerStatus || null,
      readAt: message.readAt,
      createdAt: message.createdAt,
      deliveredAt: message.createdAt,
    };
  }

  private mapConversation(conversation: any, userId: number) {
    const counterpart =
      conversation.buyerId === userId
        ? conversation.seller
        : conversation.buyer;
    const lastMessage = conversation.messages?.[0];
    const unreadCount =
      conversation._count?.messages ??
      conversation.messages?.filter(
        (message) => message.senderId !== userId && !message.readAt,
      ).length ??
      0;

    return {
      id: conversation.id,
      buyerId: conversation.buyerId,
      sellerId: conversation.sellerId,
      productId: conversation.productId,
      product: {
        id: conversation.product.id,
        name: conversation.product.name,
        price: Number(conversation.product.price),
        quantity: conversation.product.quantity,
        imageUrl: conversation.product.images?.[0]?.url || null,
      },
      counterpart: {
        id: counterpart.id,
        name: this.getDisplayName(counterpart),
        avatarUrl: counterpart.avatarUrl,
      },
      lastMessage: lastMessage ? this.mapMessage(lastMessage) : null,
      unreadCount,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  async createOrGetConversation(
    userId: number,
    createConversationDto: CreateConversationDto,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: createConversationDto.productId },
      select: {
        id: true,
        sellerId: true,
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId === userId) {
      throw new BadRequestException({
        code: 'CANNOT_MESSAGE_OWN_PRODUCT',
        message: "You can't message yourself about your own product.",
      });
    }

    const conversation = await this.prisma.conversation.upsert({
      where: {
        buyerId_sellerId_productId: {
          buyerId: userId,
          sellerId: product.sellerId,
          productId: product.id,
        },
      },
      create: {
        buyerId: userId,
        sellerId: product.sellerId,
        productId: product.id,
      },
      update: {},
      include: {
        ...this.conversationInclude,
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: userId },
                readAt: null,
              },
            },
          },
        },
      },
    });

    return this.mapConversation(conversation, userId);
  }

  async listConversations(userId: number) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      include: {
        ...this.conversationInclude,
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: userId },
                readAt: null,
              },
            },
          },
        },
      },
    });

    return conversations.map((conversation) =>
      this.mapConversation(conversation, userId),
    );
  }

  async getUnreadCount(userId: number) {
    return this.prisma.conversation.count({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        messages: {
          some: {
            senderId: { not: userId },
            readAt: null,
          },
        },
      },
    });
  }

  async getConversationForUser(conversationId: number, userId: number) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: this.conversationInclude,
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async getConversationDetails(conversationId: number, userId: number) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        ...this.conversationInclude,
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: userId },
                readAt: null,
              },
            },
          },
        },
      },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    return this.mapConversation(conversation, userId);
  }

  async ensureParticipant(conversationId: number, userId: number) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      select: { id: true },
    });

    if (!conversation) throw new ForbiddenException('Conversation unavailable');
    return true;
  }

  async getConversationParticipantIds(conversationId: number) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        buyerId: true,
        sellerId: true,
      },
    });

    if (!conversation) return [];
    return [conversation.buyerId, conversation.sellerId];
  }

  async listMessages(conversationId: number, userId: number) {
    await this.ensureParticipant(conversationId, userId);

    await this.markConversationRead(conversationId, userId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: this.messageInclude,
      take: 100,
    });

    return messages.map((message) => this.mapMessage(message));
  }

  async markConversationRead(conversationId: number, userId: number) {
    await this.ensureParticipant(conversationId, userId);

    const readAt = new Date();
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: {
          not: userId,
        },
        readAt: null,
      },
      data: {
        readAt,
      },
    });

    return { conversationId, readAt };
  }

  async sendMessage(
    conversationId: number,
    senderId: number,
    sendMessageDto: SendMessageDto,
  ) {
    await this.ensureParticipant(conversationId, senderId);

    const content = sendMessageDto.content?.trim() || '';
    const imageUrl = sendMessageDto.imageUrl?.trim() || null;
    if (!content && !imageUrl) {
      throw new BadRequestException('Message cannot be empty');
    }

    if (sendMessageDto.offerAmount) {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
          product: {
            select: {
              price: true,
              quantity: true,
            },
          },
        },
      });
      const productPrice = Number(conversation?.product.price || 0);
      const availableQuantity = Number(conversation?.product.quantity || 1);
      const offerQuantity = sendMessageDto.offerQuantity || 1;
      const minimumOffer = Math.ceil(productPrice * (MIN_OFFER_PERCENT / 100));

      if (productPrice > 0 && sendMessageDto.offerAmount < minimumOffer) {
        throw new BadRequestException({
          code: 'OFFER_TOO_LOW',
          message: `Offer must be at least ${MIN_OFFER_PERCENT}% of the listed price.`,
          minimumOffer,
        });
      }

      if (offerQuantity > availableQuantity) {
        throw new BadRequestException({
          code: 'OFFER_QUANTITY_TOO_HIGH',
          message: `Only ${availableQuantity} available.`,
          availableQuantity,
        });
      }
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          conversationId,
          senderId,
          content,
          imageUrl,
          offerAmount: sendMessageDto.offerAmount,
          offerQuantity: sendMessageDto.offerAmount
            ? sendMessageDto.offerQuantity || 1
            : undefined,
          offerStatus: sendMessageDto.offerAmount ? 'PENDING' : undefined,
        },
        include: this.messageInclude,
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: createdMessage.createdAt },
      });

      return createdMessage;
    });

    return this.mapMessage(message);
  }

  async respondToOffer(
    conversationId: number,
    userId: number,
    offerMessageId: number,
    accepted: boolean,
  ) {
    const conversation = await this.getConversationForUser(
      conversationId,
      userId,
    );
    if (conversation.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can respond to offers');
    }

    const offerMessage = await this.prisma.message.findFirst({
      where: {
        id: offerMessageId,
        conversationId,
        offerAmount: { not: null },
      },
      include: this.messageInclude,
    });

    if (!offerMessage) throw new NotFoundException('Offer not found');
    if (offerMessage.senderId === userId) {
      throw new BadRequestException('You cannot respond to your own offer');
    }
    if (offerMessage.offerStatus && offerMessage.offerStatus !== 'PENDING') {
      throw new BadRequestException('This offer has already been handled');
    }

    const amount = Number(offerMessage.offerAmount);
    const quantity = Number(offerMessage.offerQuantity || 1);
    const total = amount * quantity;
    const status = accepted ? 'ACCEPTED' : 'REJECTED';
    const content = accepted
      ? `Offer accepted: ₦${amount.toLocaleString()} x ${quantity} = ₦${total.toLocaleString()}.`
      : `Offer rejected: ₦${amount.toLocaleString()} x ${quantity}.`;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedOffer = await tx.message.update({
        where: { id: offerMessageId },
        data: { offerStatus: status },
        include: this.messageInclude,
      });

      const responseMessage = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          content,
        },
        include: this.messageInclude,
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: responseMessage.createdAt },
      });

      return { updatedOffer, responseMessage };
    });

    return {
      offer: this.mapMessage(result.updatedOffer),
      message: this.mapMessage(result.responseMessage),
    };
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConversationStatus,
  OfferStatus,
} from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Prisma, PrismaClient } from 'src/generated/prisma/client';

const MIN_OFFER_PERCENT = 80;

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private async findActiveConversation(
    buyerId: number,
    sellerId: number,
    productId: number,
  ) {
    return this.prisma.conversation.findFirst({
      where: {
        buyerId,
        sellerId,
        productId,
        status: ConversationStatus.ACTIVE,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getUnreadConversationCount(userId: number) {
    const unreadConversations = await this.prisma.message.findMany({
      where: {
        senderId: { not: userId },
        readAt: null,
        conversation: {
          OR: [{ buyerId: userId }, { sellerId: userId }],
        },
      },
      distinct: ['conversationId'],
      select: {
        conversationId: true,
      },
    });

    return unreadConversations.length;
  }

  async createConversation(userId: number, productId: number): Promise<number> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { seller: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId === userId) {
      throw new ForbiddenException(
        'Cannot start conversation on your own product',
      );
    }

    const activeConversation = await this.findActiveConversation(
      userId,
      product.sellerId,
      productId,
    );

    const conversation =
      activeConversation ||
      (await this.prisma.conversation.create({
        data: {
          buyerId: userId,
          sellerId: product.sellerId,
          productId,
          status: ConversationStatus.ACTIVE,
        },
      }));

    return conversation.id;
  }

  async getAllConversations(userId: number) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
            sellerId: true,
            images: true,
          },
        },
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const unreadCounts = await Promise.all(
      conversations.map((conversation) =>
        this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            readAt: null,
          },
        }),
      ),
    );

    return conversations.map((conversation, index) => ({
      ...conversation,
      unreadCount: unreadCounts[index] || 0,
    }));
  }
  async getConversationMessages(userId: number, conversationId: number) {
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
            images: true,
          },
        },
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return {
      conversationId: conversation.id,
      status: conversation.status,
      closedAt: conversation.closedAt,
      buyerId: conversation.buyerId,
      sellerId: conversation.sellerId,
      messages: conversation.messages,
      counterparty:
        conversation.buyerId === userId
          ? conversation.seller
          : conversation.buyer,
      product: conversation.product,
      sellerName: `${conversation.seller.firstName} ${conversation.seller.lastName}`,
    };
  }
  async getReviewOrderDetails(userId: number, conversationId: number) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
            sellerId: true,
            images: true,
          },
        },
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            address: true,
            state: true,
            city: true,
          },
        },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const acceptedOffer = await this.prisma.message.findFirst({
      where: {
        conversationId: conversation.id,
        offerStatus: OfferStatus.ACCEPTED,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        offerAmount: true,
        offerQuantity: true,
      },
    });

    return {
      conversationId: conversation.id,
      productId: conversation.product.id,
      sellerId: conversation.seller.id,
      sellerName: `${conversation.seller.firstName} ${conversation.seller.lastName}`,
      buyerName: `${conversation.buyer.firstName} ${conversation.buyer.lastName}`,
      product: conversation.product,
      buyerAddress: conversation.buyer.address,
      buyerState: conversation.buyer.state,
      buyerCity: conversation.buyer.city,
      offeredPrice: conversation.offeredPrice,
      offerMessageId: acceptedOffer?.id ?? null,
      offerQuantity: acceptedOffer?.offerQuantity ?? null,
      source: conversation.offeredPrice ? 'offer' : 'buy_now',
    };
  }
}

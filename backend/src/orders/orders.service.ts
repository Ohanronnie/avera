import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderSource, OrderStatus } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { WalletService } from 'src/wallet/wallet.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  private userSelect = {
    id: true,
    username: true,
    firstName: true,
    lastName: true,
    avatarUrl: true,
  };

  private orderInclude = {
    buyer: { select: this.userSelect },
    seller: { select: this.userSelect },
    product: {
      select: {
        id: true,
        name: true,
        price: true,
        quantity: true,
        images: {
          take: 1,
          select: { url: true },
        },
      },
    },
  };

  private getDisplayName(user: {
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return fullName || user.username || 'Avera user';
  }

  private getStatusText(status: OrderStatus) {
    const labels: Record<OrderStatus, string> = {
      PENDING_TRANSFER: 'Pending transfer',
      PAID_IN_ESCROW: 'Paid in escrow',
      SELLER_PREPARING: 'Seller preparing',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      DISPUTED: 'Disputed',
    };
    return labels[status];
  }

  private getOrderStep(status: OrderStatus) {
    const steps: Record<OrderStatus, string> = {
      PENDING_TRANSFER: 'Waiting for buyer transfer',
      PAID_IN_ESCROW: 'Buyer paid. Seller should prepare the product',
      SELLER_PREPARING: 'Seller is preparing the product',
      SHIPPED: 'Product is on the way',
      DELIVERED: 'Waiting for buyer confirmation',
      COMPLETED: 'Order completed',
      CANCELLED: 'Order cancelled',
      DISPUTED: 'Order under dispute',
    };
    return steps[status];
  }

  private getEscrowState(status: OrderStatus) {
    if (status === 'PENDING_TRANSFER') return 'No funds captured yet';
    if (['COMPLETED', 'CANCELLED'].includes(status)) {
      return status === 'COMPLETED' ? 'Funds released' : 'Funds not captured';
    }
    return 'Payment held in escrow';
  }

  private getReusableOrderStatuses(): OrderStatus[] {
    return [
      'PENDING_TRANSFER',
      'PAID_IN_ESCROW',
      'SELLER_PREPARING',
      'SHIPPED',
      'DELIVERED',
      'DISPUTED',
    ];
  }

  private mapOrder(order: any, userId: number) {
    const isBuyer = order.buyerId === userId;
    const counterparty = isBuyer ? order.seller : order.buyer;
    const quantity = Number(order.quantity || 1);
    const unitPrice = Number(order.unitPrice || 0);
    const subtotal = Number(order.subtotal || 0);
    const escrowFee = Number(order.escrowFee || 0);
    const totalAmount = Number(order.totalAmount || 0);

    return {
      id: order.id,
      code: `AV-${String(order.id).padStart(4, '0')}`,
      mode: isBuyer ? 'buying' : 'selling',
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      productId: order.productId,
      conversationId: order.conversationId,
      offerMessageId: order.offerMessageId,
      source: order.source,
      status: order.status,
      statusText: this.getStatusText(order.status),
      step: this.getOrderStep(order.status),
      escrowState: this.getEscrowState(order.status),
      quantity,
      unitPrice,
      subtotal,
      escrowFee,
      totalAmount,
      delivery: {
        name: order.deliveryName,
        phone: order.deliveryPhone,
        address: order.deliveryAddress,
        city: order.deliveryCity,
        state: order.deliveryState,
        country: order.deliveryCountry,
      },
      product: {
        id: order.product.id,
        name: order.product.name,
        imageUrl: order.product.images?.[0]?.url || null,
      },
      counterparty: {
        id: counterparty.id,
        name: this.getDisplayName(counterparty),
        role: isBuyer ? 'Seller' : 'Buyer',
        avatarUrl: counterparty.avatarUrl,
      },
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async createOrder(userId: number, input: CreateOrderDto) {
    const productId = Number(input.productId);
    const quantity = Math.max(1, Number(input.quantity || 1));
    const deliveryAddress = input.deliveryAddress?.trim();

    if (!productId) throw new BadRequestException('Product is required');
    if (!deliveryAddress) {
      throw new BadRequestException({
        code: 'DELIVERY_ADDRESS_REQUIRED',
        message: 'Delivery address is required',
      });
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        sellerId: true,
        price: true,
        quantity: true,
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId === userId) {
      throw new BadRequestException("You can't buy your own product");
    }
    if (quantity > Number(product.quantity || 1)) {
      throw new BadRequestException(`Only ${product.quantity} available`);
    }

    const conversationId = input.conversationId
      ? Number(input.conversationId)
      : null;
    if (conversationId) {
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          id: conversationId,
          buyerId: userId,
          sellerId: product.sellerId,
          productId: product.id,
        },
        select: { id: true },
      });
      if (!conversation) {
        throw new ForbiddenException('Conversation unavailable for this order');
      }
    }

    let source: OrderSource =
      input.source === 'offer' || input.source === 'OFFER'
        ? 'OFFER'
        : 'BUY_NOW';
    let unitPrice = Number(product.price);
    let orderQuantity = quantity;
    const offerMessageId = input.offerMessageId
      ? Number(input.offerMessageId)
      : null;

    if (offerMessageId) {
      const offer = await this.prisma.message.findFirst({
        where: {
          id: offerMessageId,
          senderId: userId,
          offerStatus: 'ACCEPTED',
          offerAmount: { not: null },
          conversation: {
            buyerId: userId,
            sellerId: product.sellerId,
            productId: product.id,
          },
        },
        select: {
          id: true,
          conversationId: true,
          offerAmount: true,
          offerQuantity: true,
        },
      });

      if (!offer) throw new BadRequestException('Accepted offer unavailable');
      source = 'OFFER';
      unitPrice = Number(offer.offerAmount);
      orderQuantity = Number(offer.offerQuantity || quantity || 1);
    }

    if (orderQuantity > Number(product.quantity || 1)) {
      throw new BadRequestException(`Only ${product.quantity} available`);
    }

    const subtotal = unitPrice * orderQuantity;
    const escrowFee = Math.round(subtotal * 0.015);
    const totalAmount = subtotal + escrowFee;
    const reusableOrder = await this.findReusableCheckout({
      buyerId: userId,
      sellerId: product.sellerId,
      productId: product.id,
      conversationId,
      offerMessageId,
      source,
    });

    if (reusableOrder) {
      const order = await this.prisma.order.update({
        where: { id: reusableOrder.id },
        data: {
          deliveryName:
            input.deliveryName?.trim() || reusableOrder.deliveryName,
          deliveryPhone:
            input.deliveryPhone?.trim() || reusableOrder.deliveryPhone,
          deliveryAddress,
          deliveryCity:
            input.deliveryCity?.trim() || reusableOrder.deliveryCity,
          deliveryState:
            input.deliveryState?.trim() || reusableOrder.deliveryState,
          deliveryCountry:
            input.deliveryCountry?.trim() || reusableOrder.deliveryCountry,
        },
        include: this.orderInclude,
      });

      return {
        order: this.mapOrder(order, userId),
        paymentAccount: await this.walletService.getPublicAccountForUser(
          product.sellerId,
        ),
        existing: true,
      };
    }

    const order = await this.prisma.order.create({
      data: {
        buyerId: userId,
        sellerId: product.sellerId,
        productId: product.id,
        conversationId,
        offerMessageId,
        source,
        status: 'PENDING_TRANSFER',
        quantity: orderQuantity,
        unitPrice,
        subtotal,
        escrowFee,
        totalAmount,
        deliveryName: input.deliveryName?.trim() || null,
        deliveryPhone: input.deliveryPhone?.trim() || null,
        deliveryAddress,
        deliveryCity: input.deliveryCity?.trim() || null,
        deliveryState: input.deliveryState?.trim() || null,
        deliveryCountry: input.deliveryCountry?.trim() || null,
      },
      include: this.orderInclude,
    });

    return {
      order: this.mapOrder(order, userId),
      paymentAccount: await this.walletService.getPublicAccountForUser(
        product.sellerId,
      ),
      existing: false,
    };
  }

  private async findReusableCheckout(input: {
    buyerId: number;
    sellerId: number;
    productId: number;
    conversationId: number | null;
    offerMessageId: number | null;
    source: OrderSource;
  }) {
    const sourceFilter =
      input.conversationId === null
        ? {
            source: input.source,
            offerMessageId: input.offerMessageId,
          }
        : {};

    return this.prisma.order.findFirst({
      where: {
        buyerId: input.buyerId,
        sellerId: input.sellerId,
        productId: input.productId,
        conversationId: input.conversationId,
        ...sourceFilter,
        status: { in: this.getReusableOrderStatuses() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCurrentCheckout(
    userId: number,
    input: {
      productId?: number;
      conversationId?: number;
      offerMessageId?: number;
      source?: string;
    },
  ) {
    const productId = Number(input.productId);
    if (!productId) throw new BadRequestException('Product is required');

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sellerId: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    let buyerId = userId;
    const conversationId = input.conversationId || null;
    if (conversationId) {
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          id: conversationId,
          productId,
          OR: [{ buyerId: userId }, { sellerId: userId }],
        },
        select: {
          buyerId: true,
          sellerId: true,
        },
      });

      if (!conversation) {
        throw new ForbiddenException('Conversation unavailable for this order');
      }

      buyerId = conversation.buyerId;
    }

    const source: OrderSource =
      input.source === 'offer' || input.source === 'OFFER'
        ? 'OFFER'
        : 'BUY_NOW';

    const sourceFilter =
      conversationId === null
        ? {
            source,
            offerMessageId: input.offerMessageId || null,
          }
        : {};

    const order = await this.prisma.order.findFirst({
      where: {
        buyerId,
        sellerId: product.sellerId,
        productId,
        conversationId,
        ...sourceFilter,
        status: { in: this.getReusableOrderStatuses() },
      },
      orderBy: { createdAt: 'desc' },
      include: this.orderInclude,
    });

    if (!order) return { order: null, paymentAccount: null };

    return {
      order: this.mapOrder(order, userId),
      paymentAccount: await this.walletService.getPublicAccountForUser(
        product.sellerId,
      ),
    };
  }

  async listOrders(userId: number, mode?: string, status?: string) {
    const statusFilter = status?.toUpperCase();
    const where: any = {
      OR:
        mode === 'buying'
          ? [{ buyerId: userId }]
          : mode === 'selling'
            ? [{ sellerId: userId }]
            : [{ buyerId: userId }, { sellerId: userId }],
    };

    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter;
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: this.orderInclude,
    });

    return orders.map((order) => this.mapOrder(order, userId));
  }

  async getOrder(orderId: number, userId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: this.orderInclude,
    });

    if (!order) throw new NotFoundException('Order not found');
    return this.mapOrder(order, userId);
  }

  async getOrderParticipantIds(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        buyerId: true,
        sellerId: true,
      },
    });

    if (!order) return [];
    return [order.buyerId, order.sellerId];
  }

  async updateOrderStatus(orderId: number, userId: number, action?: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: this.orderInclude,
    });

    if (!order) throw new NotFoundException('Order not found');

    const normalizedAction = action?.trim().toLowerCase();
    const isSeller = order.sellerId === userId;
    const isBuyer = order.buyerId === userId;
    let nextStatus: OrderStatus | null = null;

    if (isSeller) {
      const sellerTransitions: Record<string, OrderStatus> = {
        prepare: 'SELLER_PREPARING',
        ship: 'SHIPPED',
        deliver: 'DELIVERED',
      };
      nextStatus = normalizedAction
        ? sellerTransitions[normalizedAction] || null
        : null;

      const allowedFrom: Record<string, OrderStatus> = {
        SELLER_PREPARING: 'PAID_IN_ESCROW',
        SHIPPED: 'SELLER_PREPARING',
        DELIVERED: 'SHIPPED',
      };

      if (!nextStatus || allowedFrom[nextStatus] !== order.status) {
        throw new BadRequestException('This seller action is not available');
      }
    } else if (isBuyer) {
      if (normalizedAction !== 'received' || order.status !== 'DELIVERED') {
        throw new BadRequestException('This buyer action is not available');
      }
      nextStatus = 'COMPLETED';
    }

    if (!nextStatus) {
      throw new ForbiddenException('Order action unavailable');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: nextStatus },
      include: this.orderInclude,
    });

    return this.mapOrder(updatedOrder, userId);
  }

  async confirmMockTransferForSeller(sellerId: number, amount: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        sellerId,
        status: 'PENDING_TRANSFER',
        totalAmount: amount,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!order) return null;

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID_IN_ESCROW',
        paidAt: new Date(),
      },
    });
  }
}

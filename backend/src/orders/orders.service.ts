import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import { Prisma } from 'src/generated/prisma/client';
import {
  ConversationStatus,
  OrderSource,
  OrderStatus,
  WalletTransactionType,
} from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { WalletService } from 'src/wallet/wallet.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  PaystackService,
  type PaystackVerifiedTransaction,
} from 'src/paystack/paystack.service';

const ESCROW_FEE_RATE = new Prisma.Decimal('0.01');
const NIGERIA = 'Nigeria';
const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING_TRANSFER,
  OrderStatus.PAID_IN_ESCROW,
  OrderStatus.SELLER_PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.DISPUTED,
];
const TERMINAL_CONVERSATION_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
];

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly paystackService: PaystackService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private buildPlaceholderReference(orderId?: number) {
    const suffix = randomUUID().replace(/-/g, '').slice(0, 18);
    return orderId
      ? `AV-ORDER-${orderId}-PENDING-${suffix}`
      : `AV-PENDING-${suffix}`;
  }

  private buildPaymentReference(orderId: number) {
    const suffix = randomUUID().replace(/-/g, '').slice(0, 18);
    return `AV-ORDER-${orderId}-${suffix}`;
  }

  private buildOrderCode(orderId: number) {
    return `AV-${String(orderId).padStart(6, '0')}`;
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
    const labels: Record<OrderStatus, string> = {
      PENDING_TRANSFER: 'Waiting for buyer payment',
      PAID_IN_ESCROW: 'Payment is locked in escrow',
      SELLER_PREPARING: 'Seller is preparing the order',
      SHIPPED: 'Order has been shipped',
      DELIVERED: 'Waiting for buyer confirmation',
      COMPLETED: 'Order completed',
      CANCELLED: 'Order cancelled',
      DISPUTED: 'Order is under dispute',
    };

    return labels[status];
  }

  private getEscrowState(status: OrderStatus) {
    if (status === OrderStatus.PENDING_TRANSFER) {
      return 'Awaiting payment from buyer';
    }

    if (status === OrderStatus.CANCELLED) {
      return 'No funds captured';
    }

    if (status === OrderStatus.COMPLETED) {
      return 'Funds released';
    }

    return 'Payment held in escrow';
  }

  private mapCheckoutOrder(order: {
    id: number;
    status: OrderStatus;
    totalAmount: Prisma.Decimal;
    quantity: number;
    paymentReference: string;
    deliveryName: string;
    deliveryPhone: string;
    deliveryAddress: string;
    deliveryCity: string;
    deliveryState: string;
    deliveryCountry: string;
  }) {
    return {
      id: order.id,
      code: this.buildOrderCode(order.id),
      status: order.status,
      statusText: this.getStatusText(order.status),
      totalAmount: order.totalAmount.toNumber(),
      quantity: order.quantity,
      paymentReference: order.paymentReference,
      delivery: {
        name: order.deliveryName,
        phone: order.deliveryPhone,
        address: order.deliveryAddress,
        city: order.deliveryCity,
        state: order.deliveryState,
        country: order.deliveryCountry,
      },
    };
  }

  private mapOrderDetail(
    order: {
      id: number;
      buyerId: number;
      sellerId: number;
      productId: number;
      conversationId: number;
      source: OrderSource;
      status: OrderStatus;
      quantity: number;
      unitPrice: Prisma.Decimal;
      subtotal: Prisma.Decimal;
      escrowFee: Prisma.Decimal;
      totalAmount: Prisma.Decimal;
      deliveryName: string;
      deliveryPhone: string;
      deliveryAddress: string;
      deliveryCity: string;
      deliveryState: string;
      deliveryCountry: string;
      paidAt: Date | null;
      updatedAt: Date;
      product: {
        id: number;
        name: string;
        images?: Array<{ url: string }>;
      };
      buyer: {
        id: number;
        username?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        avatarUrl?: string | null;
      };
      seller: {
        id: number;
        username?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        avatarUrl?: string | null;
      };
    },
    userId: number,
  ) {
    const mode = order.buyerId === userId ? 'buying' : 'selling';
    const counterparty = mode === 'buying' ? order.seller : order.buyer;
    const counterpartyName =
      [counterparty.firstName, counterparty.lastName]
        .filter(Boolean)
        .join(' ') ||
      counterparty.username ||
      'Avera user';

    return {
      id: order.id,
      code: this.buildOrderCode(order.id),
      mode,
      productId: order.productId,
      conversationId: order.conversationId,
      source: order.source,
      status: order.status,
      statusText: this.getStatusText(order.status),
      step: this.getOrderStep(order.status),
      escrowState: this.getEscrowState(order.status),
      quantity: order.quantity,
      unitPrice: order.unitPrice.toNumber(),
      subtotal: order.subtotal.toNumber(),
      escrowFee: order.escrowFee.toNumber(),
      totalAmount: order.totalAmount.toNumber(),
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
        name: counterpartyName,
        role: mode === 'buying' ? 'Seller' : 'Buyer',
        avatarUrl: counterparty.avatarUrl || null,
      },
      paidAt: order.paidAt,
      updatedAt: order.updatedAt,
    };
  }

  private buildCheckoutUrls(baseUrl: string, orderId: number) {
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

    return {
      callbackUrl: `${normalizedBaseUrl}/paystack/callback`,
      cancelUrl: `${normalizedBaseUrl}/cancel?orderId=${orderId}`,
      successUrl: `${normalizedBaseUrl}/success?orderId=${orderId}`,
    };
  }

  private getOrderIdFromMetadata(metadata: unknown) {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    const candidate = (metadata as Record<string, unknown>).orderId;
    const numericOrderId = Number(candidate);

    return Number.isInteger(numericOrderId) && numericOrderId > 0
      ? numericOrderId
      : null;
  }

  private async createCheckoutStatusMessage(
    prismaClient: Prisma.TransactionClient | PrismaService,
    {
      conversationId,
      senderId,
      content,
    }: {
      conversationId: number;
      senderId: number;
      content: string;
    },
  ) {
    const latestMessage = await prismaClient.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      select: {
        senderId: true,
        content: true,
      },
    });

    if (
      latestMessage?.senderId === senderId &&
      latestMessage.content === content
    ) {
      return null;
    }

    return prismaClient.message.create({
      data: {
        conversationId,
        senderId,
        content,
      },
    });
  }

  private emitRealtimeChatMessage(payload: {
    id: number;
    conversationId: number;
    senderId: number;
    content: string;
    createdAt: Date;
    buyerId: number;
    sellerId: number;
  }) {
    this.eventEmitter.emit('chat.message.created', payload);
  }

  private emitRealtimeOrderUpdate(payload: {
    orderId: number;
    buyerId: number;
    sellerId: number;
  }) {
    this.eventEmitter.emit('order.updated', payload);
  }

  private async reserveAdditionalStock(
    tx: Prisma.TransactionClient,
    productId: number,
    quantityToReserve: number,
  ) {
    if (quantityToReserve <= 0) {
      return;
    }

    const reservedStock = await tx.product.updateMany({
      where: {
        id: productId,
        quantity: { gte: quantityToReserve },
      },
      data: {
        quantity: { decrement: quantityToReserve },
      },
    });

    if (reservedStock.count !== 1) {
      throw new BadRequestException('Insufficient product quantity');
    }
  }

  private async findActiveConversation(
    tx: Prisma.TransactionClient,
    {
      buyerId,
      sellerId,
      productId,
    }: {
      buyerId: number;
      sellerId: number;
      productId: number;
    },
  ) {
    return tx.conversation.findFirst({
      where: {
        buyerId,
        sellerId,
        productId,
        status: ConversationStatus.ACTIVE,
      },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        productId: true,
        status: true,
        offeredPrice: true,
        product: {
          select: {
            price: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  private async findOrCreateActiveConversation(
    tx: Prisma.TransactionClient,
    {
      buyerId,
      sellerId,
      productId,
    }: {
      buyerId: number;
      sellerId: number;
      productId: number;
    },
  ) {
    const existingConversation = await this.findActiveConversation(tx, {
      buyerId,
      sellerId,
      productId,
    });

    if (existingConversation) {
      return existingConversation;
    }

    return tx.conversation.create({
      data: {
        buyerId,
        sellerId,
        productId,
        status: ConversationStatus.ACTIVE,
      },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        productId: true,
        status: true,
        offeredPrice: true,
        product: {
          select: {
            price: true,
          },
        },
      },
    });
  }

  private async closeConversation(
    tx: Prisma.TransactionClient,
    conversationId: number,
    closedReason: string,
  ) {
    await tx.conversation.updateMany({
      where: {
        id: conversationId,
        status: ConversationStatus.ACTIVE,
      },
      data: {
        status: ConversationStatus.CLOSED,
        closedAt: new Date(),
        closedReason,
      },
    });
  }

  async createOrder(userId: number, createOrderDto: CreateOrderDto) {
    const {
      conversationId,
      quantity,
      source,
      deliveryName,
      deliveryPhone,
      deliveryAddress,
      deliveryCity,
      deliveryState,
      productId,
    } = createOrderDto;

    if (source === OrderSource.OFFER && !conversationId) {
      throw new BadRequestException(
        'Conversation ID is required for offer orders',
      );
    }

    if (source === OrderSource.BUY_NOW && !conversationId && !productId) {
      throw new BadRequestException(
        'Product ID or conversation ID is required for Buy Now orders',
      );
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const [requestedConversation, requestedProduct] = await Promise.all([
          conversationId
            ? tx.conversation.findFirst({
                where: {
                  id: conversationId,
                  OR: [{ buyerId: userId }, { sellerId: userId }],
                },
                select: {
                  id: true,
                  buyerId: true,
                  sellerId: true,
                  productId: true,
                  status: true,
                  offeredPrice: true,
                  product: {
                    select: {
                      price: true,
                    },
                  },
                },
              })
            : Promise.resolve(null),
          source === OrderSource.BUY_NOW && productId
            ? tx.product.findUnique({
                where: { id: productId },
                select: {
                  id: true,
                  sellerId: true,
                  price: true,
                },
              })
            : Promise.resolve(null),
        ]);

        let orderConversation = requestedConversation;

        if (!orderConversation) {
          if (source === OrderSource.OFFER) {
            throw new BadRequestException(
              'Conversation not found for the offer',
            );
          }

          if (!requestedProduct) {
            throw new NotFoundException('Product not found');
          }

          if (requestedProduct.sellerId === userId) {
            throw new ForbiddenException(
              'Cannot create order on your own product',
            );
          }

          orderConversation = await this.findOrCreateActiveConversation(tx, {
            buyerId: userId,
            sellerId: requestedProduct.sellerId,
            productId: requestedProduct.id,
          });
        }

        if (orderConversation.status !== ConversationStatus.ACTIVE) {
          throw new BadRequestException(
            'This conversation is closed. Start a new conversation to continue.',
          );
        }

        if (orderConversation.buyerId !== userId) {
          throw new ForbiddenException('Only the buyer can create an order');
        }

        if (
          source === OrderSource.BUY_NOW &&
          requestedProduct &&
          requestedProduct.id !== orderConversation.productId
        ) {
          throw new BadRequestException(
            'Conversation does not match the selected product',
          );
        }

        const unitPrice =
          orderConversation.offeredPrice || orderConversation.product.price;
        const subtotal = unitPrice.mul(quantity);
        const escrowFee = subtotal.mul(ESCROW_FEE_RATE);
        const totalAmount = subtotal.add(escrowFee);

        const pendingOrder = await tx.order.findFirst({
          where: {
            buyerId: userId,
            sellerId: orderConversation.sellerId,
            productId: orderConversation.productId,
            conversationId: orderConversation.id,
            status: OrderStatus.PENDING_TRANSFER,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        });

        if (pendingOrder) {
          const quantityDifference = quantity - pendingOrder.quantity;

          if (quantityDifference > 0) {
            await this.reserveAdditionalStock(
              tx,
              orderConversation.productId,
              quantityDifference,
            );
          } else if (quantityDifference < 0) {
            await tx.product.update({
              where: { id: orderConversation.productId },
              data: {
                quantity: { increment: Math.abs(quantityDifference) },
              },
            });
          }

          const updatedOrder = await tx.order.update({
            where: { id: pendingOrder.id },
            data: {
              quantity,
              source,
              unitPrice,
              subtotal,
              escrowFee,
              totalAmount,
              deliveryName,
              deliveryPhone,
              deliveryAddress,
              deliveryCity,
              deliveryState,
              deliveryCountry: NIGERIA,
            },
          });

          return {
            existing: true,
            order: updatedOrder,
          };
        }

        await this.reserveAdditionalStock(
          tx,
          orderConversation.productId,
          quantity,
        );

        const createdOrder = await tx.order.create({
          data: {
            conversationId: orderConversation.id,
            buyerId: orderConversation.buyerId,
            sellerId: orderConversation.sellerId,
            productId: orderConversation.productId,
            quantity,
            source,
            deliveryName,
            deliveryPhone,
            deliveryAddress,
            deliveryCity,
            deliveryState,
            deliveryCountry: NIGERIA,
            unitPrice,
            subtotal,
            escrowFee,
            totalAmount,
            paymentReference: this.buildPlaceholderReference(),
            status: OrderStatus.PENDING_TRANSFER,
          },
        });

        const orderWithReference = await tx.order.update({
          where: { id: createdOrder.id },
          data: {
            paymentReference: this.buildPlaceholderReference(createdOrder.id),
          },
        });

        return {
          existing: false,
          order: orderWithReference,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    this.emitRealtimeOrderUpdate({
      orderId: result.order.id,
      buyerId: result.order.buyerId,
      sellerId: result.order.sellerId,
    });

    return {
      message: result.existing
        ? 'Checkout resumed'
        : 'Order created successfully',
      existing: result.existing,
      order: this.mapCheckoutOrder(result.order),
    };
  }

  async getOrder(userId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: {
              select: {
                url: true,
              },
              take: 1,
            },
          },
        },
        buyer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        seller: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapOrderDetail(order, userId);
  }

  async listOrders(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: {
              select: {
                url: true,
              },
              take: 1,
            },
          },
        },
        buyer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        seller: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return orders.map((order) => this.mapOrderDetail(order, userId));
  }

  async getCurrentOrder(
    userId: number,
    filters: {
      conversationId?: number;
      productId?: number;
    },
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        conversationId: filters.conversationId,
        productId: filters.productId,
        status: {
          in: ACTIVE_ORDER_STATUSES,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return order ? this.mapCheckoutOrder(order) : null;
  }

  async initializeCheckout(userId: number, orderId: number, baseUrl: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        buyerId: userId,
      },
      include: {
        buyer: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.PAID_IN_ESCROW) {
      return {
        order: this.mapCheckoutOrder(order),
        authorizationUrl: null,
        alreadyPaid: true,
      };
    }

    if (order.status !== OrderStatus.PENDING_TRANSFER) {
      throw new BadRequestException('This order is not available for checkout');
    }

    const paymentReference = this.buildPaymentReference(order.id);
    const checkoutUrls = this.buildCheckoutUrls(baseUrl, order.id);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentReference,
      },
    });

    const payment = await this.paystackService.initializeTransaction({
      amount: order.totalAmount.toNumber(),
      email: order.buyer.email,
      reference: paymentReference,
      callbackUrl: checkoutUrls.callbackUrl,
      metadata: {
        orderId: order.id,
        conversationId: order.conversationId,
        productId: order.productId,
        cancel_action: checkoutUrls.cancelUrl,
        success_url: checkoutUrls.successUrl,
      },
    });

    const refreshedOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
    });

    if (!refreshedOrder) {
      throw new NotFoundException(
        'Order not found after checkout initialization',
      );
    }

    return {
      order: this.mapCheckoutOrder(refreshedOrder),
      authorizationUrl: payment.authorizationUrl,
      paymentReference: payment.reference,
      alreadyPaid: false,
    };
  }

  async cancelOrder(userId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        buyerId: userId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING_TRANSFER) {
      throw new BadRequestException(
        'Only pending transfer orders can be cancelled',
      );
    }

    await this.prisma.$transaction(
      async (tx) => {
        const cancelledOrder = await tx.order.updateMany({
          where: {
            id: order.id,
            status: OrderStatus.PENDING_TRANSFER,
          },
          data: {
            status: OrderStatus.CANCELLED,
          },
        });

        if (cancelledOrder.count !== 1) {
          throw new BadRequestException('Unable to cancel this order');
        }

        await tx.product.update({
          where: { id: order.productId },
          data: {
            quantity: { increment: order.quantity },
          },
        });

        await this.closeConversation(
          tx,
          order.conversationId,
          'Order was cancelled before payment was completed.',
        );
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    this.emitRealtimeOrderUpdate({
      orderId: order.id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
    });

    return {
      message: 'Order cancelled successfully',
      orderId,
    };
  }

  async updateOrderStatus(
    userId: number,
    orderId: number,
    action: 'prepare' | 'ship' | 'deliver' | 'received',
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: {
              select: {
                url: true,
              },
              take: 1,
            },
          },
        },
        buyer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        seller: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isSeller = order.sellerId === userId;
    const isBuyer = order.buyerId === userId;
    let nextStatus: OrderStatus | null = null;

    if (isSeller) {
      if (action === 'prepare' && order.status === OrderStatus.PAID_IN_ESCROW) {
        nextStatus = OrderStatus.SELLER_PREPARING;
      }
      if (action === 'ship' && order.status === OrderStatus.SELLER_PREPARING) {
        nextStatus = OrderStatus.SHIPPED;
      }
      if (action === 'deliver' && order.status === OrderStatus.SHIPPED) {
        nextStatus = OrderStatus.DELIVERED;
      }
    }

    if (
      isBuyer &&
      action === 'received' &&
      order.status === OrderStatus.DELIVERED
    ) {
      nextStatus = OrderStatus.COMPLETED;
    }

    if (!nextStatus) {
      throw new BadRequestException('This status update is not available');
    }

    const updatedOrder = await this.prisma.$transaction(
      async (tx) => {
        const nextOrder = await tx.order.update({
          where: { id: order.id },
          data: { status: nextStatus },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: {
                  select: {
                    url: true,
                  },
                  take: 1,
                },
              },
            },
            buyer: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
            seller: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        });

        const orderCode = this.buildOrderCode(nextOrder.id);
        const statusMessage =
          nextStatus === OrderStatus.SELLER_PREPARING
            ? `Checkout status: ${orderCode} is being prepared.`
            : nextStatus === OrderStatus.SHIPPED
              ? `Checkout status: ${orderCode} has shipped.`
              : nextStatus === OrderStatus.DELIVERED
                ? `Checkout status: ${orderCode} is waiting for buyer confirmation.`
                : `Checkout status: ${orderCode} is complete.`;

        const checkoutMessage = await this.createCheckoutStatusMessage(tx, {
          conversationId: nextOrder.conversationId,
          senderId: userId,
          content: statusMessage,
        });

        if (TERMINAL_CONVERSATION_ORDER_STATUSES.includes(nextStatus)) {
          await this.closeConversation(
            tx,
            nextOrder.conversationId,
            nextStatus === OrderStatus.COMPLETED
              ? 'Order completed successfully.'
              : 'Order was cancelled.',
          );
        }

        return {
          order: nextOrder,
          checkoutMessage,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (updatedOrder.checkoutMessage) {
      this.emitRealtimeChatMessage({
        id: updatedOrder.checkoutMessage.id,
        conversationId: updatedOrder.checkoutMessage.conversationId,
        senderId: updatedOrder.checkoutMessage.senderId,
        content: updatedOrder.checkoutMessage.content,
        createdAt: updatedOrder.checkoutMessage.createdAt,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
      });
    }

    this.emitRealtimeOrderUpdate({
      orderId: updatedOrder.order.id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
    });

    return this.mapOrderDetail(updatedOrder.order, userId);
  }

  private async markOrderAsPaid(
    verification: PaystackVerifiedTransaction,
    reference: string,
  ) {
    const orderId = this.getOrderIdFromMetadata(verification.metadata);

    if (!orderId) {
      throw new BadRequestException('Verified payment is missing an order ID');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        conversationId: true,
        status: true,
        totalAmount: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order linked to this payment was not found');
    }

    const expectedAmount = Math.round(order.totalAmount.toNumber() * 100);
    if (Number(verification.amount) !== expectedAmount) {
      throw new BadRequestException(
        'Verified amount does not match this order',
      );
    }

    if (order.status === OrderStatus.PAID_IN_ESCROW) {
      return {
        orderId: order.id,
        alreadyProcessed: true,
        verified: true,
        finalStatus: order.status,
      };
    }

    if (order.status !== OrderStatus.PENDING_TRANSFER) {
      return {
        orderId: order.id,
        alreadyProcessed: true,
        verified: false,
        finalStatus: order.status,
      };
    }

    const sellerWallet = await this.walletService.ensureWalletForUser(
      order.sellerId,
    );

    const paymentResult = await this.prisma.$transaction(
      async (tx) => {
        const updatedOrder = await tx.order.updateMany({
          where: {
            id: order.id,
            status: OrderStatus.PENDING_TRANSFER,
          },
          data: {
            status: OrderStatus.PAID_IN_ESCROW,
            paidAt: new Date(),
            paymentReference: reference,
          },
        });

        if (updatedOrder.count !== 1) {
          const latestOrder = await tx.order.findUnique({
            where: { id: order.id },
            select: {
              status: true,
            },
          });

          return {
            alreadyProcessed: true,
            verified: latestOrder?.status === OrderStatus.PAID_IN_ESCROW,
            finalStatus: latestOrder?.status ?? null,
          };
        }

        await tx.wallet.update({
          where: {
            id: sellerWallet.id,
          },
          data: {
            lockedBalance: {
              increment: order.totalAmount,
            },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: sellerWallet.id,
            type: WalletTransactionType.CREDIT,
            amount: order.totalAmount,
            description: 'Paystack escrow payment received',
            reference: `paystack-credit-${reference}`,
            counterparty: 'Paystack checkout',
            simulated: false,
          },
        });

        const checkoutMessage = await this.createCheckoutStatusMessage(tx, {
          conversationId: order.conversationId,
          senderId: order.buyerId,
          content: `Checkout status: Payment confirmed for ${this.buildOrderCode(
            order.id,
          )}.`,
        });

        return {
          alreadyProcessed: false,
          verified: true,
          finalStatus: OrderStatus.PAID_IN_ESCROW,
          checkoutMessage,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (paymentResult.checkoutMessage) {
      this.emitRealtimeChatMessage({
        id: paymentResult.checkoutMessage.id,
        conversationId: paymentResult.checkoutMessage.conversationId,
        senderId: paymentResult.checkoutMessage.senderId,
        content: paymentResult.checkoutMessage.content,
        createdAt: paymentResult.checkoutMessage.createdAt,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
      });
    }

    this.emitRealtimeOrderUpdate({
      orderId: order.id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
    });

    return {
      orderId: order.id,
      alreadyProcessed: paymentResult.alreadyProcessed,
      verified: paymentResult.verified,
      finalStatus: paymentResult.finalStatus,
    };
  }

  async verifyPayment(reference: string) {
    const verification =
      await this.paystackService.verifyTransaction(reference);

    if (verification.status !== 'success') {
      return {
        verified: false,
        alreadyProcessed: false,
        orderId: this.getOrderIdFromMetadata(verification.metadata),
        gatewayStatus: verification.status,
        finalStatus: undefined,
      };
    }

    const result = await this.markOrderAsPaid(verification, reference);

    return {
      ...result,
      gatewayStatus: verification.status,
    };
  }
}

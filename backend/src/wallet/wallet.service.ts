import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

const BANK_NAME = 'Avera Test Bank';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  private getDisplayName(user: {
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return fullName || user.username || 'Avera User';
  }

  private assertCanCreateWalletAccount(user: {
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
  }) {
    if (!user.firstName || !user.lastName || !user.username) {
      throw new BadRequestException({
        code: 'PROFILE_INFO_REQUIRED',
        message: 'Complete your profile before creating a wallet bank account.',
      });
    }
  }

  private mapWallet(wallet: any) {
    return {
      id: wallet.id,
      userId: wallet.userId,
      accountNumber: wallet.accountNumber,
      accountName: wallet.accountName,
      bankName: wallet.bankName,
      balance: Number(wallet.balance),
      nairaBalance: Number(wallet.balance),
      lockedBalance: Number(wallet.lockedBalance),
      address: `avera-ngn-${wallet.accountNumber}`,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  private mapTransaction(transaction: any) {
    return {
      id: transaction.id,
      type: transaction.type,
      amount: Number(transaction.amount).toFixed(2),
      description: transaction.description,
      reference: transaction.reference,
      counterparty: transaction.counterparty,
      simulated: transaction.simulated,
      createdAt: transaction.createdAt,
    };
  }

  private async generateAccountNumber() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const accountNumber = `9${Math.floor(
        100000000 + Math.random() * 900000000,
      )}`;
      const existing = await this.prisma.wallet.findUnique({
        where: { accountNumber },
        select: { id: true },
      });
      if (!existing) return accountNumber;
    }

    throw new BadRequestException('Unable to generate wallet account number');
  }

  async ensureWalletForUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    this.assertCanCreateWalletAccount(user);

    const accountName = this.getDisplayName(user);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        return await this.prisma.wallet.upsert({
          where: { userId },
          update: {
            accountName,
            bankName: BANK_NAME,
          },
          create: {
            userId: user.id,
            accountName,
            accountNumber: await this.generateAccountNumber(),
            bankName: BANK_NAME,
          },
        });
      } catch (error: any) {
        if (error?.code !== 'P2002') {
          throw error;
        }

        const wallet = await this.prisma.wallet.findUnique({
          where: { userId },
        });
        if (wallet) return wallet;
      }
    }

    throw new BadRequestException('Unable to create wallet');
  }

  async getWalletForUser(userId: number) {
    return this.mapWallet(await this.ensureWalletForUser(userId));
  }

  async getPublicAccountForUser(userId: number) {
    const wallet = await this.ensureWalletForUser(userId);
    return {
      userId: wallet.userId,
      accountNumber: wallet.accountNumber,
      accountName: wallet.accountName,
      bankName: wallet.bankName,
    };
  }

  async listTransactions(userId: number) {
    const wallet = await this.ensureWalletForUser(userId);
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return transactions.map((transaction) => this.mapTransaction(transaction));
  }

  async withdraw(userId: number, amount: number) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Enter a valid amount');
    }

    const wallet = await this.ensureWalletForUser(userId);
    if (Number(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });

      const createdTransaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount,
          description: 'Mock wallet withdrawal',
          reference: `mock-withdraw-${Date.now()}-${wallet.id}`,
          simulated: true,
        },
      });

      return { updatedWallet, createdTransaction };
    });

    return {
      wallet: this.mapWallet(transaction.updatedWallet),
      transaction: this.mapTransaction(transaction.createdTransaction),
    };
  }

  async sendMoneyToAccount(
    accountNumber: string,
    amount: number,
    reference?: string,
  ) {
    if (!/^\d{10}$/.test(accountNumber)) {
      throw new BadRequestException('Account number must be 10 digits');
    }
    if (!amount || amount <= 0) {
      throw new BadRequestException('Enter a valid transfer amount');
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { accountNumber },
    });
    if (!wallet) throw new NotFoundException('Wallet account not found');

    const matchedOrder = await this.findMockTransferOrder(
      wallet.userId,
      amount,
      reference,
    );
    if (matchedOrder && matchedOrder.status !== 'PENDING_TRANSFER') {
      return {
        success: true,
        message: 'Referenced order is already paid',
        accountNumber,
        accountName: wallet.accountName,
        bankName: wallet.bankName,
        amount,
        balance: Number(wallet.balance),
        lockedBalance: Number(wallet.lockedBalance),
        reference: null,
        paymentReference: reference || null,
        orderId: matchedOrder.id,
        orderStatus: matchedOrder.status,
      };
    }

    const transactionReference = `mock-transfer-${reference || Date.now()}-${Math.round(
      Math.random() * 100000,
    )}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { lockedBalance: { increment: amount } },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          amount,
          description: 'Mock escrow transfer received',
          reference: transactionReference,
          counterparty: 'Mock transfer route',
          simulated: true,
        },
      });

      const paidOrder =
        matchedOrder?.status === 'PENDING_TRANSFER'
          ? await tx.order.update({
              where: { id: matchedOrder.id },
              data: {
                status: 'PAID_IN_ESCROW',
                paidAt: new Date(),
              },
            })
          : matchedOrder;

      return { updatedWallet, transaction, paidOrder };
    });

    return {
      success: true,
      message: result.paidOrder
        ? 'Mock transfer received and order marked paid'
        : 'Mock transfer received',
      accountNumber,
      accountName: result.updatedWallet.accountName,
      bankName: result.updatedWallet.bankName,
      amount,
      balance: Number(result.updatedWallet.balance),
      lockedBalance: Number(result.updatedWallet.lockedBalance),
      reference: result.transaction.reference,
      paymentReference: reference || null,
      orderId: result.paidOrder?.id || null,
      orderStatus: result.paidOrder?.status || null,
    };
  }

  private getOrderIdFromPaymentReference(reference?: string) {
    if (!reference) return null;

    const match = reference.trim().match(/^AV-0*(\d+)$/i);
    if (!match) {
      throw new BadRequestException('Invalid payment reference');
    }

    return Number(match[1]);
  }

  private async findMockTransferOrder(
    sellerId: number,
    amount: number,
    reference?: string,
  ) {
    const orderId = this.getOrderIdFromPaymentReference(reference);

    if (orderId) {
      const order = await this.prisma.order.findFirst({
        where: {
          id: orderId,
          sellerId,
        },
      });

      if (!order) throw new NotFoundException('Referenced order not found');
      if (Number(order.totalAmount) !== amount) {
        throw new BadRequestException(
          'Transfer amount does not match referenced order',
        );
      }

      return order;
    }

    return this.prisma.order.findFirst({
      where: {
        sellerId,
        status: 'PENDING_TRANSFER',
        totalAmount: amount,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

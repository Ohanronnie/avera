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
    email?: string | null;
  }) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return fullName || user.username || user.email || 'Avera User';
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
    const existingWallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (existingWallet) return existingWallet;

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

    return this.prisma.wallet.create({
      data: {
        userId: user.id,
        accountName: this.getDisplayName(user),
        accountNumber: await this.generateAccountNumber(),
        bankName: BANK_NAME,
      },
    });
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

  async sendMoneyToAccount(accountNumber: string, amount: number) {
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

    const reference = `mock-transfer-${Date.now()}-${Math.round(
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
          reference,
          counterparty: 'Mock transfer route',
          simulated: true,
        },
      });

      return { updatedWallet, transaction };
    });

    const matchedOrder = await this.confirmMockTransferForSeller(
      wallet.userId,
      amount,
    );

    return {
      success: true,
      message: matchedOrder
        ? 'Mock transfer received and matching order marked paid'
        : 'Mock transfer received',
      accountNumber,
      accountName: result.updatedWallet.accountName,
      bankName: result.updatedWallet.bankName,
      amount,
      balance: Number(result.updatedWallet.balance),
      lockedBalance: Number(result.updatedWallet.lockedBalance),
      reference: result.transaction.reference,
      orderId: matchedOrder?.id || null,
      orderStatus: matchedOrder?.status || null,
    };
  }

  private async confirmMockTransferForSeller(sellerId: number, amount: number) {
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

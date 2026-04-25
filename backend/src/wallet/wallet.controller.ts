import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WalletService } from './wallet.service';
import { CurrentUser } from 'src/auth/current-user.decorator';

@Controller()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('send-money/:accountNumber/:amount')
  sendMoney(
    @Param('accountNumber') accountNumber: string,
    @Param('amount') amount: string,
    @Query('reference') reference?: string,
  ) {
    return this.walletService.sendMoneyToAccount(
      accountNumber,
      Number(amount),
      reference,
    );
  }

  @Get('wallet')
  @UseGuards(AuthGuard('jwt'))
  getWallet(@CurrentUser('userId') userId: number) {
    return this.walletService.getWalletForUser(userId);
  }

  @Get('wallet/me')
  @UseGuards(AuthGuard('jwt'))
  getCurrentWallet(@CurrentUser('userId') userId: number) {
    return this.walletService.getWalletForUser(userId);
  }

  @Get('wallet/users/:userId/account')
  @UseGuards(AuthGuard('jwt'))
  getPublicUserAccount(@Param('userId', ParseIntPipe) userId: number) {
    return this.walletService.getPublicAccountForUser(userId);
  }

  @Get('wallet/transactions')
  @UseGuards(AuthGuard('jwt'))
  getTransactions(@CurrentUser('userId') userId: number) {
    return this.walletService.listTransactions(userId);
  }

  @Post('wallet/withdraw')
  @UseGuards(AuthGuard('jwt'))
  withdraw(
    @CurrentUser('userId') userId: number,
    @Body() body: { amount?: number },
  ) {
    return this.walletService.withdraw(userId, Number(body.amount));
  }
}

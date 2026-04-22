import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WalletService } from './wallet.service';

@Controller()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('send-money/:accountNumber/:amount')
  sendMoney(
    @Param('accountNumber') accountNumber: string,
    @Param('amount') amount: string,
  ) {
    return this.walletService.sendMoneyToAccount(accountNumber, Number(amount));
  }

  @Get('wallet')
  @UseGuards(AuthGuard('jwt'))
  getWallet(@Req() req: any) {
    return this.walletService.getWalletForUser(req.user.userId);
  }

  @Get('wallet/me')
  @UseGuards(AuthGuard('jwt'))
  getCurrentWallet(@Req() req: any) {
    return this.walletService.getWalletForUser(req.user.userId);
  }

  @Get('wallet/users/:userId/account')
  @UseGuards(AuthGuard('jwt'))
  getPublicUserAccount(@Param('userId', ParseIntPipe) userId: number) {
    return this.walletService.getPublicAccountForUser(userId);
  }

  @Get('wallet/transactions')
  @UseGuards(AuthGuard('jwt'))
  getTransactions(@Req() req: any) {
    return this.walletService.listTransactions(req.user.userId);
  }

  @Post('wallet/withdraw')
  @UseGuards(AuthGuard('jwt'))
  withdraw(@Req() req: any, @Body() body: { amount?: number }) {
    return this.walletService.withdraw(req.user.userId, Number(body.amount));
  }
}

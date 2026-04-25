import { Module, forwardRef } from '@nestjs/common';
import { WalletModule } from 'src/wallet/wallet.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PaystackModule } from 'src/paystack/paystack.module';

@Module({
  imports: [WalletModule, forwardRef(() => PaystackModule)],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule { }

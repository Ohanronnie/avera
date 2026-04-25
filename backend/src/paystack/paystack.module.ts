import { Module, forwardRef } from '@nestjs/common';
import { OrdersModule } from 'src/orders/orders.module';
import { PaystackController } from './paystack.controller';
import { PaystackService } from './paystack.service';

@Module({
  imports: [forwardRef(() => OrdersModule)],
  controllers: [PaystackController],
  providers: [PaystackService],
  exports: [PaystackService],
})
export class PaystackModule {}

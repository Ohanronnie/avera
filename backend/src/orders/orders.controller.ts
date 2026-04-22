import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@Req() req: any, @Body() body: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.userId, body);
  }

  @Get()
  listOrders(
    @Req() req: any,
    @Query('mode') mode?: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.listOrders(req.user.userId, mode, status);
  }

  @Get('checkout/current')
  getCurrentCheckout(
    @Req() req: any,
    @Query('productId') productId?: string,
    @Query('conversationId') conversationId?: string,
    @Query('offerMessageId') offerMessageId?: string,
    @Query('source') source?: string,
  ) {
    return this.ordersService.getCurrentCheckout(req.user.userId, {
      productId: Number(productId),
      conversationId: conversationId ? Number(conversationId) : undefined,
      offerMessageId: offerMessageId ? Number(offerMessageId) : undefined,
      source,
    });
  }

  @Get(':orderId')
  getOrder(@Req() req: any, @Param('orderId', ParseIntPipe) orderId: number) {
    return this.ordersService.getOrder(orderId, req.user.userId);
  }

  @Post(':orderId/status')
  updateOrderStatus(
    @Req() req: any,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: { action?: string },
  ) {
    return this.ordersService.updateOrderStatus(
      orderId,
      req.user.userId,
      body.action,
    );
  }
}

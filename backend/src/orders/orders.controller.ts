import {
  BadRequestException,
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
import { CurrentUser } from 'src/auth/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private getBaseUrl(request: any) {
    const forwardedProto = request.headers['x-forwarded-proto'];
    const forwardedHost = request.headers['x-forwarded-host'];
    const protocol =
      (typeof forwardedProto === 'string'
        ? forwardedProto.split(',')[0]
        : undefined) ||
      request.protocol ||
      'http';
    const host =
      (typeof forwardedHost === 'string'
        ? forwardedHost.split(',')[0]
        : undefined) || request.get('host');

    return `${protocol}://${host}`;
  }

  @Post()
  createOrder(
    @CurrentUser('userId') userId: number,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(userId, createOrderDto);
  }

  @Get()
  listOrders(@CurrentUser('userId') userId: number) {
    return this.ordersService.listOrders(userId);
  }

  @Get('current')
  getCurrentOrder(
    @CurrentUser('userId') userId: number,
    @Query('conversationId') conversationId?: string,
    @Query('productId') productId?: string,
  ) {
    return this.ordersService.getCurrentOrder(userId, {
      conversationId: conversationId ? Number(conversationId) : undefined,
      productId: productId ? Number(productId) : undefined,
    });
  }

  @Get(':orderId')
  getOrder(
    @CurrentUser('userId') userId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.ordersService.getOrder(userId, orderId);
  }

  @Post(':orderId/checkout-session')
  initializeCheckout(
    @CurrentUser('userId') userId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Req() request: any,
  ) {
    return this.ordersService.initializeCheckout(
      userId,
      orderId,
      this.getBaseUrl(request),
    );
  }

  @Post(':orderId/cancel')
  cancelOrder(
    @CurrentUser('userId') userId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.ordersService.cancelOrder(userId, orderId);
  }

  @Post(':orderId/status')
  updateOrderStatus(
    @CurrentUser('userId') userId: number,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: { action?: 'prepare' | 'ship' | 'deliver' | 'received' },
  ) {
    if (!body.action) {
      throw new BadRequestException('Order action is required');
    }

    return this.ordersService.updateOrderStatus(userId, orderId, body.action);
  }
}

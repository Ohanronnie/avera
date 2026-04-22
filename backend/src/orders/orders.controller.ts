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

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@Req() req: any, @Body() body: any) {
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

  @Get(':orderId')
  getOrder(@Req() req: any, @Param('orderId', ParseIntPipe) orderId: number) {
    return this.ordersService.getOrder(orderId, req.user.userId);
  }
}

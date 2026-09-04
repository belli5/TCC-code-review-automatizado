import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.checkout(dto);
  }

  @Get()
  findAll(@Query() query: QueryOrdersDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':idOrNumber')
  findOne(@Param('idOrNumber') idOrNumber: string) {
    return this.ordersService.findOne(idOrNumber);
  }

  @Post(':idOrNumber/advance')
  @HttpCode(HttpStatus.OK)
  advance(@Param('idOrNumber') idOrNumber: string) {
    return this.ordersService.advance(idOrNumber);
  }

  @Post(':idOrNumber/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('idOrNumber') idOrNumber: string, @Body() dto: CancelOrderDto) {
    return this.ordersService.cancel(idOrNumber, dto.reason);
  }
}

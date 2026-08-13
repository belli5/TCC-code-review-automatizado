import { Body, Controller, Get, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderItem } from './order.entity';

interface CreateOrderDto {
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto.customerName, dto.customerEmail, dto.items);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }
}

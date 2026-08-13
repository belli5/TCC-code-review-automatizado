import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Order, OrderItem } from './order.entity';

@Injectable()
export class OrdersService {
  private readonly orders: Order[] = [];

  create(customerName: string, customerEmail: string, items: OrderItem[]): Order {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order: Order = {
      id: randomUUID(),
      customerName,
      customerEmail,
      items,
      total,
      createdAt: new Date().toISOString(),
    };
    this.orders.push(order);
    return order;
  }

  findAll(): Order[] {
    return this.orders;
  }
}

import { Module } from '@nestjs/common';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { OrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';

@Module({
  controllers: [ProductsController, OrdersController],
  providers: [ProductsService, OrdersService],
})
export class AppModule {}

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { OrdersService } from './orders.service';
import { TEST_CARDS } from '../payments/gateway/fake-gateway';

class WebhookDto {
  @IsString()
  paymentId!: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('test-cards')
  testCards() {
    return TEST_CARDS;
  }

  @Post(':paymentId/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(@Param('paymentId') paymentId: string) {
    return this.ordersService.confirmPayment(paymentId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  webhook(@Body() dto: WebhookDto) {
    return this.ordersService.confirmPayment(dto.paymentId);
  }
}

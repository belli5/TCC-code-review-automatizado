import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { QuoteShippingDto } from './dto/quote-shipping.dto';
import { FREE_SHIPPING_THRESHOLD_CENTS } from './shipping-rules';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('policy')
  policy() {
    return { freeShippingThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS };
  }

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  quote(@Body() dto: QuoteShippingDto) {
    return this.shippingService.quote(dto);
  }
}

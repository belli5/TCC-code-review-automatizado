import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  findActive() {
    return this.couponsService.findActive();
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validate(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(dto);
  }
}

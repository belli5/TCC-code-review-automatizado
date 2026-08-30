import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import {
  CouponApplication,
  CouponRule,
  evaluateCoupon,
  normalizeCouponCode,
} from './coupon-rules';

export interface CouponListItem {
  code: string;
  type: string;
  description: string;
  minSubtotalCents: number;
}

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(): Promise<CouponListItem[]> {
    const now = new Date();
    const coupons = await this.prisma.coupon.findMany({
      where: {
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { minSubtotalCents: 'asc' },
    });

    return coupons.map((coupon) => ({
      code: coupon.code,
      type: coupon.type,
      description: coupon.description,
      minSubtotalCents: coupon.minSubtotalCents,
    }));
  }

  async validate(dto: ValidateCouponDto): Promise<CouponApplication> {
    const rule = await this.findRule(dto.code);
    const evaluation = evaluateCoupon(rule, dto.subtotalCents);

    if (!evaluation.ok) {
      throw new BadRequestException(evaluation.message);
    }

    return {
      code: evaluation.code,
      type: evaluation.type,
      description: evaluation.description,
      discountCents: evaluation.discountCents,
      freeShipping: evaluation.freeShipping,
    };
  }

  async findRule(code: string): Promise<CouponRule & { id: string }> {
    const normalized = normalizeCouponCode(code);
    const coupon = await this.prisma.coupon.findUnique({ where: { code: normalized } });

    if (!coupon) {
      throw new NotFoundException(`Cupom "${normalized}" não encontrado.`);
    }

    return coupon;
  }

  async registerUsage(couponId: string): Promise<void> {
    await this.prisma.coupon.update({
      where: { id: couponId },
      data: { usageCount: { increment: 1 } },
    });
  }
}

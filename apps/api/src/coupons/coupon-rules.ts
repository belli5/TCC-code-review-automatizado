import { clampToZero, formatCents, percentOfCents } from '../common/money';

export const COUPON_TYPES = ['percent', 'fixed', 'free_shipping'] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export interface CouponRule {
  code: string;
  type: string;
  value: number;
  description: string;
  minSubtotalCents: number;
  active: boolean;
  expiresAt: Date | null;
  usageLimit: number | null;
  usageCount: number;
}

export interface CouponApplication {
  code: string;
  type: CouponType;
  description: string;
  discountCents: number;
  freeShipping: boolean;
}

export type CouponRejectionReason =
  | 'inactive'
  | 'expired'
  | 'usage_limit'
  | 'min_subtotal'
  | 'unknown_type';

export interface CouponRejection {
  ok: false;
  reason: CouponRejectionReason;
  message: string;
}

export type CouponEvaluation = ({ ok: true } & CouponApplication) | CouponRejection;

export function normalizeCouponCode(code: string): string {
  return (code ?? '').trim().toUpperCase();
}

export function evaluateCoupon(
  rule: CouponRule,
  subtotalCents: number,
  now: Date = new Date(),
): CouponEvaluation {
  if (!rule.active) {
    return { ok: false, reason: 'inactive', message: 'Este cupom não está mais disponível.' };
  }

  if (rule.expiresAt && rule.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, reason: 'expired', message: 'Este cupom expirou.' };
  }

  if (rule.usageLimit !== null && rule.usageCount >= rule.usageLimit) {
    return {
      ok: false,
      reason: 'usage_limit',
      message: 'Este cupom atingiu o limite de utilizações.',
    };
  }

  if (subtotalCents < rule.minSubtotalCents) {
    const missing = rule.minSubtotalCents - subtotalCents;
    return {
      ok: false,
      reason: 'min_subtotal',
      message:
        `Este cupom vale a partir de ${formatCents(rule.minSubtotalCents)}. ` +
        `Faltam ${formatCents(missing)} no seu carrinho.`,
    };
  }

  switch (rule.type) {
    case 'percent':
      return {
        ok: true,
        code: rule.code,
        type: 'percent',
        description: rule.description,
        discountCents: Math.min(percentOfCents(subtotalCents, rule.value), subtotalCents),
        freeShipping: false,
      };

    case 'fixed':
      return {
        ok: true,
        code: rule.code,
        type: 'fixed',
        description: rule.description,
        discountCents: clampToZero(Math.min(rule.value, subtotalCents)),
        freeShipping: false,
      };

    case 'free_shipping':
      return {
        ok: true,
        code: rule.code,
        type: 'free_shipping',
        description: rule.description,
        discountCents: 0,
        freeShipping: true,
      };

    default:
      return {
        ok: false,
        reason: 'unknown_type',
        message: 'Cupom com configuração inválida.',
      };
  }
}

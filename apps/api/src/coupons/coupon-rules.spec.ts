import { CouponRule, evaluateCoupon, normalizeCouponCode } from './coupon-rules';

const NOW = new Date('2026-08-29T12:00:00.000Z');

function rule(overrides: Partial<CouponRule> = {}): CouponRule {
  return {
    code: 'BEMVINDO10',
    type: 'percent',
    value: 10,
    description: '10% de desconto',
    minSubtotalCents: 0,
    active: true,
    expiresAt: null,
    usageLimit: null,
    usageCount: 0,
    ...overrides,
  };
}

describe('normalizeCouponCode', () => {
  it('ignora espaços e caixa', () => {
    expect(normalizeCouponCode('  bemvindo10 ')).toBe('BEMVINDO10');
  });
});

describe('evaluateCoupon — cupom percentual', () => {
  it('desconta o percentual sobre o subtotal', () => {
    const result = evaluateCoupon(rule(), 50000, NOW);
    expect(result).toMatchObject({ ok: true, discountCents: 5000, freeShipping: false });
  });

  it('nunca desconta mais que o subtotal', () => {
    const result = evaluateCoupon(rule({ value: 150 }), 10000, NOW);
    expect(result).toMatchObject({ ok: true, discountCents: 10000 });
  });
});

describe('evaluateCoupon — cupom de valor fixo', () => {
  it('desconta o valor em centavos', () => {
    const result = evaluateCoupon(
      rule({ type: 'fixed', value: 5000, minSubtotalCents: 30000 }),
      40000,
      NOW,
    );
    expect(result).toMatchObject({ ok: true, discountCents: 5000 });
  });

  it('limita o desconto ao subtotal em vez de gerar troco', () => {
    const result = evaluateCoupon(rule({ type: 'fixed', value: 50000 }), 10000, NOW);
    expect(result).toMatchObject({ ok: true, discountCents: 10000 });
  });
});

describe('evaluateCoupon — frete grátis', () => {
  it('não mexe no subtotal, apenas marca o frete', () => {
    const result = evaluateCoupon(rule({ type: 'free_shipping', value: 0 }), 20000, NOW);
    expect(result).toMatchObject({ ok: true, discountCents: 0, freeShipping: true });
  });
});

describe('evaluateCoupon — recusas', () => {
  it('recusa cupom desativado', () => {
    const result = evaluateCoupon(rule({ active: false }), 50000, NOW);
    expect(result).toMatchObject({ ok: false, reason: 'inactive' });
  });

  it('recusa cupom expirado', () => {
    const expired = rule({ expiresAt: new Date('2026-08-28T00:00:00.000Z') });
    expect(evaluateCoupon(expired, 50000, NOW)).toMatchObject({ ok: false, reason: 'expired' });
  });

  it('aceita cupom que ainda não expirou', () => {
    const valid = rule({ expiresAt: new Date('2026-08-30T00:00:00.000Z') });
    expect(evaluateCoupon(valid, 50000, NOW)).toMatchObject({ ok: true });
  });

  it('recusa cupom que atingiu o limite de uso', () => {
    const used = rule({ usageLimit: 5, usageCount: 5 });
    expect(evaluateCoupon(used, 50000, NOW)).toMatchObject({ ok: false, reason: 'usage_limit' });
  });

  it('recusa abaixo do valor mínimo e diz quanto falta', () => {
    const result = evaluateCoupon(rule({ minSubtotalCents: 30000 }), 10000, NOW);
    expect(result).toMatchObject({ ok: false, reason: 'min_subtotal' });
    if (!result.ok) {
      expect(result.message).toMatch(/vale a partir de R\$\s300,00/);
      expect(result.message).toMatch(/Faltam R\$\s200,00/);
    }
  });

  it('aceita exatamente no valor mínimo', () => {
    expect(evaluateCoupon(rule({ minSubtotalCents: 30000 }), 30000, NOW)).toMatchObject({
      ok: true,
    });
  });

  it('recusa cupom com tipo desconhecido', () => {
    expect(evaluateCoupon(rule({ type: 'cashback' }), 50000, NOW)).toMatchObject({
      ok: false,
      reason: 'unknown_type',
    });
  });
});

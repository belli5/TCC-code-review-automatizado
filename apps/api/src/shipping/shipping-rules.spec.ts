import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  addBusinessDays,
  billableKilos,
  findShippingOption,
  isShippingServiceId,
  quoteShipping,
  resolveZone,
  shippingServiceName,
} from './shipping-rules';

const NOW = new Date('2026-08-31T12:00:00.000Z'); // segunda-feira

describe('resolveZone', () => {
  it('mapeia os prefixos de CEP para as regiões', () => {
    expect(resolveZone('01310-100')).toBe('sudeste'); // São Paulo
    expect(resolveZone('20040-020')).toBe('sudeste'); // Rio de Janeiro
    expect(resolveZone('40010-000')).toBe('nordeste'); // Salvador
    expect(resolveZone('69000-000')).toBe('norte'); // Manaus
    expect(resolveZone('70040-010')).toBe('centro_oeste'); // Brasília
    expect(resolveZone('90010-000')).toBe('sul'); // Porto Alegre
  });

  it('trata CEP incompleto como região desconhecida', () => {
    expect(resolveZone('123')).toBe('desconhecida');
    expect(resolveZone('')).toBe('desconhecida');
  });
});

describe('billableKilos', () => {
  it('cobra por quilo iniciado, com mínimo de 1', () => {
    expect(billableKilos(200)).toBe(1);
    expect(billableKilos(1000)).toBe(1);
    expect(billableKilos(1001)).toBe(2);
    expect(billableKilos(2500)).toBe(3);
  });
});

describe('addBusinessDays', () => {
  it('pula fim de semana', () => {
    const friday = new Date('2026-08-28T12:00:00.000Z');
    expect(addBusinessDays(friday, 1).getUTCDate()).toBe(31);
  });

  it('soma vários dias úteis atravessando um fim de semana', () => {
    const monday = new Date('2026-08-31T12:00:00.000Z');
    const result = addBusinessDays(monday, 5);
    expect(result.toISOString().slice(0, 10)).toBe('2026-09-07');
  });
});

describe('quoteShipping', () => {
  const input = { zipCode: '01310-100', weightGrams: 800, subtotalCents: 10000, now: NOW };

  it('devolve as três modalidades', () => {
    const quote = quoteShipping(input);
    expect(quote.options.map((o) => o.id)).toEqual(['PAC', 'SEDEX', 'EXPRESS']);
  });

  it('cobra mais e demora mais quanto mais longe', () => {
    const sudeste = quoteShipping(input);
    const norte = quoteShipping({ ...input, zipCode: '69000-000' });

    expect(norte.options[0].priceCents).toBeGreaterThan(sudeste.options[0].priceCents);
    expect(norte.options[0].etaDays).toBeGreaterThan(sudeste.options[0].etaDays);
  });

  it('cobra mais por encomenda mais pesada', () => {
    const leve = quoteShipping({ ...input, weightGrams: 500 });
    const pesado = quoteShipping({ ...input, weightGrams: 5000 });

    expect(pesado.options[0].priceCents).toBeGreaterThan(leve.options[0].priceCents);
  });

  it('o econômico é o mais barato e o expresso o mais rápido', () => {
    const quote = quoteShipping(input);
    const [pac, sedex, express] = quote.options;

    expect(pac.priceCents).toBeLessThan(sedex.priceCents);
    expect(sedex.priceCents).toBeLessThan(express.priceCents);
    expect(express.etaDays).toBeLessThan(sedex.etaDays);
    expect(sedex.etaDays).toBeLessThan(pac.etaDays);
  });

  it('zera o econômico acima da faixa de frete grátis', () => {
    const quote = quoteShipping({ ...input, subtotalCents: FREE_SHIPPING_THRESHOLD_CENTS });
    const pac = quote.options[0];

    expect(pac.priceCents).toBe(0);
    expect(pac.freeShippingApplied).toBe(true);
    expect(pac.originalPriceCents).toBeGreaterThan(0);
  });

  it('não dá frete grátis nas modalidades rápidas', () => {
    const quote = quoteShipping({ ...input, subtotalCents: 100000 });
    expect(quote.options[1].priceCents).toBeGreaterThan(0);
    expect(quote.options[2].priceCents).toBeGreaterThan(0);
  });

  it('informa quanto falta para o frete grátis', () => {
    const quote = quoteShipping({ ...input, subtotalCents: 20000 });
    expect(quote.missingForFreeShippingCents).toBe(FREE_SHIPPING_THRESHOLD_CENTS - 20000);

    const acima = quoteShipping({ ...input, subtotalCents: 50000 });
    expect(acima.missingForFreeShippingCents).toBe(0);
  });

  it('calcula a data estimada em dias úteis', () => {
    const quote = quoteShipping(input);
    const express = quote.options[2];
    expect(express.estimatedDeliveryAt.slice(0, 10)).toBe('2026-09-01');
  });
});

describe('findShippingOption', () => {
  it('encontra a modalidade escolhida', () => {
    const quote = quoteShipping({ zipCode: '01310100', weightGrams: 500, subtotalCents: 5000 });
    expect(findShippingOption(quote, 'SEDEX')?.id).toBe('SEDEX');
    expect(findShippingOption(quote, 'DRONE')).toBeUndefined();
  });
});

describe('isShippingServiceId / shippingServiceName', () => {
  it('valida e nomeia os serviços', () => {
    expect(isShippingServiceId('PAC')).toBe(true);
    expect(isShippingServiceId('DRONE')).toBe(false);
    expect(shippingServiceName('SEDEX')).toBe('Rápido');
  });
});

import { normalizeZipCode } from '../common/validators';

export const SHIPPING_SERVICES = ['PAC', 'SEDEX', 'EXPRESS'] as const;
export type ShippingServiceId = (typeof SHIPPING_SERVICES)[number];

export const FREE_SHIPPING_THRESHOLD_CENTS = 29900;

export const SHIPPING_ZONES = [
  'sudeste',
  'sul',
  'centro_oeste',
  'nordeste',
  'norte',
  'desconhecida',
] as const;
export type ShippingZone = (typeof SHIPPING_ZONES)[number];

interface ZoneConfig {
  label: string;
  multiplier: number;
  extraDays: number;
}

const ZONE_CONFIG: Record<ShippingZone, ZoneConfig> = {
  sudeste: { label: 'Sudeste', multiplier: 1, extraDays: 0 },
  sul: { label: 'Sul', multiplier: 1.25, extraDays: 2 },
  centro_oeste: { label: 'Centro-Oeste', multiplier: 1.4, extraDays: 3 },
  nordeste: { label: 'Nordeste', multiplier: 1.6, extraDays: 4 },
  norte: { label: 'Norte', multiplier: 2, extraDays: 7 },
  desconhecida: { label: 'Região não identificada', multiplier: 1.8, extraDays: 5 },
};

interface ServiceConfig {
  id: ShippingServiceId;
  name: string;
  description: string;
  baseCents: number;
  perKgCents: number;
  baseDays: number;
  eligibleForFreeShipping: boolean;
}

const SERVICE_CONFIG: ServiceConfig[] = [
  {
    id: 'PAC',
    name: 'Econômico',
    description: 'A opção mais barata, entrega em domicílio.',
    baseCents: 1490,
    perKgCents: 490,
    baseDays: 6,
    eligibleForFreeShipping: true,
  },
  {
    id: 'SEDEX',
    name: 'Rápido',
    description: 'Metade do prazo do econômico, com rastreio.',
    baseCents: 2490,
    perKgCents: 890,
    baseDays: 3,
    eligibleForFreeShipping: false,
  },
  {
    id: 'EXPRESS',
    name: 'Expresso',
    description: 'Prioridade máxima, sai no primeiro voo disponível.',
    baseCents: 4990,
    perKgCents: 1290,
    baseDays: 1,
    eligibleForFreeShipping: false,
  },
];

export interface ShippingOption {
  id: ShippingServiceId;
  name: string;
  description: string;
  priceCents: number;
  originalPriceCents: number;
  etaDays: number;
  estimatedDeliveryAt: string;
  freeShippingApplied: boolean;
}

export interface ShippingQuote {
  zipCode: string;
  zone: ShippingZone;
  zoneLabel: string;
  weightGrams: number;
  freeShippingThresholdCents: number;
  missingForFreeShippingCents: number;
  options: ShippingOption[];
}

export function resolveZone(zipCode: string): ShippingZone {
  const digits = normalizeZipCode(zipCode);
  if (digits.length !== 8) return 'desconhecida';

  const prefix = Number(digits.slice(0, 2));
  if (prefix >= 1 && prefix <= 39) return 'sudeste';
  if (prefix >= 40 && prefix <= 65) return 'nordeste';
  if (prefix >= 66 && prefix <= 69) return 'norte';
  if (prefix >= 70 && prefix <= 79) return 'centro_oeste';
  if (prefix >= 80 && prefix <= 99) return 'sul';
  return 'desconhecida';
}

export function zoneLabel(zone: ShippingZone): string {
  return ZONE_CONFIG[zone].label;
}

export function billableKilos(weightGrams: number): number {
  return Math.max(1, Math.ceil(weightGrams / 1000));
}

export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from.getTime());
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const weekday = result.getDay();
    if (weekday !== 0 && weekday !== 6) {
      remaining -= 1;
    }
  }
  return result;
}

export interface QuoteInput {
  zipCode: string;
  weightGrams: number;
  subtotalCents: number;
  now?: Date;
}

export function quoteShipping({
  zipCode,
  weightGrams,
  subtotalCents,
  now = new Date(),
}: QuoteInput): ShippingQuote {
  const zone = resolveZone(zipCode);
  const config = ZONE_CONFIG[zone];
  const kilos = billableKilos(weightGrams);
  const qualifiesForFreeShipping = subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;

  const options: ShippingOption[] = SERVICE_CONFIG.map((service) => {
    const raw = (service.baseCents + service.perKgCents * kilos) * config.multiplier;
    const originalPriceCents = Math.round(raw);
    const isFree = qualifiesForFreeShipping && service.eligibleForFreeShipping;
    const etaDays = service.baseDays + config.extraDays;

    return {
      id: service.id,
      name: service.name,
      description: service.description,
      priceCents: isFree ? 0 : originalPriceCents,
      originalPriceCents,
      etaDays,
      estimatedDeliveryAt: addBusinessDays(now, etaDays).toISOString(),
      freeShippingApplied: isFree,
    };
  });

  return {
    zipCode: normalizeZipCode(zipCode),
    zone,
    zoneLabel: config.label,
    weightGrams,
    freeShippingThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS,
    missingForFreeShippingCents: Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents),
    options,
  };
}

export function findShippingOption(
  quote: ShippingQuote,
  serviceId: string,
): ShippingOption | undefined {
  return quote.options.find((option) => option.id === serviceId);
}

export function isShippingServiceId(value: string): value is ShippingServiceId {
  return (SHIPPING_SERVICES as readonly string[]).includes(value);
}

export function shippingServiceName(serviceId: string): string {
  return SERVICE_CONFIG.find((service) => service.id === serviceId)?.name ?? serviceId;
}

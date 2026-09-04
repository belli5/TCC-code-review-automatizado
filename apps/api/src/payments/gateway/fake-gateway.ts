import {
  CardBrand,
  cardLast4,
  detectCardBrand,
  isValidCardNumber,
  isValidCvv,
  isValidExpiry,
  onlyDigits,
} from '../../common/validators';

export const PAYMENT_METHODS = ['credit_card', 'pix', 'boleto'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['pending', 'paid', 'declined', 'refunded', 'expired'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DECLINE_REASONS = [
  'invalid_number',
  'expired_card',
  'invalid_cvv',
  'insufficient_funds',
  'suspected_fraud',
  'do_not_honor',
] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

export const DECLINE_MESSAGES: Record<DeclineReason, string> = {
  invalid_number: 'Número de cartão inválido. Confira os dígitos.',
  expired_card: 'Cartão vencido. Verifique a data de validade.',
  invalid_cvv: 'Código de segurança inválido.',
  insufficient_funds: 'Compra não autorizada: saldo ou limite insuficiente.',
  suspected_fraud: 'Compra não autorizada pelo emissor: suspeita de fraude.',
  do_not_honor: 'Compra não autorizada pelo emissor. Entre em contato com o banco.',
};

const DECLINE_BY_LAST4: Record<string, DeclineReason> = {
  '0000': 'insufficient_funds',
  '0002': 'suspected_fraud',
  '0069': 'do_not_honor',
};

export const TEST_CARDS = [
  { number: '4242 4242 4242 4242', brand: 'visa', outcome: 'Aprovado' },
  { number: '5555 5555 5555 4444', brand: 'mastercard', outcome: 'Aprovado' },
  { number: '4111 0000 0008 0000', brand: 'visa', outcome: 'Recusado: saldo insuficiente' },
  { number: '5555 0000 0006 0002', brand: 'mastercard', outcome: 'Recusado: suspeita de fraude' },
  { number: '4000 0000 0000 0069', brand: 'visa', outcome: 'Recusado pelo emissor' },
] as const;

export const MAX_INSTALLMENTS = 12;
export const MIN_INSTALLMENT_CENTS = 2000;

export interface CardInput {
  number: string;
  holderName: string;
  expMonth: number;
  expYear: number;
  cvv: string;
}

export interface CardAuthorization {
  approved: boolean;
  brand: CardBrand;
  last4: string;
  holderName: string;
  declineReason: DeclineReason | null;
  message: string;
}

export function authorizeCard(card: CardInput, now: Date = new Date()): CardAuthorization {
  const digits = onlyDigits(card.number);
  const brand = detectCardBrand(digits);
  const last4 = cardLast4(digits);
  const holderName = card.holderName.trim().toUpperCase();

  const decline = (reason: DeclineReason): CardAuthorization => ({
    approved: false,
    brand,
    last4,
    holderName,
    declineReason: reason,
    message: DECLINE_MESSAGES[reason],
  });

  if (!isValidCardNumber(digits)) {
    return decline('invalid_number');
  }
  if (!isValidExpiry(card.expMonth, card.expYear, now)) {
    return decline('expired_card');
  }
  if (!isValidCvv(card.cvv, brand)) {
    return decline('invalid_cvv');
  }

  const simulated = DECLINE_BY_LAST4[last4];
  if (simulated) {
    return decline(simulated);
  }

  return {
    approved: true,
    brand,
    last4,
    holderName,
    declineReason: null,
    message: 'Pagamento aprovado.',
  };
}

export function maxInstallmentsFor(amountCents: number): number {
  const affordable = Math.floor(amountCents / MIN_INSTALLMENT_CENTS);
  return Math.max(1, Math.min(MAX_INSTALLMENTS, affordable));
}

export function isValidInstallmentCount(amountCents: number, installments: number): boolean {
  return (
    Number.isInteger(installments) &&
    installments >= 1 &&
    installments <= maxInstallmentsFor(amountCents)
  );
}

export function isAsynchronousMethod(method: PaymentMethod): boolean {
  return method === 'pix' || method === 'boleto';
}

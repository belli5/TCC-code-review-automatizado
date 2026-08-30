
export const CURRENCY = 'BRL';
export const LOCALE = 'pt-BR';

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function formatCents(cents: number): string {
  return fromCents(cents).toLocaleString(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
  });
}

export function sumCents(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function percentOfCents(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}

export function clampToZero(cents: number): number {
  return cents < 0 ? 0 : cents;
}

export function splitInstallments(totalCents: number, installments: number): number[] {
  if (!Number.isInteger(installments) || installments < 1) {
    throw new Error('O número de parcelas deve ser um inteiro maior ou igual a 1');
  }
  const base = Math.floor(totalCents / installments);
  const remainder = totalCents - base * installments;
  return Array.from({ length: installments }, (_, index) =>
    index === 0 ? base + remainder : base,
  );
}

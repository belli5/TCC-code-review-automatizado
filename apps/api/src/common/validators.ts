export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'elo' | 'unknown';

export function onlyDigits(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}

export function isValidCardNumber(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function detectCardBrand(value: string): CardBrand {
  const digits = onlyDigits(value);
  if (/^(4011|4312|5067|6362|6504)/.test(digits)) return 'elo';
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  return 'unknown';
}

export function cardLast4(value: string): string {
  return onlyDigits(value).slice(-4);
}

export function isValidExpiry(
  month: number,
  year: number,
  reference: Date = new Date(),
): boolean {
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  const fullYear = year < 100 ? 2000 + year : year;
  if (!Number.isInteger(fullYear) || fullYear < 2000 || fullYear > 2100) return false;

  const refYear = reference.getFullYear();
  const refMonth = reference.getMonth() + 1;
  if (fullYear < refYear) return false;
  if (fullYear === refYear && month < refMonth) return false;
  return true;
}

export function isValidCvv(value: string, brand: CardBrand = 'unknown'): boolean {
  const digits = onlyDigits(value);
  return brand === 'amex' ? digits.length === 4 : digits.length === 3;
}

export function normalizeZipCode(value: string): string {
  return onlyDigits(value).slice(0, 8);
}

export function isValidZipCode(value: string): boolean {
  return /^\d{8}$/.test(normalizeZipCode(value));
}

export function formatZipCode(value: string): string {
  const digits = normalizeZipCode(value);
  if (digits.length !== 8) return value;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const checkDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += Number(digits[i]) * (length + 1 - i);
    }
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };

  return checkDigit(9) === Number(digits[9]) && checkDigit(10) === Number(digits[10]);
}

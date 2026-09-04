
const BANK_CODE = '001';
const CURRENCY_CODE = '9';
const DUE_DATE_EPOCH = Date.UTC(1997, 9, 7);

export function mod10(block: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = block.length - 1; i >= 0; i -= 1) {
    const product = Number(block[i]) * weight;
    sum += product > 9 ? product - 9 : product;
    weight = weight === 2 ? 1 : 2;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

export function dueDateFactor(dueDate: Date): number {
  const days = Math.floor((dueDate.getTime() - DUE_DATE_EPOCH) / (24 * 60 * 60 * 1000));
  return ((days % 10000) + 10000) % 10000;
}

function ourNumber(documentNumber: string): string {
  let hash = 0;
  for (let i = 0; i < documentNumber.length; i += 1) {
    hash = (hash * 31 + documentNumber.charCodeAt(i)) % 1_000_000_000_000;
  }
  return String(hash).padStart(12, '0').slice(-12);
}

export interface Boleto {
  digitableLine: string;
  digitableLineRaw: string;
  dueDate: string;
  amountCents: number;
}

export interface BuildBoletoInput {
  amountCents: number;
  dueDate: Date;
  documentNumber: string;
}

export function buildBoleto({
  amountCents,
  dueDate,
  documentNumber,
}: BuildBoletoInput): Boleto {
  const factor = String(dueDateFactor(dueDate)).padStart(4, '0');
  const amount = String(amountCents).padStart(10, '0');
  const free = ourNumber(documentNumber) + '00000000'; // 20 dígitos de campo livre

  const field1 = `${BANK_CODE}${CURRENCY_CODE}${free.slice(0, 5)}`;
  const field2 = free.slice(5, 15);
  const field3 = free.slice(15, 20).padEnd(10, '0');
  const barcodeCheckDigit = mod10(`${BANK_CODE}${CURRENCY_CODE}${factor}${amount}${free}`);
  const field5 = `${factor}${amount}`;

  const raw =
    `${field1}${mod10(field1)}` +
    `${field2}${mod10(field2)}` +
    `${field3}${mod10(field3)}` +
    `${barcodeCheckDigit}` +
    `${field5}`;

  const formatted =
    `${raw.slice(0, 5)}.${raw.slice(5, 10)} ` +
    `${raw.slice(10, 15)}.${raw.slice(15, 21)} ` +
    `${raw.slice(21, 26)}.${raw.slice(26, 32)} ` +
    `${raw.slice(32, 33)} ` +
    `${raw.slice(33)}`;

  return {
    digitableLine: formatted,
    digitableLineRaw: raw,
    dueDate: dueDate.toISOString(),
    amountCents,
  };
}

export const BOLETO_DUE_DAYS = 3;

export function boletoDueDate(now: Date = new Date()): Date {
  const due = new Date(now.getTime());
  due.setDate(due.getDate() + BOLETO_DUE_DAYS);
  return due;
}

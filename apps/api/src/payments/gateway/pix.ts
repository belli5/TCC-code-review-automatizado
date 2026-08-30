import { fromCents } from '../../common/money';

const PAYLOAD_FORMAT_INDICATOR = '01';
const MERCHANT_ACCOUNT_GUI = 'br.gov.bcb.pix';
const MERCHANT_CATEGORY_CODE = '0000';
const CURRENCY_BRL = '986';
const COUNTRY_BR = 'BR';

export const PIX_MERCHANT_NAME = 'LOJA SIMPLES';
export const PIX_MERCHANT_CITY = 'SAO PAULO';
export const PIX_KEY = 'pagamentos@lojasimples.com.br';

function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function sanitize(value: string, maxLength: number): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .toUpperCase()
    .slice(0, maxLength);
}

export interface PixPayloadInput {
  amountCents: number;
  txid: string;
  merchantName?: string;
  merchantCity?: string;
  pixKey?: string;
}

export function buildPixPayload({
  amountCents,
  txid,
  merchantName = PIX_MERCHANT_NAME,
  merchantCity = PIX_MERCHANT_CITY,
  pixKey = PIX_KEY,
}: PixPayloadInput): string {
  const merchantAccount = field('00', MERCHANT_ACCOUNT_GUI) + field('01', pixKey);
  const additionalData = field('05', sanitize(txid, 25) || '***');

  const payload =
    field('00', PAYLOAD_FORMAT_INDICATOR) +
    field('26', merchantAccount) +
    field('52', MERCHANT_CATEGORY_CODE) +
    field('53', CURRENCY_BRL) +
    field('54', fromCents(amountCents).toFixed(2)) +
    field('58', COUNTRY_BR) +
    field('59', sanitize(merchantName, 25)) +
    field('60', sanitize(merchantCity, 15)) +
    field('62', additionalData);

  const withCrcMarker = `${payload}6304`;
  return `${withCrcMarker}${crc16(withCrcMarker)}`;
}

export const PIX_EXPIRATION_MINUTES = 30;

export function pixExpiration(now: Date = new Date()): Date {
  return new Date(now.getTime() + PIX_EXPIRATION_MINUTES * 60 * 1000);
}

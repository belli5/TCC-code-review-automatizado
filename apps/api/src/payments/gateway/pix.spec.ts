import { PIX_EXPIRATION_MINUTES, buildPixPayload, crc16, pixExpiration } from './pix';

describe('crc16', () => {
  it('bate com o vetor de teste padrão do CRC16-CCITT', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('sempre devolve quatro dígitos hexadecimais', () => {
    expect(crc16('a')).toHaveLength(4);
    expect(crc16('')).toBe('FFFF');
  });

  it('muda quando um único caractere muda', () => {
    expect(crc16('PIX-0001')).not.toBe(crc16('PIX-0002'));
  });
});

describe('buildPixPayload', () => {
  const payload = buildPixPayload({ amountCents: 11980, txid: 'LS-20260829-A1B2C3' });

  it('começa com o indicador de formato do padrão EMV', () => {
    expect(payload.startsWith('000201')).toBe(true);
  });

  it('inclui o identificador do arranjo PIX', () => {
    expect(payload).toContain('br.gov.bcb.pix');
  });

  it('leva o valor em reais com duas casas', () => {
    expect(payload).toContain('5406119.80');
  });

  it('leva o país e a moeda corretos', () => {
    expect(payload).toContain('5303986'); // 986 = BRL
    expect(payload).toContain('5802BR');
  });

  it('termina com o marcador do CRC e um CRC válido', () => {
    const marker = payload.slice(-8, -4);
    expect(marker).toBe('6304');

    const semCrc = payload.slice(0, -4);
    expect(crc16(semCrc)).toBe(payload.slice(-4));
  });

  it('gera payloads diferentes para valores diferentes', () => {
    const outro = buildPixPayload({ amountCents: 5000, txid: 'LS-20260829-A1B2C3' });
    expect(outro).not.toBe(payload);
  });

  it('remove acentos do nome do recebedor, que o padrão não aceita', () => {
    const comAcento = buildPixPayload({
      amountCents: 1000,
      txid: 'X',
      merchantName: 'Ação Comércio',
    });
    expect(comAcento).toContain('ACAO COMERCIO');
  });
});

describe('pixExpiration', () => {
  it('expira 30 minutos depois da criação', () => {
    const now = new Date('2026-08-29T12:00:00.000Z');
    expect(pixExpiration(now).toISOString()).toBe('2026-08-29T12:30:00.000Z');
    expect(PIX_EXPIRATION_MINUTES).toBe(30);
  });
});

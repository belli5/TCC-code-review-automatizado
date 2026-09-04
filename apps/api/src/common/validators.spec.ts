import {
  cardLast4,
  detectCardBrand,
  formatZipCode,
  isValidCardNumber,
  isValidCpf,
  isValidCvv,
  isValidExpiry,
  isValidZipCode,
  normalizeZipCode,
  onlyDigits,
} from './validators';

describe('isValidCardNumber (Luhn)', () => {
  it('aceita números reais de cartões de teste', () => {
    expect(isValidCardNumber('4242 4242 4242 4242')).toBe(true);
    expect(isValidCardNumber('5555555555554444')).toBe(true);
    expect(isValidCardNumber('378282246310005')).toBe(true);
  });

  it('recusa um número com um dígito trocado', () => {
    expect(isValidCardNumber('4242424242424243')).toBe(false);
  });

  it('recusa 16 dígitos aleatórios', () => {
    expect(isValidCardNumber('1234567890123456')).toBe(false);
  });

  it('recusa números curtos ou longos demais', () => {
    expect(isValidCardNumber('42424242424')).toBe(false);
    expect(isValidCardNumber('42424242424242424242')).toBe(false);
  });
});

describe('detectCardBrand', () => {
  it('identifica as bandeiras pelo prefixo', () => {
    expect(detectCardBrand('4242424242424242')).toBe('visa');
    expect(detectCardBrand('5555555555554444')).toBe('mastercard');
    expect(detectCardBrand('378282246310005')).toBe('amex');
    expect(detectCardBrand('6362970000457013')).toBe('elo');
    expect(detectCardBrand('9999999999999999')).toBe('unknown');
  });

  it('prioriza Elo sobre Visa quando o prefixo colide', () => {
    expect(detectCardBrand('4011780000000000')).toBe('elo');
  });
});

describe('cardLast4', () => {
  it('pega os quatro últimos dígitos ignorando os espaços', () => {
    expect(cardLast4('4242 4242 4242 4242')).toBe('4242');
  });
});

describe('isValidExpiry', () => {
  const now = new Date('2026-08-29T12:00:00.000Z');

  it('aceita datas futuras', () => {
    expect(isValidExpiry(12, 2030, now)).toBe(true);
    expect(isValidExpiry(12, 30, now)).toBe(true);
  });

  it('aceita o próprio mês de vencimento', () => {
    expect(isValidExpiry(8, 2026, now)).toBe(true);
  });

  it('recusa mês já passado', () => {
    expect(isValidExpiry(7, 2026, now)).toBe(false);
    expect(isValidExpiry(12, 2025, now)).toBe(false);
  });

  it('recusa mês fora de 1 a 12', () => {
    expect(isValidExpiry(0, 2030, now)).toBe(false);
    expect(isValidExpiry(13, 2030, now)).toBe(false);
  });
});

describe('isValidCvv', () => {
  it('exige 3 dígitos, ou 4 na Amex', () => {
    expect(isValidCvv('123')).toBe(true);
    expect(isValidCvv('12')).toBe(false);
    expect(isValidCvv('1234', 'amex')).toBe(true);
    expect(isValidCvv('123', 'amex')).toBe(false);
  });
});

describe('CEP', () => {
  it('normaliza e valida', () => {
    expect(normalizeZipCode('01310-100')).toBe('01310100');
    expect(isValidZipCode('01310-100')).toBe(true);
    expect(isValidZipCode('0131010')).toBe(false);
  });

  it('formata para exibição', () => {
    expect(formatZipCode('01310100')).toBe('01310-100');
  });
});

describe('isValidCpf', () => {
  it('aceita CPFs com dígitos verificadores corretos', () => {
    expect(isValidCpf('390.533.447-05')).toBe(true);
    expect(isValidCpf('11144477735')).toBe(true);
  });

  it('recusa dígito verificador errado', () => {
    expect(isValidCpf('390.533.447-06')).toBe(false);
  });

  it('recusa sequências repetidas', () => {
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('00000000000')).toBe(false);
  });

  it('recusa tamanho errado', () => {
    expect(isValidCpf('1234567890')).toBe(false);
  });
});

describe('onlyDigits', () => {
  it('remove tudo que não é dígito', () => {
    expect(onlyDigits('(11) 98765-4321')).toBe('11987654321');
  });
});

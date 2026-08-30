import {
  formatBusinessDays,
  formatCents,
  maskCardNumber,
  maskCpf,
  maskExpiry,
  maskPhone,
  maskZipCode,
  minutesUntil,
  onlyDigits,
} from '../format';

describe('formatCents', () => {
  it('converte centavos para moeda brasileira', () => {
    expect(formatCents(5990)).toMatch(/^R\$\s59,90$/);
    expect(formatCents(0)).toMatch(/^R\$\s0,00$/);
    expect(formatCents(100000)).toMatch(/^R\$\s1\.000,00$/);
  });

  it('não perde centavo somando inteiros', () => {
    const total = 10 + 20;
    expect(formatCents(total)).toMatch(/^R\$\s0,30$/);
  });
});

describe('máscaras de digitação', () => {
  it('formata CEP', () => {
    expect(maskZipCode('01310100')).toBe('01310-100');
    expect(maskZipCode('013')).toBe('013');
    expect(maskZipCode('01310-100999')).toBe('01310-100');
  });

  it('formata CPF', () => {
    expect(maskCpf('39053344705')).toBe('390.533.447-05');
    expect(maskCpf('3905')).toBe('390.5');
  });

  it('agrupa o número do cartão de quatro em quatro', () => {
    expect(maskCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(maskCardNumber('42424')).toBe('4242 4');
  });

  it('formata a validade do cartão', () => {
    expect(maskExpiry('1230')).toBe('12/30');
    expect(maskExpiry('1')).toBe('1');
  });

  it('formata telefone com nove dígitos', () => {
    expect(maskPhone('11987654321')).toBe('(11) 98765-4321');
    expect(maskPhone('1132654321')).toBe('(11) 3265-4321');
  });

  it('extrai apenas os dígitos', () => {
    expect(onlyDigits('(11) 98765-4321')).toBe('11987654321');
  });
});

describe('formatBusinessDays', () => {
  it('usa singular para um dia', () => {
    expect(formatBusinessDays(1)).toBe('1 dia útil');
    expect(formatBusinessDays(6)).toBe('6 dias úteis');
  });
});

describe('minutesUntil', () => {
  const now = new Date('2026-08-29T12:00:00.000Z');

  it('arredonda para cima os minutos restantes', () => {
    expect(minutesUntil('2026-08-29T12:30:00.000Z', now)).toBe(30);
    expect(minutesUntil('2026-08-29T12:00:30.000Z', now)).toBe(1);
  });

  it('nunca devolve valor negativo depois do vencimento', () => {
    expect(minutesUntil('2026-08-29T11:00:00.000Z', now)).toBe(0);
  });
});

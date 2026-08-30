import { BOLETO_DUE_DAYS, boletoDueDate, buildBoleto, dueDateFactor, mod10 } from './boleto';

describe('mod10', () => {
  it('calcula o dígito verificador com pesos alternados 2 e 1', () => {
    expect(mod10('1234')).toBe(4);
  });

  it('subtrai 9 quando o dobro passa de 9', () => {
    expect(mod10('9999')).toBe(4);
  });

  it('devolve zero quando a soma já é múltipla de 10', () => {
    expect(mod10('0000')).toBe(0);
  });
});

describe('dueDateFactor', () => {
  it('bate com os exemplos publicados pela FEBRABAN', () => {
    expect(dueDateFactor(new Date(Date.UTC(2000, 6, 3)))).toBe(1000);
    expect(dueDateFactor(new Date(Date.UTC(2000, 10, 17)))).toBe(1137);
  });

  it('cresce um a cada dia', () => {
    const dia1 = dueDateFactor(new Date(Date.UTC(2026, 7, 29)));
    const dia2 = dueDateFactor(new Date(Date.UTC(2026, 7, 30)));
    expect(dia2 - dia1).toBe(1);
  });
});

describe('buildBoleto', () => {
  const boleto = buildBoleto({
    amountCents: 24990,
    dueDate: new Date(Date.UTC(2026, 8, 1)),
    documentNumber: 'LS-20260829-A1B2C3',
  });

  it('gera uma linha digitável com 47 dígitos', () => {
    expect(boleto.digitableLineRaw).toHaveLength(47);
    expect(boleto.digitableLine.replace(/\D/g, '')).toHaveLength(47);
  });

  it('formata em cinco campos, como se digita no banco', () => {
    expect(boleto.digitableLine).toMatch(
      /^\d{5}\.\d{5} \d{5}\.\d{6} \d{5}\.\d{6} \d \d{14}$/,
    );
  });

  it('começa com o código do banco e o código da moeda', () => {
    expect(boleto.digitableLineRaw.startsWith('0019')).toBe(true);
  });

  it('carrega o valor em centavos nos dez últimos dígitos', () => {
    expect(boleto.digitableLineRaw.slice(-10)).toBe('0000024990');
  });

  it('carrega o fator de vencimento antes do valor', () => {
    const fator = String(dueDateFactor(new Date(Date.UTC(2026, 8, 1)))).padStart(4, '0');
    expect(boleto.digitableLineRaw.slice(33, 37)).toBe(fator);
  });

  it('cada campo tem dígito verificador módulo 10 correto', () => {
    const raw = boleto.digitableLineRaw;
    expect(mod10(raw.slice(0, 9))).toBe(Number(raw[9]));
    expect(mod10(raw.slice(10, 20))).toBe(Number(raw[20]));
    expect(mod10(raw.slice(21, 31))).toBe(Number(raw[31]));
  });

  it('é determinístico para o mesmo pedido', () => {
    const outra = buildBoleto({
      amountCents: 24990,
      dueDate: new Date(Date.UTC(2026, 8, 1)),
      documentNumber: 'LS-20260829-A1B2C3',
    });
    expect(outra.digitableLineRaw).toBe(boleto.digitableLineRaw);
  });

  it('muda quando o pedido muda', () => {
    const outra = buildBoleto({
      amountCents: 24990,
      dueDate: new Date(Date.UTC(2026, 8, 1)),
      documentNumber: 'LS-20260829-ZZZZZZ',
    });
    expect(outra.digitableLineRaw).not.toBe(boleto.digitableLineRaw);
  });
});

describe('boletoDueDate', () => {
  it('vence em 3 dias corridos', () => {
    const now = new Date('2026-08-29T12:00:00.000Z');
    expect(boletoDueDate(now).toISOString().slice(0, 10)).toBe('2026-09-01');
    expect(BOLETO_DUE_DAYS).toBe(3);
  });
});

import {
  clampToZero,
  formatCents,
  fromCents,
  percentOfCents,
  splitInstallments,
  sumCents,
  toCents,
} from './money';

describe('conversão de centavos', () => {
  it('vai e volta de reais para centavos', () => {
    expect(toCents(59.9)).toBe(5990);
    expect(fromCents(5990)).toBe(59.9);
  });

  it('arredonda a fração de centavo em vez de truncar', () => {
    expect(toCents(0.005)).toBe(1);
    expect(toCents(0.004)).toBe(0);
  });

  it('soma inteiros sem erro de ponto flutuante', () => {
    expect(sumCents([10, 20])).toBe(30);
    expect(fromCents(sumCents([10, 20]))).toBe(0.3);
  });
});

describe('formatCents', () => {
  it('formata como moeda brasileira', () => {
    expect(formatCents(5990)).toMatch(/^R\$\s59,90$/);
    expect(formatCents(0)).toMatch(/^R\$\s0,00$/);
    expect(formatCents(100000)).toMatch(/^R\$\s1\.000,00$/);
  });
});

describe('percentOfCents', () => {
  it('calcula percentual arredondando ao centavo', () => {
    expect(percentOfCents(10000, 10)).toBe(1000);
    expect(percentOfCents(5990, 10)).toBe(599);
    expect(percentOfCents(3333, 25)).toBe(833);
  });
});

describe('clampToZero', () => {
  it('não deixa o total ficar negativo', () => {
    expect(clampToZero(-500)).toBe(0);
    expect(clampToZero(500)).toBe(500);
  });
});

describe('splitInstallments', () => {
  it('divide sem perder centavos, jogando o resto na primeira parcela', () => {
    const parcels = splitInstallments(10000, 3);
    expect(parcels).toEqual([3334, 3333, 3333]);
    expect(sumCents(parcels)).toBe(10000);
  });

  it('devolve o valor inteiro em uma parcela', () => {
    expect(splitInstallments(4999, 1)).toEqual([4999]);
  });

  it('mantém a soma igual ao total em qualquer divisão', () => {
    for (let n = 1; n <= 12; n += 1) {
      expect(sumCents(splitInstallments(49277, n))).toBe(49277);
    }
  });

  it('recusa número de parcelas inválido', () => {
    expect(() => splitInstallments(1000, 0)).toThrow();
    expect(() => splitInstallments(1000, 1.5)).toThrow();
  });
});

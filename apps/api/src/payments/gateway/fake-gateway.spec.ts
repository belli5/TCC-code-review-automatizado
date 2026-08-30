import {
  MIN_INSTALLMENT_CENTS,
  TEST_CARDS,
  authorizeCard,
  isAsynchronousMethod,
  isValidInstallmentCount,
  maxInstallmentsFor,
} from './fake-gateway';
import { isValidCardNumber } from '../../common/validators';

const NOW = new Date('2026-08-29T12:00:00.000Z');

const VALID_CARD = {
  number: '4242 4242 4242 4242',
  holderName: 'gabriel souza',
  expMonth: 12,
  expYear: 2030,
  cvv: '123',
};

describe('authorizeCard — aprovação', () => {
  it('aprova um cartão válido', () => {
    const result = authorizeCard(VALID_CARD, NOW);

    expect(result.approved).toBe(true);
    expect(result.brand).toBe('visa');
    expect(result.last4).toBe('4242');
    expect(result.declineReason).toBeNull();
  });

  it('normaliza o nome do portador para maiúsculas', () => {
    expect(authorizeCard(VALID_CARD, NOW).holderName).toBe('GABRIEL SOUZA');
  });
});

describe('authorizeCard — validações antes do emissor', () => {
  it('recusa número que não passa no Luhn', () => {
    const result = authorizeCard({ ...VALID_CARD, number: '4242424242424243' }, NOW);
    expect(result).toMatchObject({ approved: false, declineReason: 'invalid_number' });
  });

  it('recusa cartão vencido', () => {
    const result = authorizeCard({ ...VALID_CARD, expMonth: 1, expYear: 2020 }, NOW);
    expect(result).toMatchObject({ approved: false, declineReason: 'expired_card' });
  });

  it('recusa CVV com tamanho errado', () => {
    const result = authorizeCard({ ...VALID_CARD, cvv: '12' }, NOW);
    expect(result).toMatchObject({ approved: false, declineReason: 'invalid_cvv' });
  });

  it('reporta o erro mais específico primeiro', () => {
    const result = authorizeCard(
      { ...VALID_CARD, number: '1234567890123456', expMonth: 1, expYear: 2020 },
      NOW,
    );
    expect(result.declineReason).toBe('invalid_number');
  });
});

describe('authorizeCard — cenários simulados pelo final do cartão', () => {
  it('recusa por saldo insuficiente no final 0000', () => {
    const result = authorizeCard({ ...VALID_CARD, number: '4111000000080000' }, NOW);
    expect(result).toMatchObject({ approved: false, declineReason: 'insufficient_funds' });
    expect(result.message).toContain('saldo');
  });

  it('recusa por suspeita de fraude no final 0002', () => {
    const result = authorizeCard({ ...VALID_CARD, number: '5555000000060002' }, NOW);
    expect(result).toMatchObject({ approved: false, declineReason: 'suspected_fraud' });
  });

  it('recusa pelo emissor no final 0069', () => {
    const result = authorizeCard({ ...VALID_CARD, number: '4000000000000069' }, NOW);
    expect(result).toMatchObject({ approved: false, declineReason: 'do_not_honor' });
  });

  it('é determinístico: o mesmo cartão sempre dá o mesmo resultado', () => {
    const first = authorizeCard(VALID_CARD, NOW);
    const second = authorizeCard(VALID_CARD, NOW);
    expect(first).toEqual(second);
  });
});

describe('TEST_CARDS', () => {
  it('todos os cartões documentados passam no Luhn', () => {
    for (const card of TEST_CARDS) {
      expect(isValidCardNumber(card.number)).toBe(true);
    }
  });

  it('cada cartão documentado produz o desfecho anunciado', () => {
    for (const card of TEST_CARDS) {
      const result = authorizeCard({ ...VALID_CARD, number: card.number }, NOW);
      expect(result.approved).toBe(card.outcome === 'Aprovado');
    }
  });
});

describe('parcelamento', () => {
  it('limita as parcelas para nenhuma ficar abaixo do mínimo', () => {
    expect(maxInstallmentsFor(MIN_INSTALLMENT_CENTS)).toBe(1);
    expect(maxInstallmentsFor(6000)).toBe(3);
    expect(maxInstallmentsFor(100000)).toBe(12);
  });

  it('sempre permite ao menos uma parcela, mesmo em valores baixos', () => {
    expect(maxInstallmentsFor(500)).toBe(1);
  });

  it('valida o número de parcelas pedido', () => {
    expect(isValidInstallmentCount(100000, 12)).toBe(true);
    expect(isValidInstallmentCount(100000, 13)).toBe(false);
    expect(isValidInstallmentCount(6000, 4)).toBe(false);
    expect(isValidInstallmentCount(6000, 0)).toBe(false);
  });
});

describe('isAsynchronousMethod', () => {
  it('PIX e boleto esperam confirmação; cartão resolve na hora', () => {
    expect(isAsynchronousMethod('pix')).toBe(true);
    expect(isAsynchronousMethod('boleto')).toBe(true);
    expect(isAsynchronousMethod('credit_card')).toBe(false);
  });
});

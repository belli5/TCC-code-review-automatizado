import {
  ORDER_STATUSES,
  allowedTransitions,
  canCancel,
  canTransition,
  isFinalStatus,
  isOrderStatus,
  nextFulfillmentStep,
  shouldRestock,
} from './order-status';

describe('máquina de estados do pedido', () => {
  it('permite o caminho feliz completo', () => {
    expect(canTransition('awaiting_payment', 'paid')).toBe(true);
    expect(canTransition('paid', 'processing')).toBe(true);
    expect(canTransition('processing', 'shipped')).toBe(true);
    expect(canTransition('shipped', 'delivered')).toBe(true);
  });

  it('impede pular etapas', () => {
    expect(canTransition('awaiting_payment', 'shipped')).toBe(false);
    expect(canTransition('awaiting_payment', 'delivered')).toBe(false);
    expect(canTransition('paid', 'delivered')).toBe(false);
  });

  it('impede voltar no tempo', () => {
    expect(canTransition('delivered', 'shipped')).toBe(false);
    expect(canTransition('shipped', 'paid')).toBe(false);
  });

  it('trata entregue, cancelado e recusado como estados finais', () => {
    expect(isFinalStatus('delivered')).toBe(true);
    expect(isFinalStatus('cancelled')).toBe(true);
    expect(isFinalStatus('payment_failed')).toBe(true);
    expect(isFinalStatus('paid')).toBe(false);
  });

  it('só cancela enquanto o pedido não saiu para entrega', () => {
    expect(canCancel('awaiting_payment')).toBe(true);
    expect(canCancel('paid')).toBe(true);
    expect(canCancel('processing')).toBe(true);
    expect(canCancel('shipped')).toBe(false);
    expect(canCancel('delivered')).toBe(false);
  });

  it('devolve o próximo passo da esteira de fulfillment', () => {
    expect(nextFulfillmentStep('paid')).toBe('processing');
    expect(nextFulfillmentStep('processing')).toBe('shipped');
    expect(nextFulfillmentStep('shipped')).toBe('delivered');
    expect(nextFulfillmentStep('awaiting_payment')).toBeNull();
    expect(nextFulfillmentStep('delivered')).toBeNull();
  });

  it('devolve o estoque quando o pedido morre sem ser entregue', () => {
    expect(shouldRestock('cancelled')).toBe(true);
    expect(shouldRestock('payment_failed')).toBe(true);
    expect(shouldRestock('delivered')).toBe(false);
    expect(shouldRestock('paid')).toBe(false);
  });

  it('reconhece apenas os status conhecidos', () => {
    expect(isOrderStatus('paid')).toBe(true);
    expect(isOrderStatus('em_transito')).toBe(false);
  });

  it('nunca permite uma transição para fora da lista de status', () => {
    for (const status of ORDER_STATUSES) {
      for (const target of allowedTransitions(status)) {
        expect(ORDER_STATUSES).toContain(target);
      }
    }
  });
});

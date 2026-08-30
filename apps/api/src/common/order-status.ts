
export const ORDER_STATUSES = [
  'awaiting_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'payment_failed',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  awaiting_payment: ['paid', 'payment_failed', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  payment_failed: [],
};

const NEXT_FULFILLMENT_STEP: Partial<Record<OrderStatus, OrderStatus>> = {
  paid: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Aguardando pagamento',
  paid: 'Pagamento aprovado',
  processing: 'Em separação',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  payment_failed: 'Pagamento recusado',
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[from];
}

export function isFinalStatus(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export function nextFulfillmentStep(status: OrderStatus): OrderStatus | null {
  return NEXT_FULFILLMENT_STEP[status] ?? null;
}

export function canCancel(status: OrderStatus): boolean {
  return canTransition(status, 'cancelled');
}

export function shouldRestock(status: OrderStatus): boolean {
  return status === 'cancelled' || status === 'payment_failed';
}

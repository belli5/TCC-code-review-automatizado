import { OrderStatus } from '../lib/api';

const STATUS_TONE: Record<OrderStatus, string> = {
  awaiting_payment: 'warning',
  paid: 'success',
  processing: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'muted',
  payment_failed: 'danger',
};

export function StatusBadge({ status, label }: { status: OrderStatus; label: string }) {
  return <span className={`status status-${STATUS_TONE[status] ?? 'muted'}`}>{label}</span>;
}

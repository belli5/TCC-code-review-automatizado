'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, Order, OrderStatus, api } from '../../../lib/api';
import { formatCents, formatDateTime } from '../../../lib/format';
import { StatusBadge } from '../../../components/StatusBadge';

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'awaiting_payment', label: 'Aguardando pagamento' },
  { value: 'paid', label: 'Pagos' },
  { value: 'processing', label: 'Em separação' },
  { value: 'shipped', label: 'Enviados' },
  { value: 'delivered', label: 'Entregues' },
  { value: 'cancelled', label: 'Cancelados' },
  { value: 'payment_failed', label: 'Recusados' },
];

const NEXT_ACTION: Partial<Record<OrderStatus, string>> = {
  paid: 'Separar',
  processing: 'Despachar',
  shipped: 'Marcar entregue',
};

export default function AdminOrdersPage() {
  const [status, setStatus] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.orders({ status: status || undefined, pageSize: 100 });
      setOrders(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os pedidos.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function advance(order: Order) {
    setBusyId(order.id);
    setError(null);
    try {
      const updated = await api.advanceOrder(order.id);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível avançar o pedido.');
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(order: Order) {
    setBusyId(order.id);
    setError(null);
    try {
      const updated = await api.cancelOrder(order.id, 'Cancelado pela loja.');
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível cancelar o pedido.');
    } finally {
      setBusyId(null);
    }
  }

  const revenueCents = orders
    .filter((order) => !['cancelled', 'payment_failed'].includes(order.status))
    .reduce((sum, order) => sum + order.totals.totalCents, 0);

  return (
    <div className="admin-page">
      <header className="section-header">
        <h1 className="section-title">Pedidos</h1>
        <span className="muted">
          {orders.length} pedido(s) · {formatCents(revenueCents)} em vendas válidas
        </span>
      </header>

      <p className="notice notice-info">
        Painel de demonstração, sem autenticação. Aqui o lojista empurra o pedido pela esteira:
        separar → despachar (gera o rastreio) → marcar como entregue.
      </p>

      <div className="chips">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={status === filter.value ? 'chip is-active' : 'chip'}
            onClick={() => setStatus(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="muted">Carregando...</p>}

      {!loading && orders.length === 0 && (
        <div className="empty">
          <p>Nenhum pedido com esse filtro.</p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Data</th>
                <th>Status</th>
                <th className="text-right">Total</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const action = NEXT_ACTION[order.status];
                return (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/pedido/${order.id}`}>{order.number}</Link>
                      {order.shipping.trackingCode && (
                        <div className="muted">{order.shipping.trackingCode}</div>
                      )}
                    </td>
                    <td>
                      {order.customer.name}
                      <div className="muted">{order.customer.email}</div>
                    </td>
                    <td className="muted">{formatDateTime(order.createdAt)}</td>
                    <td>
                      <StatusBadge status={order.status} label={order.statusLabel} />
                    </td>
                    <td className="text-right">{formatCents(order.totals.totalCents)}</td>
                    <td>
                      <div className="row-actions">
                        {action && (
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => advance(order)}
                            disabled={busyId === order.id}
                          >
                            {action}
                          </button>
                        )}
                        {order.canCancel && (
                          <button
                            type="button"
                            className="button-ghost"
                            onClick={() => cancel(order)}
                            disabled={busyId === order.id}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

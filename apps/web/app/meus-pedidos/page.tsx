'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, Order, api } from '../../lib/api';
import { formatCents, formatDateTime } from '../../lib/format';
import { StatusBadge } from '../../components/StatusBadge';
import { rememberedEmail } from '../../lib/my-orders';

export default function MyOrdersPage() {
  const [email, setEmail] = useState('');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = rememberedEmail();
    if (saved) {
      setEmail(saved);
      search(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(target: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await api.orders({ email: target, pageSize: 50 });
      setOrders(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível buscar seus pedidos.');
      setOrders(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="orders-page">
      <h1>Meus pedidos</h1>
      <p className="muted">
        Esta loja não tem login. Informe o e-mail usado na compra para ver seus pedidos.
      </p>

      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          search(email);
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seu@email.com"
          aria-label="E-mail usado na compra"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      {orders && orders.length === 0 && (
        <div className="empty">
          <p>Nenhum pedido encontrado para esse e-mail.</p>
          <Link href="/busca" className="button">
            Ver produtos
          </Link>
        </div>
      )}

      {orders && orders.length > 0 && (
        <ul className="order-list">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/pedido/${order.id}`} className="order-row">
                <div>
                  <strong>{order.number}</strong>
                  <span className="muted">{formatDateTime(order.createdAt)}</span>
                </div>
                <div className="order-row-items">
                  {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                </div>
                <StatusBadge status={order.status} label={order.statusLabel} />
                <strong>{formatCents(order.totals.totalCents)}</strong>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

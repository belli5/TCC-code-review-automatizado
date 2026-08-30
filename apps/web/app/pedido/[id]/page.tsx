'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, Order, api } from '../../../lib/api';
import {
  formatBusinessDays,
  formatCents,
  formatDate,
  formatDateTime,
  minutesUntil,
} from '../../../lib/format';
import { StatusBadge } from '../../../components/StatusBadge';
import { OrderTimeline } from '../../../components/OrderTimeline';
import { QrCodePreview } from '../../../components/QrCodePreview';
import { CopyButton } from '../../../components/CopyButton';

export default function OrderPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrder(await api.order(params.id));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o pedido.');
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmPayment() {
    if (!order?.payment) return;
    setWorking(true);
    setActionError(null);
    try {
      setOrder(await api.confirmPayment(order.payment.id));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Falha ao confirmar o pagamento.');
    } finally {
      setWorking(false);
    }
  }

  async function cancelOrder() {
    if (!order) return;
    setWorking(true);
    setActionError(null);
    try {
      setOrder(await api.cancelOrder(order.id, 'Cancelado pelo cliente na tela do pedido.'));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Falha ao cancelar o pedido.');
    } finally {
      setWorking(false);
    }
  }

  if (error) {
    return (
      <div className="empty">
        <h2>{error}</h2>
        <Link href="/meus-pedidos" className="button">
          Ver meus pedidos
        </Link>
      </div>
    );
  }

  if (!order) {
    return <div className="empty">Carregando pedido...</div>;
  }

  const payment = order.payment;
  const awaitingPix = payment?.method === 'pix' && payment.status === 'pending';
  const awaitingBoleto = payment?.method === 'boleto' && payment.status === 'pending';

  return (
    <div className="order-page">
      <header className="order-header">
        <div>
          <span className="muted">Pedido</span>
          <h1>{order.number}</h1>
          <span className="muted">Feito em {formatDateTime(order.createdAt)}</span>
        </div>
        <StatusBadge status={order.status} label={order.statusLabel} />
      </header>

      {order.status === 'paid' && (
        <div className="notice notice-success">
          <strong>Pagamento aprovado!</strong> Já estamos preparando seu pedido.
        </div>
      )}

      {order.status === 'payment_failed' && payment && (
        <div className="notice notice-danger">
          <strong>Pagamento recusado.</strong> {payment.declineMessage}
          <div className="notice-actions">
            <Link href="/busca" className="button-secondary">
              Escolher os produtos de novo
            </Link>
          </div>
        </div>
      )}

      {awaitingPix && payment?.pix && (
        <section className="payment-panel">
          <h2>Pague com PIX</h2>
          {payment.pix.expired ? (
            <p className="error-text">
              Este código expirou. Faça um novo pedido para gerar outro QR Code.
            </p>
          ) : (
            <p className="muted">
              O código expira em {minutesUntil(payment.pix.expiresAt)} minutos.
            </p>
          )}

          <div className="pix-grid">
            <QrCodePreview value={payment.pix.code} />

            <div className="pix-code">
              <label htmlFor="pix-copia-cola">PIX copia e cola</label>
              <textarea id="pix-copia-cola" readOnly rows={4} value={payment.pix.code} />
              <div className="form-actions">
                <CopyButton value={payment.pix.code} label="Copiar código" />
                <button type="button" onClick={confirmPayment} disabled={working}>
                  {working ? 'Confirmando...' : 'Simular pagamento'}
                </button>
              </div>
              <p className="hint">
                O QR Code acima é uma representação visual. O código copia-e-cola segue o padrão
                EMV do Banco Central, com CRC16 — mas a chave é fictícia, então nenhum banco
                real vai reconhecê-lo. O botão &ldquo;Simular pagamento&rdquo; faz o papel do
                webhook que o banco chamaria.
              </p>
            </div>
          </div>
        </section>
      )}

      {awaitingBoleto && payment?.boleto && (
        <section className="payment-panel">
          <h2>Boleto bancário</h2>
          <p className="muted">Vencimento em {formatDate(payment.boleto.dueDate)}.</p>
          <p className="digitable-line">{payment.boleto.digitableLine}</p>
          <div className="form-actions">
            <CopyButton value={payment.boleto.digitableLine} label="Copiar linha digitável" />
            <button type="button" onClick={confirmPayment} disabled={working}>
              {working ? 'Confirmando...' : 'Simular compensação'}
            </button>
          </div>
        </section>
      )}

      {actionError && <p className="error-text">{actionError}</p>}

      <div className="order-grid">
        <section className="panel">
          <h2>Acompanhamento</h2>
          <OrderTimeline timeline={order.timeline} status={order.status} />

          {order.shipping.trackingCode && (
            <p className="tracking">
              Código de rastreio: <strong>{order.shipping.trackingCode}</strong>
            </p>
          )}
        </section>

        <section className="panel">
          <h2>Resumo</h2>

          <ul className="order-items">
            {order.items.map((item) => (
              <li key={item.id}>
                <Image src={item.image} alt={item.name} width={56} height={56} />
                <div>
                  <strong>{item.name}</strong>
                  <span className="muted">
                    {item.quantity} x {formatCents(item.unitPriceCents)}
                  </span>
                </div>
                <span>{formatCents(item.subtotalCents)}</span>
              </li>
            ))}
          </ul>

          <dl className="totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCents(order.totals.subtotalCents)}</dd>
            </div>
            {order.totals.discountCents > 0 && (
              <div className="totals-discount">
                <dt>Desconto ({order.coupon?.code})</dt>
                <dd>−{formatCents(order.totals.discountCents)}</dd>
              </div>
            )}
            <div>
              <dt>Frete ({order.shipping.name})</dt>
              <dd>
                {order.totals.shippingCents === 0 ? (
                  <span className="free-tag">Grátis</span>
                ) : (
                  formatCents(order.totals.shippingCents)
                )}
              </dd>
            </div>
            <div className="totals-final">
              <dt>Total</dt>
              <dd>{formatCents(order.totals.totalCents)}</dd>
            </div>
          </dl>

          {payment && (
            <p className="muted">
              {payment.method === 'credit_card' &&
                `Cartão ${payment.card?.brand} final ${payment.card?.last4} · ${payment.installments}x de ${formatCents(payment.installmentCents)}`}
              {payment.method === 'pix' && 'Pagamento via PIX'}
              {payment.method === 'boleto' && 'Pagamento via boleto'}
            </p>
          )}
        </section>

        <section className="panel">
          <h2>Entrega</h2>
          <p>
            <strong>{order.customer.name}</strong>
            <br />
            {order.address.street}, {order.address.number}
            {order.address.complement ? ` — ${order.address.complement}` : ''}
            <br />
            {order.address.district} · {order.address.city}/{order.address.state}
            <br />
            CEP {order.address.zipCode}
          </p>
          <p className="muted">
            {order.shipping.name} — {formatBusinessDays(order.shipping.etaDays)}
          </p>
        </section>
      </div>

      <footer className="order-footer">
        <Link href="/meus-pedidos" className="button-ghost">
          Ver todos os meus pedidos
        </Link>
        {order.canCancel && (
          <button type="button" className="button-danger" onClick={cancelOrder} disabled={working}>
            Cancelar pedido
          </button>
        )}
      </footer>
    </div>
  );
}

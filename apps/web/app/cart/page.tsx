'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useCart } from '../../components/CartContext';
import { ApiError, CouponApplication, CouponListItem, ShippingQuote, api } from '../../lib/api';
import { formatBusinessDays, formatCents, maskZipCode } from '../../lib/format';
import { loadDraft, saveDraft } from '../../lib/checkout-draft';

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotalCents, checkoutItems } = useCart();

  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponApplication | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<CouponListItem[]>([]);

  const [zipCode, setZipCode] = useState('');
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    if (draft.zipCode) setZipCode(draft.zipCode);
    if (draft.couponCode) setCouponCode(draft.couponCode);
    api.coupons().then(setAvailableCoupons).catch(() => setAvailableCoupons([]));
  }, []);

  useEffect(() => {
    if (!coupon) return;
    api
      .validateCoupon(coupon.code, subtotalCents)
      .then(setCoupon)
      .catch((err) => {
        setCoupon(null);
        setCouponError(err instanceof ApiError ? err.message : 'Cupom não é mais válido.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalCents]);

  async function applyCoupon(event: React.FormEvent) {
    event.preventDefault();
    setCouponError(null);
    try {
      const applied = await api.validateCoupon(couponCode, subtotalCents);
      setCoupon(applied);
      saveDraft({ couponCode: applied.code });
    } catch (err) {
      setCoupon(null);
      setCouponError(err instanceof ApiError ? err.message : 'Não foi possível aplicar o cupom.');
    }
  }

  async function calculateShipping(event: React.FormEvent) {
    event.preventDefault();
    setLoadingShipping(true);
    setShippingError(null);
    try {
      const result = await api.quoteShipping(zipCode, checkoutItems);
      setQuote(result);
      setSelectedShipping(result.options[0]?.id ?? null);
      saveDraft({ zipCode, shippingServiceId: result.options[0]?.id });
    } catch (err) {
      setQuote(null);
      setShippingError(err instanceof ApiError ? err.message : 'Não foi possível calcular o frete.');
    } finally {
      setLoadingShipping(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="empty">
        <h2>Seu carrinho está vazio</h2>
        <p>Que tal dar uma olhada no catálogo?</p>
        <Link href="/busca" className="button">
          Ver produtos
        </Link>
      </div>
    );
  }

  const option = quote?.options.find((o) => o.id === selectedShipping) ?? null;
  const discountCents = coupon?.discountCents ?? 0;
  const shippingCents = option ? (coupon?.freeShipping ? 0 : option.priceCents) : 0;
  const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCents;

  return (
    <div className="cart-layout">
      <div>
        <h1>Carrinho</h1>

        <ul className="cart-items">
          {items.map((item) => (
            <li key={item.productId} className="cart-item">
              <Image
                src={item.image}
                alt={item.name}
                width={80}
                height={80}
                className="cart-item-image"
              />

              <div className="cart-item-info">
                <Link href={`/product/${item.slug}`}>
                  <strong>{item.name}</strong>
                </Link>
                <span className="muted">{formatCents(item.priceCents)} cada</span>
                {item.quantity >= item.maxStock && (
                  <span className="warning-text">Máximo disponível em estoque</span>
                )}
              </div>

              <div className="quantity-controls">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  aria-label={`Diminuir quantidade de ${item.name}`}
                >
                  −
                </button>
                <span className="quantity-value">{item.quantity}</span>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  aria-label={`Aumentar quantidade de ${item.name}`}
                  disabled={item.quantity >= item.maxStock}
                >
                  +
                </button>
              </div>

              <div className="cart-item-total">
                <strong>{formatCents(item.priceCents * item.quantity)}</strong>
                <button
                  type="button"
                  className="button-ghost"
                  onClick={() => removeItem(item.productId)}
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="summary">
        <h2>Resumo</h2>

        <form onSubmit={applyCoupon} className="summary-block">
          <label htmlFor="coupon">Cupom de desconto</label>
          <div className="inline-form">
            <input
              id="coupon"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              placeholder="BEMVINDO10"
            />
            <button type="submit" className="button-secondary">
              Aplicar
            </button>
          </div>
          {couponError && <p className="error-text">{couponError}</p>}
          {coupon && (
            <p className="success-text">
              {coupon.code} aplicado — {coupon.description}
            </p>
          )}
          {availableCoupons.length > 0 && !coupon && (
            <ul className="coupon-hints">
              {availableCoupons.map((c) => (
                <li key={c.code}>
                  <button type="button" className="link-button" onClick={() => setCouponCode(c.code)}>
                    {c.code}
                  </button>
                  <span className="muted"> — {c.description}</span>
                </li>
              ))}
            </ul>
          )}
        </form>

        <form onSubmit={calculateShipping} className="summary-block">
          <label htmlFor="cep">Calcular frete</label>
          <div className="inline-form">
            <input
              id="cep"
              value={zipCode}
              onChange={(event) => setZipCode(maskZipCode(event.target.value))}
              placeholder="00000-000"
              inputMode="numeric"
            />
            <button type="submit" className="button-secondary" disabled={loadingShipping}>
              {loadingShipping ? '...' : 'Calcular'}
            </button>
          </div>
          {shippingError && <p className="error-text">{shippingError}</p>}

          {quote && (
            <>
              {quote.missingForFreeShippingCents > 0 && (
                <p className="muted">
                  Faltam {formatCents(quote.missingForFreeShippingCents)} para o frete grátis.
                </p>
              )}
              <ul className="shipping-options">
                {quote.options.map((o) => (
                  <li key={o.id}>
                    <label className="radio">
                      <input
                        type="radio"
                        name="shipping"
                        checked={selectedShipping === o.id}
                        onChange={() => {
                          setSelectedShipping(o.id);
                          saveDraft({ shippingServiceId: o.id });
                        }}
                      />
                      <span>
                        <strong>{o.name}</strong>
                        <span className="muted"> · {formatBusinessDays(o.etaDays)}</span>
                      </span>
                      <span className="shipping-price">
                        {coupon?.freeShipping || o.freeShippingApplied ? (
                          <span className="free-tag">Grátis</span>
                        ) : (
                          formatCents(o.priceCents)
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </form>

        <dl className="totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{formatCents(subtotalCents)}</dd>
          </div>
          {discountCents > 0 && (
            <div className="totals-discount">
              <dt>Desconto ({coupon?.code})</dt>
              <dd>−{formatCents(discountCents)}</dd>
            </div>
          )}
          <div>
            <dt>Frete</dt>
            <dd>
              {option ? (
                shippingCents === 0 ? (
                  <span className="free-tag">Grátis</span>
                ) : (
                  formatCents(shippingCents)
                )
              ) : (
                <span className="muted">Informe o CEP</span>
              )}
            </dd>
          </div>
          <div className="totals-final">
            <dt>Total</dt>
            <dd>{formatCents(totalCents)}</dd>
          </div>
        </dl>

        <Link href="/checkout" className="button button-block">
          Finalizar compra
        </Link>
        <Link href="/busca" className="button-ghost button-block">
          Continuar comprando
        </Link>
      </aside>
    </div>
  );
}

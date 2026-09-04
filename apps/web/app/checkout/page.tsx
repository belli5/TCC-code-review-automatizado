'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from '../../components/CartContext';
import { ApiError, CouponApplication, ShippingQuote, api } from '../../lib/api';
import {
  formatBusinessDays,
  formatCents,
  maskCpf,
  maskPhone,
  maskZipCode,
  onlyDigits,
} from '../../lib/format';
import { loadDraft, clearDraft } from '../../lib/checkout-draft';
import { rememberOrder } from '../../lib/my-orders';
import { StepIndicator } from './StepIndicator';
import { PaymentForm, PaymentState } from './PaymentForm';

const EMPTY_PAYMENT: PaymentState = {
  method: 'pix',
  installments: 1,
  card: { number: '', holderName: '', expiry: '', cvv: '' },
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotalCents, checkoutItems, clearCart } = useCart();

  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState({ name: '', email: '', document: '', phone: '' });
  const [address, setAddress] = useState({
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
  });
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [shippingServiceId, setShippingServiceId] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponApplication | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentState>(EMPTY_PAYMENT);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    if (draft.zipCode) setAddress((prev) => ({ ...prev, zipCode: draft.zipCode! }));
    if (draft.couponCode) setCouponCode(draft.couponCode);
    if (draft.shippingServiceId) setShippingServiceId(draft.shippingServiceId);
  }, []);

  useEffect(() => {
    if (onlyDigits(address.zipCode).length !== 8 || checkoutItems.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    api
      .quoteShipping(address.zipCode, checkoutItems)
      .then((result) => {
        if (cancelled) return;
        setQuote(result);
        setShippingServiceId((current) =>
          current && result.options.some((o) => o.id === current)
            ? current
            : (result.options[0]?.id ?? null),
        );
      })
      .catch(() => !cancelled && setQuote(null))
      .finally(() => !cancelled && setQuoting(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address.zipCode, subtotalCents]);

  const option = quote?.options.find((o) => o.id === shippingServiceId) ?? null;
  const discountCents = coupon?.discountCents ?? 0;
  const shippingCents = option ? (coupon?.freeShipping ? 0 : option.priceCents) : 0;
  const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCents;

  async function applyCoupon() {
    setCouponError(null);
    if (!couponCode.trim()) {
      setCoupon(null);
      return;
    }
    try {
      setCoupon(await api.validateCoupon(couponCode, subtotalCents));
    } catch (err) {
      setCoupon(null);
      setCouponError(err instanceof ApiError ? err.message : 'Cupom inválido.');
    }
  }

  function validateStep(target: number): string | null {
    if (target > 1) {
      if (customer.name.trim().length < 3) return 'Informe seu nome completo.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customer.email)) return 'Informe um e-mail válido.';
    }
    if (target > 2) {
      if (onlyDigits(address.zipCode).length !== 8) return 'Informe um CEP válido.';
      if (!address.street.trim()) return 'Informe o logradouro.';
      if (!address.number.trim()) return 'Informe o número.';
      if (!address.district.trim()) return 'Informe o bairro.';
      if (!address.city.trim()) return 'Informe a cidade.';
      if (address.state.trim().length !== 2) return 'Informe a sigla do estado (2 letras).';
      if (!shippingServiceId) return 'Escolha uma forma de entrega.';
    }
    if (target > 3 && payment.method === 'credit_card') {
      if (onlyDigits(payment.card.number).length < 13) return 'Informe o número do cartão.';
      if (payment.card.holderName.trim().length < 3) return 'Informe o nome impresso no cartão.';
      if (onlyDigits(payment.card.expiry).length !== 4) return 'Informe a validade (MM/AA).';
      if (payment.card.cvv.length < 3) return 'Informe o CVV.';
    }
    return null;
  }

  function goTo(target: number) {
    const error = target > step ? validateStep(target) : null;
    setFieldError(error);
    if (!error) setStep(target);
  }

  async function handleSubmit() {
    const error = validateStep(4);
    if (error) {
      setFieldError(error);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const [expMonth, expYear] = payment.card.expiry.split('/');

    try {
      const order = await api.checkout({
        customer: {
          name: customer.name.trim(),
          email: customer.email.trim(),
          document: customer.document ? onlyDigits(customer.document) : undefined,
          phone: customer.phone ? onlyDigits(customer.phone) : undefined,
        },
        address: {
          zipCode: address.zipCode,
          street: address.street.trim(),
          number: address.number.trim(),
          complement: address.complement.trim() || undefined,
          district: address.district.trim(),
          city: address.city.trim(),
          state: address.state.trim().toUpperCase(),
        },
        items: checkoutItems,
        shippingServiceId,
        couponCode: coupon?.code,
        payment:
          payment.method === 'credit_card'
            ? {
                method: 'credit_card',
                installments: payment.installments,
                card: {
                  number: onlyDigits(payment.card.number),
                  holderName: payment.card.holderName.trim(),
                  expMonth: Number(expMonth),
                  expYear: 2000 + Number(expYear),
                  cvv: payment.card.cvv,
                },
              }
            : { method: payment.method },
      });

      rememberOrder(order.id, order.customer.email);
      clearCart();
      clearDraft();
      router.push(`/pedido/${order.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : 'Não foi possível finalizar o pedido.',
      );
      setSubmitting(false);
    }
  }

  if (items.length === 0 && !submitting) {
    return (
      <div className="empty">
        <h2>Seu carrinho está vazio</h2>
        <Link href="/busca" className="button">
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-layout">
      <div>
        <h1>Finalizar compra</h1>
        <StepIndicator current={step} onGoTo={goTo} />

        {step === 1 && (
          <section className="checkout-step">
            <h2>Seus dados</h2>
            <div className="form-group">
              <label htmlFor="name">Nome completo</label>
              <input
                id="name"
                value={customer.name}
                onChange={(event) => setCustomer({ ...customer, name: event.target.value })}
                autoComplete="name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={customer.email}
                onChange={(event) => setCustomer({ ...customer, email: event.target.value })}
                autoComplete="email"
              />
              <span className="hint">Usamos para você acompanhar o pedido depois.</span>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="document">CPF (opcional)</label>
                <input
                  id="document"
                  value={customer.document}
                  onChange={(event) =>
                    setCustomer({ ...customer, document: maskCpf(event.target.value) })
                  }
                  inputMode="numeric"
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Telefone (opcional)</label>
                <input
                  id="phone"
                  value={customer.phone}
                  onChange={(event) =>
                    setCustomer({ ...customer, phone: maskPhone(event.target.value) })
                  }
                  inputMode="numeric"
                />
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="checkout-step">
            <h2>Entrega</h2>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="zip">CEP</label>
                <input
                  id="zip"
                  value={address.zipCode}
                  onChange={(event) =>
                    setAddress({ ...address, zipCode: maskZipCode(event.target.value) })
                  }
                  placeholder="00000-000"
                  inputMode="numeric"
                />
              </div>
              <div className="form-group form-grow">
                <label htmlFor="street">Logradouro</label>
                <input
                  id="street"
                  value={address.street}
                  onChange={(event) => setAddress({ ...address, street: event.target.value })}
                  autoComplete="address-line1"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="number">Número</label>
                <input
                  id="number"
                  value={address.number}
                  onChange={(event) => setAddress({ ...address, number: event.target.value })}
                />
              </div>
              <div className="form-group form-grow">
                <label htmlFor="complement">Complemento</label>
                <input
                  id="complement"
                  value={address.complement}
                  onChange={(event) => setAddress({ ...address, complement: event.target.value })}
                  placeholder="Apto, bloco..."
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group form-grow">
                <label htmlFor="district">Bairro</label>
                <input
                  id="district"
                  value={address.district}
                  onChange={(event) => setAddress({ ...address, district: event.target.value })}
                />
              </div>
              <div className="form-group form-grow">
                <label htmlFor="city">Cidade</label>
                <input
                  id="city"
                  value={address.city}
                  onChange={(event) => setAddress({ ...address, city: event.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="state">UF</label>
                <input
                  id="state"
                  maxLength={2}
                  value={address.state}
                  onChange={(event) =>
                    setAddress({ ...address, state: event.target.value.toUpperCase() })
                  }
                />
              </div>
            </div>

            <h3>Forma de entrega</h3>
            {quoting && <p className="muted">Calculando frete...</p>}
            {!quoting && !quote && (
              <p className="muted">Preencha o CEP para ver as opções de entrega.</p>
            )}
            {quote && (
              <ul className="shipping-options">
                {quote.options.map((o) => (
                  <li key={o.id}>
                    <label className="radio">
                      <input
                        type="radio"
                        name="shipping"
                        checked={shippingServiceId === o.id}
                        onChange={() => setShippingServiceId(o.id)}
                      />
                      <span>
                        <strong>{o.name}</strong>
                        <span className="muted"> · {o.description}</span>
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
            )}
          </section>
        )}

        {step === 3 && (
          <section className="checkout-step">
            <h2>Pagamento</h2>
            <PaymentForm value={payment} onChange={setPayment} totalCents={totalCents} />
          </section>
        )}

        {step === 4 && (
          <section className="checkout-step">
            <h2>Revise seu pedido</h2>

            <div className="review-block">
              <h3>Entrega</h3>
              <p>
                {customer.name} · {customer.email}
              </p>
              <p>
                {address.street}, {address.number}
                {address.complement ? ` — ${address.complement}` : ''} · {address.district} ·{' '}
                {address.city}/{address.state} · CEP {address.zipCode}
              </p>
              {option && (
                <p className="muted">
                  {option.name} — {formatBusinessDays(option.etaDays)}
                </p>
              )}
            </div>

            <div className="review-block">
              <h3>Pagamento</h3>
              {payment.method === 'credit_card' && (
                <p>
                  Cartão final {onlyDigits(payment.card.number).slice(-4)} · {payment.installments}x
                  de {formatCents(Math.floor(totalCents / payment.installments))}
                </p>
              )}
              {payment.method === 'pix' && <p>PIX — QR Code gerado após a confirmação</p>}
              {payment.method === 'boleto' && <p>Boleto — vencimento em 3 dias</p>}
            </div>

            <div className="review-block">
              <h3>Itens</h3>
              <ul className="review-items">
                {items.map((item) => (
                  <li key={item.productId}>
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span>{formatCents(item.priceCents * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {submitError && <p className="error-text">{submitError}</p>}
          </section>
        )}

        {fieldError && <p className="error-text">{fieldError}</p>}

        <div className="checkout-actions">
          {step > 1 && (
            <button type="button" className="button-secondary" onClick={() => setStep(step - 1)}>
              Voltar
            </button>
          )}
          {step < 4 ? (
            <button type="button" onClick={() => goTo(step + 1)}>
              Continuar
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Processando...' : `Pagar ${formatCents(totalCents)}`}
            </button>
          )}
        </div>
      </div>

      <aside className="summary">
        <h2>Resumo</h2>

        <ul className="summary-items">
          {items.map((item) => (
            <li key={item.productId}>
              <span>
                {item.quantity}x {item.name}
              </span>
              <span>{formatCents(item.priceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="summary-block">
          <label htmlFor="checkout-coupon">Cupom</label>
          <div className="inline-form">
            <input
              id="checkout-coupon"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              placeholder="BEMVINDO10"
            />
            <button type="button" className="button-secondary" onClick={applyCoupon}>
              Aplicar
            </button>
          </div>
          {couponError && <p className="error-text">{couponError}</p>}
          {coupon && <p className="success-text">{coupon.description}</p>}
        </div>

        <dl className="totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{formatCents(subtotalCents)}</dd>
          </div>
          {discountCents > 0 && (
            <div className="totals-discount">
              <dt>Desconto</dt>
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
                <span className="muted">—</span>
              )}
            </dd>
          </div>
          <div className="totals-final">
            <dt>Total</dt>
            <dd>{formatCents(totalCents)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

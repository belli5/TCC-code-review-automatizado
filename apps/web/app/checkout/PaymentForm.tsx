'use client';

import { useEffect, useState } from 'react';
import { PaymentMethod, TestCard, api } from '../../lib/api';
import { formatCents, maskCardNumber, maskExpiry, onlyDigits } from '../../lib/format';

export interface CardState {
  number: string;
  holderName: string;
  expiry: string;
  cvv: string;
}

export interface PaymentState {
  method: PaymentMethod;
  installments: number;
  card: CardState;
}

const METHODS: { id: PaymentMethod; label: string; hint: string }[] = [
  { id: 'credit_card', label: 'Cartão de crédito', hint: 'Aprovação na hora, em até 12x' },
  { id: 'pix', label: 'PIX', hint: 'Confirmação em segundos' },
  { id: 'boleto', label: 'Boleto', hint: 'Compensa em até 2 dias úteis' },
];

function installmentOptions(totalCents: number): number[] {
  const max = Math.max(1, Math.min(12, Math.floor(totalCents / 2000)));
  return Array.from({ length: max }, (_, index) => index + 1);
}

export function PaymentForm({
  value,
  onChange,
  totalCents,
}: {
  value: PaymentState;
  onChange: (next: PaymentState) => void;
  totalCents: number;
}) {
  const [testCards, setTestCards] = useState<TestCard[]>([]);

  useEffect(() => {
    api.testCards().then(setTestCards).catch(() => setTestCards([]));
  }, []);

  const setCard = (patch: Partial<CardState>) =>
    onChange({ ...value, card: { ...value.card, ...patch } });

  return (
    <div className="payment-form">
      <div className="method-picker">
        {METHODS.map((method) => (
          <label
            key={method.id}
            className={value.method === method.id ? 'method is-active' : 'method'}
          >
            <input
              type="radio"
              name="payment-method"
              checked={value.method === method.id}
              onChange={() => onChange({ ...value, method: method.id })}
            />
            <strong>{method.label}</strong>
            <span className="muted">{method.hint}</span>
          </label>
        ))}
      </div>

      {value.method === 'credit_card' && (
        <div className="card-fields">
          <div className="form-group">
            <label htmlFor="card-number">Número do cartão</label>
            <input
              id="card-number"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="0000 0000 0000 0000"
              value={value.card.number}
              onChange={(event) => setCard({ number: maskCardNumber(event.target.value) })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="card-holder">Nome impresso no cartão</label>
            <input
              id="card-holder"
              autoComplete="cc-name"
              placeholder="COMO ESTÁ NO CARTÃO"
              value={value.card.holderName}
              onChange={(event) => setCard({ holderName: event.target.value.toUpperCase() })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="card-expiry">Validade</label>
              <input
                id="card-expiry"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/AA"
                value={value.card.expiry}
                onChange={(event) => setCard({ expiry: maskExpiry(event.target.value) })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="card-cvv">CVV</label>
              <input
                id="card-cvv"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                value={value.card.cvv}
                onChange={(event) => setCard({ cvv: onlyDigits(event.target.value).slice(0, 4) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="installments">Parcelamento</label>
            <select
              id="installments"
              value={value.installments}
              onChange={(event) => onChange({ ...value, installments: Number(event.target.value) })}
            >
              {installmentOptions(totalCents).map((n) => (
                <option key={n} value={n}>
                  {n}x de {formatCents(Math.floor(totalCents / n))} sem juros
                </option>
              ))}
            </select>
          </div>

          {testCards.length > 0 && (
            <details className="test-cards">
              <summary>Cartões de teste</summary>
              <p className="muted">
                O gateway é fictício e decide pelos 4 últimos dígitos. Use um destes para
                reproduzir cada cenário:
              </p>
              <ul>
                {testCards.map((card) => (
                  <li key={card.number}>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() =>
                        setCard({
                          number: card.number,
                          holderName: value.card.holderName || 'GABRIEL SOUZA',
                          expiry: value.card.expiry || '12/30',
                          cvv: value.card.cvv || '123',
                        })
                      }
                    >
                      {card.number}
                    </button>
                    <span className="muted"> — {card.outcome}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {value.method === 'pix' && (
        <div className="method-explainer">
          <p>
            Ao confirmar o pedido você recebe um QR Code e um código copia-e-cola. O pedido é
            liberado assim que o pagamento é confirmado.
          </p>
          <p className="muted">O código expira em 30 minutos.</p>
        </div>
      )}

      {value.method === 'boleto' && (
        <div className="method-explainer">
          <p>
            Geramos um boleto com vencimento em 3 dias. O pedido é separado depois da
            compensação.
          </p>
          <p className="muted">Boleto não permite parcelamento.</p>
        </div>
      )}
    </div>
  );
}

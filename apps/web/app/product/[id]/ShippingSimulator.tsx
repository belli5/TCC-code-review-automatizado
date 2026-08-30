'use client';

import { useState } from 'react';
import { ApiError, ShippingQuote, api } from '../../../lib/api';
import { formatBusinessDays, formatCents, maskZipCode } from '../../../lib/format';

export function ShippingSimulator({ productId }: { productId: string }) {
  const [zipCode, setZipCode] = useState('');
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setQuote(null);

    try {
      setQuote(await api.quoteShipping(zipCode, [{ productId, quantity: 1 }]));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível calcular o frete.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shipping-simulator">
      <h3>Calcular frete e prazo</h3>
      <form onSubmit={handleSubmit} className="inline-form">
        <input
          value={zipCode}
          onChange={(event) => setZipCode(maskZipCode(event.target.value))}
          placeholder="00000-000"
          inputMode="numeric"
          aria-label="CEP de entrega"
        />
        <button type="submit" className="button-secondary" disabled={loading}>
          {loading ? 'Calculando...' : 'Calcular'}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      {quote && (
        <table className="shipping-table">
          <tbody>
            {quote.options.map((option) => (
              <tr key={option.id}>
                <td>
                  <strong>{option.name}</strong>
                  <span className="muted"> · {formatBusinessDays(option.etaDays)}</span>
                </td>
                <td className="text-right">
                  {option.freeShippingApplied ? (
                    <span className="free-tag">Grátis</span>
                  ) : (
                    formatCents(option.priceCents)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

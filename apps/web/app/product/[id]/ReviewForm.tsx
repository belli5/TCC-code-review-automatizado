'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, api } from '../../../lib/api';

export function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.createReview(productId, { author, rating, comment });
      setAuthor('');
      setComment('');
      setRating(5);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar a avaliação.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="button-secondary" onClick={() => setOpen(true)}>
        Avaliar este produto
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="review-form">
      <div className="form-group">
        <label htmlFor="review-author">Seu nome</label>
        <input
          id="review-author"
          required
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
        />
      </div>

      <fieldset className="form-group">
        <legend>Sua nota</legend>
        <div className="rating-picker">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={value <= rating ? 'star-button is-on' : 'star-button'}
              onClick={() => setRating(value)}
              aria-label={`${value} ${value === 1 ? 'estrela' : 'estrelas'}`}
              aria-pressed={value === rating}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>

      <div className="form-group">
        <label htmlFor="review-comment">Comentário</label>
        <textarea
          id="review-comment"
          required
          rows={3}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="O que você achou do produto?"
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Enviando...' : 'Enviar avaliação'}
        </button>
        <button type="button" className="button-ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

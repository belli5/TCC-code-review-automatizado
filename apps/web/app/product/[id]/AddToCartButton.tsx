'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../../components/CartContext';
import { formatCents } from '../../../lib/format';

export interface AddToCartProduct {
  id: string;
  slug: string;
  name: string;
  image: string;
  priceCents: number;
  stock: number;
}

export function AddToCartButton({ product }: { product: AddToCartProduct }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const soldOut = product.stock <= 0;

  function handleAdd() {
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.image,
        priceCents: product.priceCents,
        maxStock: product.stock,
      },
      quantity,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  if (soldOut) {
    return (
      <div className="buy-box">
        <p className="soldout-note">Produto esgotado no momento.</p>
        <Link href="/busca" className="button-secondary">
          Ver produtos similares
        </Link>
      </div>
    );
  }

  return (
    <div className="buy-box">
      <div className="quantity-picker">
        <span>Quantidade</span>
        <div className="quantity-controls">
          <button
            type="button"
            className="button-secondary"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Diminuir quantidade"
            disabled={quantity <= 1}
          >
            −
          </button>
          <span className="quantity-value" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
            aria-label="Aumentar quantidade"
            disabled={quantity >= product.stock}
          >
            +
          </button>
        </div>
      </div>

      <button type="button" onClick={handleAdd} className="button-large">
        {added ? 'Adicionado ao carrinho ✓' : 'Adicionar ao carrinho'}
      </button>

      {quantity > 1 && (
        <p className="muted">
          Subtotal: <strong>{formatCents(product.priceCents * quantity)}</strong>
        </p>
      )}

      {added && (
        <Link href="/cart" className="button-secondary">
          Ir para o carrinho
        </Link>
      )}
    </div>
  );
}

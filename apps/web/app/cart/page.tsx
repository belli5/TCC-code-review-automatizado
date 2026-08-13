'use client';

import Link from 'next/link';
import { useCart } from '../../components/CartContext';

export default function CartPage() {
  const { items, updateQuantity, removeItem, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="empty">
        <p>Seu carrinho está vazio.</p>
        <Link href="/" className="button">
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Carrinho</h1>
      {items.map((item) => (
        <div key={item.productId} className="cart-item">
          <div>
            <strong>{item.name}</strong>
            <p>
              {item.price.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}{' '}
              x {item.quantity}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="button-secondary"
              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
            >
              -
            </button>
            <span>{item.quantity}</span>
            <button
              className="button-secondary"
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
            >
              +
            </button>
            <button className="button-secondary" onClick={() => removeItem(item.productId)}>
              Remover
            </button>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>
          Total:{' '}
          {total.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
        </h2>
        <Link href="/checkout" className="button">
          Finalizar compra
        </Link>
      </div>
    </div>
  );
}

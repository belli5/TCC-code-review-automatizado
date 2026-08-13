'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../components/CartContext';

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          customerEmail: email,
          items,
        }),
      });

      if (!res.ok) throw new Error('Falha ao criar pedido');

      const order = await res.json();
      setOrderId(order.id);
      clearCart();
    } catch {
      setError('Não foi possível finalizar o pedido. Verifique se a API está rodando.');
    } finally {
      setLoading(false);
    }
  }

  if (orderId) {
    return (
      <div className="empty">
        <h2>Pedido realizado com sucesso! 🎉</h2>
        <p>Número do pedido: {orderId}</p>
        <Link href="/" className="button">
          Voltar à loja
        </Link>
      </div>
    );
  }

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
      <h1>Finalizar compra</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
        <div className="form-group">
          <label htmlFor="name">Nome</label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <p>
          Total:{' '}
          <strong>
            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </strong>
        </p>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Confirmar pedido'}
        </button>
      </form>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useCart } from './CartContext';

export function Header() {
  const { items } = useCart();
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <header className="header">
      <Link href="/">🛍️ Loja Simples</Link>
      <nav>
        <Link href="/">Produtos</Link>
        <Link href="/cart">Carrinho ({count})</Link>
      </nav>
    </header>
  );
}

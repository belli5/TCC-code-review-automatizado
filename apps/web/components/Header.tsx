'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from './CartContext';

export function Header() {
  const { count } = useCart();
  const router = useRouter();
  const [term, setTerm] = useState('');

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const query = term.trim();
    router.push(query ? `/busca?search=${encodeURIComponent(query)}` : '/busca');
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="brand">
          🛍️ Loja Simples
        </Link>

        <form className="header-search" onSubmit={handleSearch} role="search">
          <input
            type="search"
            placeholder="Buscar produtos..."
            aria-label="Buscar produtos"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
          <button type="submit" className="button-ghost" aria-label="Buscar">
            Buscar
          </button>
        </form>

        <nav className="header-nav">
          <Link href="/busca">Produtos</Link>
          <Link href="/meus-pedidos">Meus pedidos</Link>
          <Link href="/admin/pedidos">Admin</Link>
          <Link href="/cart" className="cart-link">
            Carrinho
            {count > 0 && <span className="cart-count">{count}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}

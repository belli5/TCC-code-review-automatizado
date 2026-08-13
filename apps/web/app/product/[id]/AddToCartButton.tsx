'use client';

import { useState } from 'react';
import { useCart } from '../../../components/CartContext';

interface Product {
  id: string;
  name: string;
  price: number;
}

export function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleClick() {
    addItem({ productId: product.id, name: product.name, price: product.price });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button onClick={handleClick}>
      {added ? 'Adicionado! ✓' : 'Adicionar ao carrinho'}
    </button>
  );
}

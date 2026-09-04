import { render, screen, act } from '@testing-library/react';
import { useEffect } from 'react';
import { CartProvider, useCart } from './CartContext';

const CAMISETA = {
  productId: '1',
  slug: 'camiseta-basica',
  name: 'Camiseta Básica',
  image: 'https://placehold.co/600x600',
  priceCents: 5990,
  maxStock: 3,
};

const TENIS = {
  productId: '2',
  slug: 'tenis-runner',
  name: 'Tênis Runner',
  image: 'https://placehold.co/600x600',
  priceCents: 24990,
  maxStock: 10,
};

function CartInspector({ onReady }: { onReady: (cart: ReturnType<typeof useCart>) => void }) {
  const cart = useCart();
  useEffect(() => {
    onReady(cart);
  });
  return (
    <div>
      <span data-testid="subtotal">{cart.subtotalCents}</span>
      <span data-testid="lines">{cart.items.length}</span>
      <span data-testid="count">{cart.count}</span>
    </div>
  );
}

function renderCart() {
  let api!: ReturnType<typeof useCart>;
  render(
    <CartProvider>
      <CartInspector onReady={(cart) => (api = cart)} />
    </CartProvider>,
  );
  return {
    get api() {
      return api;
    },
    subtotal: () => screen.getByTestId('subtotal').textContent,
    lines: () => screen.getByTestId('lines').textContent,
    count: () => screen.getByTestId('count').textContent,
  };
}

describe('CartContext (unitário)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adiciona um item novo e calcula o subtotal em centavos', () => {
    const cart = renderCart();

    act(() => {
      cart.api.addItem(CAMISETA);
    });

    expect(cart.lines()).toBe('1');
    expect(cart.subtotal()).toBe('5990');
  });

  it('soma a quantidade ao adicionar o mesmo produto de novo, sem duplicar a linha', () => {
    const cart = renderCart();

    act(() => {
      cart.api.addItem(CAMISETA);
    });
    act(() => {
      cart.api.addItem(CAMISETA);
    });

    expect(cart.lines()).toBe('1');
    expect(cart.count()).toBe('2');
    expect(cart.subtotal()).toBe('11980');
  });

  it('respeita o estoque como teto da quantidade', () => {
    const cart = renderCart();

    act(() => {
      cart.api.addItem(CAMISETA, 10);
    });

    expect(cart.count()).toBe('3');
    expect(cart.subtotal()).toBe(String(5990 * 3));
  });

  it('remove o item quando a quantidade cai para zero', () => {
    const cart = renderCart();

    act(() => {
      cart.api.addItem(CAMISETA);
    });
    act(() => {
      cart.api.updateQuantity(CAMISETA.productId, 0);
    });

    expect(cart.lines()).toBe('0');
    expect(cart.subtotal()).toBe('0');
  });

  it('monta os itens no formato que o checkout envia para a API', () => {
    const cart = renderCart();

    act(() => {
      cart.api.addItem(CAMISETA, 2);
      cart.api.addItem(TENIS);
    });

    expect(cart.api.checkoutItems).toEqual([
      { productId: '1', quantity: 2 },
      { productId: '2', quantity: 1 },
    ]);
  });

  it('esvazia o carrinho com clearCart', () => {
    const cart = renderCart();

    act(() => {
      cart.api.addItem(CAMISETA);
      cart.api.addItem(TENIS);
    });
    act(() => {
      cart.api.clearCart();
    });

    expect(cart.lines()).toBe('0');
  });

  it('persiste o carrinho no localStorage entre montagens', () => {
    const first = renderCart();
    act(() => {
      first.api.addItem(TENIS, 2);
    });

    expect(JSON.parse(localStorage.getItem('ecommerce-cart') ?? '[]')).toHaveLength(1);

    const second = renderCart();
    expect(second.api.items[0]).toMatchObject({ productId: '2', quantity: 2 });
  });
});

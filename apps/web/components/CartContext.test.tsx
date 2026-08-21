import { render, screen, act } from '@testing-library/react';
import { useEffect } from 'react';
import { CartProvider, useCart } from './CartContext';

function CartInspector({ onReady }: { onReady: (cart: ReturnType<typeof useCart>) => void }) {
  const cart = useCart();
  useEffect(() => {
    onReady(cart);
  });
  return (
    <div>
      <span data-testid="total">{cart.total}</span>
      <span data-testid="count">{cart.items.length}</span>
    </div>
  );
}

describe('CartContext (unitário)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adiciona um item novo ao carrinho', () => {
    let cartApi: ReturnType<typeof useCart>;
    render(
      <CartProvider>
        <CartInspector onReady={(cart) => (cartApi = cart)} />
      </CartProvider>,
    );

    act(() => {
      cartApi.addItem({ productId: '1', name: 'Camiseta', price: 50 });
    });

    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('total').textContent).toBe('50');
  });

  it('incrementa a quantidade ao adicionar o mesmo item duas vezes', () => {
    let cartApi: ReturnType<typeof useCart>;
    render(
      <CartProvider>
        <CartInspector onReady={(cart) => (cartApi = cart)} />
      </CartProvider>,
    );

    act(() => {
      cartApi.addItem({ productId: '1', name: 'Camiseta', price: 50 });
      cartApi.addItem({ productId: '1', name: 'Camiseta', price: 50 });
    });

    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('total').textContent).toBe('100');
  });

  it('remove o item quando a quantidade cai para zero', () => {
    let cartApi: ReturnType<typeof useCart>;
    render(
      <CartProvider>
        <CartInspector onReady={(cart) => (cartApi = cart)} />
      </CartProvider>,
    );

    act(() => {
      cartApi.addItem({ productId: '1', name: 'Camiseta', price: 50 });
    });
    act(() => {
      cartApi.updateQuantity('1', 0);
    });

    expect(screen.getByTestId('count').textContent).toBe('0');
  });
});
import { render, screen, fireEvent } from '@testing-library/react';
import { CartProvider, useCart } from '../../../../components/CartContext';
import { AddToCartButton } from '../AddToCartButton';

function CartSummary() {
  const { items, total } = useCart();
  return (
    <div>
      <span data-testid="items-count">{items.length}</span>
      <span data-testid="total">{total}</span>
    </div>
  );
}

describe('AddToCartButton + CartContext (integração)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adiciona o produto ao carrinho ao clicar no botão', () => {
    render(
      <CartProvider>
        <AddToCartButton product={{ id: '1', name: 'Camiseta', price: 59.9 }} />
        <CartSummary />
      </CartProvider>,
    );

    expect(screen.getByTestId('items-count').textContent).toBe('0');

    fireEvent.click(screen.getByText('Adicionar ao carrinho'));

    expect(screen.getByTestId('items-count').textContent).toBe('1');
    expect(screen.getByTestId('total').textContent).toBe('59.9');
    expect(screen.getByText('Adicionado! ✓')).toBeInTheDocument();
  });
});
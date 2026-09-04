import { render, screen, fireEvent } from '@testing-library/react';
import { CartProvider, useCart } from '../../../../components/CartContext';
import { AddToCartButton } from '../AddToCartButton';

const PRODUCT = {
  id: '1',
  slug: 'tenis-runner',
  name: 'Tênis Runner',
  image: 'https://placehold.co/600x600',
  priceCents: 24990,
  stock: 3,
};

function CartSummary() {
  const { items, subtotalCents, count } = useCart();
  return (
    <div>
      <span data-testid="lines">{items.length}</span>
      <span data-testid="count">{count}</span>
      <span data-testid="subtotal">{subtotalCents}</span>
    </div>
  );
}

function setup(product = PRODUCT) {
  render(
    <CartProvider>
      <AddToCartButton product={product} />
      <CartSummary />
    </CartProvider>,
  );
}

describe('AddToCartButton + CartContext (integração)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adiciona o produto ao carrinho ao clicar no botão', () => {
    setup();

    expect(screen.getByTestId('lines').textContent).toBe('0');

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }));

    expect(screen.getByTestId('lines').textContent).toBe('1');
    expect(screen.getByTestId('subtotal').textContent).toBe('24990');
    expect(screen.getByText('Adicionado ao carrinho ✓')).toBeInTheDocument();
  });

  it('leva a quantidade escolhida no seletor para o carrinho', () => {
    setup();

    fireEvent.click(screen.getByLabelText('Aumentar quantidade'));
    fireEvent.click(screen.getByLabelText('Aumentar quantidade'));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }));

    expect(screen.getByTestId('count').textContent).toBe('3');
    expect(screen.getByTestId('subtotal').textContent).toBe(String(24990 * 3));
  });

  it('não deixa escolher mais do que existe em estoque', () => {
    setup();

    const increase = screen.getByLabelText('Aumentar quantidade');
    fireEvent.click(increase);
    fireEvent.click(increase);
    expect(increase).toBeDisabled();
  });

  it('substitui o botão de compra quando o produto está esgotado', () => {
    setup({ ...PRODUCT, stock: 0 });

    expect(screen.queryByRole('button', { name: 'Adicionar ao carrinho' })).not.toBeInTheDocument();
    expect(screen.getByText('Produto esgotado no momento.')).toBeInTheDocument();
  });
});

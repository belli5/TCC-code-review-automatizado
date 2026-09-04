import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { PaymentForm, PaymentState } from '../PaymentForm';

jest.mock('../../../lib/api', () => ({
  api: {
    testCards: jest.fn().mockResolvedValue([
      { number: '4242 4242 4242 4242', brand: 'visa', outcome: 'Aprovado' },
      { number: '4111 0000 0008 0000', brand: 'visa', outcome: 'Recusado: saldo insuficiente' },
    ]),
  },
}));

const INITIAL: PaymentState = {
  method: 'credit_card',
  installments: 1,
  card: { number: '', holderName: '', expiry: '', cvv: '' },
};

function Harness({ totalCents = 30000 }: { totalCents?: number }) {
  const [value, setValue] = useState<PaymentState>(INITIAL);
  return (
    <div>
      <PaymentForm value={value} onChange={setValue} totalCents={totalCents} />
      <span data-testid="method">{value.method}</span>
      <span data-testid="installments">{value.installments}</span>
      <span data-testid="number">{value.card.number}</span>
    </div>
  );
}

describe('PaymentForm', () => {
  it('mostra os campos de cartão e esconde ao trocar para PIX', () => {
    render(<Harness />);

    expect(screen.getByLabelText('Número do cartão')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /PIX/i }));

    expect(screen.getByTestId('method').textContent).toBe('pix');
    expect(screen.queryByLabelText('Número do cartão')).not.toBeInTheDocument();
    expect(screen.getByText(/O código expira em 30 minutos/)).toBeInTheDocument();
  });

  it('aplica a máscara do cartão enquanto digita', () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText('Número do cartão'), {
      target: { value: '4242424242424242' },
    });

    expect(screen.getByTestId('number').textContent).toBe('4242 4242 4242 4242');
  });

  it('limita as parcelas para nenhuma ficar abaixo de R$ 20', () => {
    render(<Harness totalCents={6500} />);

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[2].textContent).toContain('3x');
  });

  it('preenche o formulário ao clicar num cartão de teste', async () => {
    render(<Harness />);

    const card = await screen.findByRole('button', { name: '4111 0000 0008 0000' });
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByTestId('number').textContent).toBe('4111 0000 0008 0000');
    });
    expect(screen.getByLabelText('CVV')).toHaveValue('123');
  });

  it('avisa que boleto não parcela', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('radio', { name: /Boleto/i }));

    expect(screen.getByText('Boleto não permite parcelamento.')).toBeInTheDocument();
  });
});

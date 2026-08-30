import { render, screen } from '@testing-library/react';
import { OrderTimeline } from '../OrderTimeline';
import { OrderEvent } from '../../lib/api';

const EVENTS: OrderEvent[] = [
  {
    status: 'awaiting_payment',
    statusLabel: 'Aguardando pagamento',
    note: 'Pedido registrado.',
    at: '2026-08-29T12:00:00.000Z',
  },
  {
    status: 'paid',
    statusLabel: 'Pagamento aprovado',
    note: 'Pagamento confirmado pelo banco.',
    at: '2026-08-29T12:05:00.000Z',
  },
];

describe('OrderTimeline', () => {
  it('mostra todas as etapas da esteira, cumpridas ou não', () => {
    render(<OrderTimeline timeline={EVENTS} status="paid" />);

    expect(screen.getByText('Pedido registrado')).toBeInTheDocument();
    expect(screen.getByText('Em separação')).toBeInTheDocument();
    expect(screen.getByText('Entregue')).toBeInTheDocument();
  });

  it('marca como concluídas apenas as etapas que já aconteceram', () => {
    const { container } = render(<OrderTimeline timeline={EVENTS} status="paid" />);

    expect(container.querySelectorAll('.timeline-step.is-done')).toHaveLength(2);
    expect(container.querySelectorAll('.timeline-step.is-current')).toHaveLength(1);
    expect(screen.getAllByText('Aguardando')).toHaveLength(3);
  });

  it('exibe o cancelamento fora da trilha feliz', () => {
    const cancelled: OrderEvent[] = [
      EVENTS[0],
      {
        status: 'cancelled',
        statusLabel: 'Cancelado',
        note: 'Pedido cancelado. Estoque devolvido.',
        at: '2026-08-29T13:00:00.000Z',
      },
    ];

    const { container } = render(<OrderTimeline timeline={cancelled} status="cancelled" />);

    expect(container.querySelectorAll('.timeline-step.is-interrupted')).toHaveLength(1);
    expect(screen.getByText('Pedido cancelado. Estoque devolvido.')).toBeInTheDocument();
    expect(screen.queryByText('Aguardando')).not.toBeInTheDocument();
  });
});

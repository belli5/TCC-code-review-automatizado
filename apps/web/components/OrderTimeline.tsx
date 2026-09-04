import { OrderEvent, OrderStatus } from '../lib/api';
import { formatDateTime } from '../lib/format';

const HAPPY_PATH: { status: OrderStatus; label: string }[] = [
  { status: 'awaiting_payment', label: 'Pedido registrado' },
  { status: 'paid', label: 'Pagamento aprovado' },
  { status: 'processing', label: 'Em separação' },
  { status: 'shipped', label: 'Enviado' },
  { status: 'delivered', label: 'Entregue' },
];

const INTERRUPTED: OrderStatus[] = ['cancelled', 'payment_failed'];

export function OrderTimeline({
  timeline,
  status,
}: {
  timeline: OrderEvent[];
  status: OrderStatus;
}) {
  const reached = new Map(timeline.map((event) => [event.status, event]));
  const interrupted = INTERRUPTED.includes(status);
  const currentIndex = HAPPY_PATH.findIndex((step) => step.status === status);

  return (
    <ol className="timeline">
      {HAPPY_PATH.map((step, index) => {
        const event = reached.get(step.status);
        const done = Boolean(event);
        const current = index === currentIndex;

        return (
          <li
            key={step.status}
            className={`timeline-step${done ? ' is-done' : ''}${current ? ' is-current' : ''}`}
          >
            <span className="timeline-marker">{done ? '✓' : index + 1}</span>
            <div className="timeline-content">
              <strong>{step.label}</strong>
              {event ? (
                <>
                  <p className="timeline-note">{event.note}</p>
                  <time className="timeline-time">{formatDateTime(event.at)}</time>
                </>
              ) : (
                <p className="timeline-note timeline-pending">
                  {interrupted ? '—' : 'Aguardando'}
                </p>
              )}
            </div>
          </li>
        );
      })}

      {timeline
        .filter((event) => INTERRUPTED.includes(event.status))
        .map((event) => (
          <li key={event.at} className="timeline-step is-interrupted">
            <span className="timeline-marker">!</span>
            <div className="timeline-content">
              <strong>{event.statusLabel}</strong>
              <p className="timeline-note">{event.note}</p>
              <time className="timeline-time">{formatDateTime(event.at)}</time>
            </div>
          </li>
        ))}
    </ol>
  );
}

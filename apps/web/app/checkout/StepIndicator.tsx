'use client';

export const CHECKOUT_STEPS = ['Dados', 'Entrega', 'Pagamento', 'Revisão'] as const;

export function StepIndicator({
  current,
  onGoTo,
}: {
  current: number;
  onGoTo: (step: number) => void;
}) {
  return (
    <ol className="steps">
      {CHECKOUT_STEPS.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        return (
          <li
            key={label}
            className={`step${done ? ' is-done' : ''}${step === current ? ' is-current' : ''}`}
          >
            {/* Só deixa voltar: pular etapa à frente driblaria a validação. */}
            <button type="button" onClick={() => done && onGoTo(step)} disabled={!done}>
              <span className="step-number">{done ? '✓' : step}</span>
              <span className="step-label">{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

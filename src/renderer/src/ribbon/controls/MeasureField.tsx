// Campo numérico de la cinta en cm o pulgadas (sangrías, márgenes) o en puntos (espaciado).
import { useState } from 'react';

export function MeasureField({
  label,
  value,
  format,
  parse,
  step,
  onCommit,
  disabled,
  testId,
}: {
  readonly label: string;
  /** Valor actual en la unidad interna (twips o puntos); null si es mixto. */
  readonly value: number | null;
  readonly format: (value: number) => string;
  readonly parse: (text: string) => number | null;
  /** Paso de las flechas, en la unidad interna. */
  readonly step: number;
  readonly onCommit: (value: number) => void;
  readonly disabled?: boolean;
  readonly testId?: string;
}) {
  // Mientras se edita se muestra el borrador; si no, el valor actual del motor.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === null ? '' : format(value));

  const commit = (next: number | null) => {
    setDraft(null);
    if (next !== null) onCommit(Math.max(0, next));
  };

  return (
    <label className="tw:grid tw:grid-cols-[82px_64px] tw:items-center tw:gap-1 tw:text-[12px]">
      <span className="tw:text-fg">{label}</span>
      <input
        className="tw:h-[22px] tw:rounded-[3px] tw:border tw:border-line tw:bg-input tw:px-1 tw:font-[family-name:inherit] tw:text-[length:inherit] tw:text-fg tw:focus:border-accent tw:focus:outline-none"
        aria-label={label}
        data-testid={testId}
        value={shown}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => draft !== null && commit(parse(draft))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(parse(shown));
          else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            commit((value ?? 0) + (e.key === 'ArrowUp' ? step : -step));
          } else if (e.key === 'Escape') setDraft(null);
        }}
      />
    </label>
  );
}

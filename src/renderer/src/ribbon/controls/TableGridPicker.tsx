import { ChevronDown12Regular } from '@fluentui/react-icons';
// Insertar tabla eligiendo filas × columnas en una cuadrícula, como en Word. Con teclado:
// flechas para elegir el tamaño, Intro o Espacio para insertar.
import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cx } from '@renderer/ui/cx';
import { Popover } from '@renderer/ui/Popover';
import * as rc from '../ribbon-classes';

const COLS = 10;
const ROWS = 8;

const clamp = (n: number, max: number) => Math.min(Math.max(n, 1), max);

export function TableGridPicker({
  icon,
  label,
  onPick,
  disabled,
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly onPick: (rows: number, cols: number) => void;
  readonly disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  /** Filas × columnas resaltadas (0 × 0: nada). */
  const [hover, setHover] = useState<[number, number]>([0, 0]);
  const [rows, cols] = hover;

  // Una sola celda en el orden de Tab (la resaltada); las flechas mueven el foco.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const r = Math.max(rows, 1);
    const c = Math.max(cols, 1);
    const next: Record<string, [number, number]> = {
      ArrowRight: [r, clamp(c + 1, COLS)],
      ArrowLeft: [r, clamp(c - 1, COLS)],
      ArrowDown: [clamp(r + 1, ROWS), c],
      ArrowUp: [clamp(r - 1, ROWS), c],
      Home: [r, 1],
      End: [r, COLS],
    };
    const target = next[e.key];
    if (!target) return;
    e.preventDefault();
    setHover(target);
    e.currentTarget
      .querySelector<HTMLElement>(`[data-cell="${target[0]}-${target[1]}"]`)
      ?.focus({ preventScroll: true });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setHover([0, 0]);
      }}
      className={rc.palette}
      role="dialog"
      aria-label={label}
      anchor={({ anchorStyle, triggerProps }) => (
        <button
          type="button"
          {...triggerProps}
          className={rc.buttonLarge}
          style={anchorStyle}
          aria-label={label}
          title={label}
          disabled={disabled}
          data-testid="insert-table"
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className={rc.icon}>{icon}</span>
          <span className={rc.label}>
            {label} <ChevronDown12Regular className={rc.miniArrow} />
          </span>
        </button>
      )}
    >
      <div className={rc.paletteTitle} aria-live="polite">
        {rows > 0 ? t('insert.table.size', { cols, rows }) : t('insert.table.title')}
      </div>
      <div
        className="tw:grid tw:grid-cols-[repeat(10,18px)] tw:gap-0.5"
        onMouseLeave={() => setHover([0, 0])}
        onKeyDown={onKeyDown}
        role="grid"
        aria-label={label}
      >
        {Array.from({ length: ROWS }, (_, r) => (
          <div key={r} role="row" className="tw:contents">
            {Array.from({ length: COLS }, (_, c) => {
              const current = r + 1 === Math.max(rows, 1) && c + 1 === Math.max(cols, 1);
              return (
                <button
                  key={c}
                  type="button"
                  role="gridcell"
                  data-cell={`${r + 1}-${c + 1}`}
                  tabIndex={current ? 0 : -1}
                  autoFocus={r === 0 && c === 0}
                  aria-selected={r < rows && c < cols}
                  className={cx(
                    'tw:size-[18px] tw:cursor-pointer tw:border tw:p-0 tw:focus-visible:outline-2 tw:focus-visible:outline-spark',
                    r < rows && c < cols ? 'tw:border-accent tw:bg-pressed' : 'tw:border-line tw:bg-input',
                  )}
                  aria-label={t('insert.table.size', { cols: c + 1, rows: r + 1 })}
                  onMouseEnter={() => setHover([r + 1, c + 1])}
                  onFocus={() => setHover([r + 1, c + 1])}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setOpen(false);
                    onPick(r + 1, c + 1);
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </Popover>
  );
}

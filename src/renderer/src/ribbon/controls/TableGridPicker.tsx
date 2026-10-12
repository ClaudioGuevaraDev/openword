// Insertar tabla eligiendo filas × columnas en una cuadrícula, como en Word.
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cx } from '@renderer/ui/cx';
import { Popover } from '@renderer/ui/Popover';
import * as rc from '../ribbon-classes';

const COLS = 10;
const ROWS = 8;

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
  const [hover, setHover] = useState<[number, number]>([0, 0]);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      className={rc.palette}
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
            {label} <span className={rc.miniArrow}>▾</span>
          </span>
        </button>
      )}
    >
      <div className={rc.paletteTitle}>
        {hover[0] > 0 ? t('insert.table.size', { cols: hover[1], rows: hover[0] }) : t('insert.table.title')}
      </div>
      <div
        className="tw:grid tw:grid-cols-[repeat(10,18px)] tw:gap-0.5"
        onMouseLeave={() => setHover([0, 0])}
        role="grid"
        aria-label={label}
      >
        {Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (_, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              className={cx(
                'tw:size-[18px] tw:cursor-pointer tw:border tw:p-0',
                r < hover[0] && c < hover[1]
                  ? 'tw:border-accent tw:bg-pressed'
                  : 'tw:border-line tw:bg-input',
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
          )),
        )}
      </div>
    </Popover>
  );
}

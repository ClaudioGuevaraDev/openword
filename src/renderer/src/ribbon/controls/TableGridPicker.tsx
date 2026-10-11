// Insertar tabla eligiendo filas × columnas en una cuadrícula, como en Word.
import * as Popover from '@radix-ui/react-popover';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../Ribbon.module.css';

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
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={styles.buttonLarge}
          aria-label={label}
          title={label}
          disabled={disabled}
          data-testid="insert-table"
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className={styles.icon}>{icon}</span>
          <span className={styles.label}>
            {label} <span className={styles.miniArrow}>▾</span>
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={styles.palette}
          align="start"
          sideOffset={2}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className={styles.paletteTitle}>
            {hover[0] > 0
              ? t('insert.table.size', { cols: hover[1], rows: hover[0] })
              : t('insert.table.title')}
          </div>
          <div
            className={styles.tableGrid}
            onMouseLeave={() => setHover([0, 0])}
            role="grid"
            aria-label={label}
          >
            {Array.from({ length: ROWS }, (_, r) =>
              Array.from({ length: COLS }, (_, c) => (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  className={
                    r < hover[0] && c < hover[1]
                      ? `${styles.tableCell} ${styles.tableCellOn}`
                      : styles.tableCell
                  }
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

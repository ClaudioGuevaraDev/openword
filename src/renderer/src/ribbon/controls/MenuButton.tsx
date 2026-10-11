// Botón de la cinta que abre un menú (Márgenes, Orientación, Saltos, Número de página…).
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';
import styles from '../Ribbon.module.css';

export interface MenuEntry {
  readonly id: string;
  readonly label: string;
  /** Texto secundario (p. ej. medidas de los márgenes). */
  readonly detail?: string;
  readonly checked?: boolean;
  readonly disabled?: boolean;
  readonly separatorBefore?: boolean;
  readonly onSelect: () => void;
}

export function MenuButton({
  icon,
  label,
  entries,
  size = 'large',
  disabled,
  disabledReason,
  testId,
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly entries: readonly MenuEntry[];
  readonly size?: 'large' | 'small';
  readonly disabled?: boolean;
  /** Motivo que da el motor cuando el botón está deshabilitado (se muestra en el tooltip). */
  readonly disabledReason?: string | null;
  readonly testId?: string;
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={size === 'large' ? styles.buttonLarge : styles.button}
          aria-label={label}
          title={disabled && disabledReason ? `${label}: ${disabledReason}` : label}
          disabled={disabled}
          data-testid={testId}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className={styles.icon}>{icon}</span>
          <span className={styles.label}>
            {label} <span className={styles.miniArrow}>▾</span>
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.menu}
          align="start"
          sideOffset={2}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {entries.map((entry) => (
            <div key={entry.id}>
              {entry.separatorBefore && <DropdownMenu.Separator className={styles.menuSeparator} />}
              <DropdownMenu.Item
                className={styles.menuItem}
                disabled={entry.disabled}
                onSelect={entry.onSelect}
              >
                <span className={styles.menuCheck}>{entry.checked ? '✓' : ''}</span>
                <span className={styles.menuText}>
                  {entry.label}
                  {entry.detail && <span className={styles.menuDetail}>{entry.detail}</span>}
                </span>
              </DropdownMenu.Item>
            </div>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

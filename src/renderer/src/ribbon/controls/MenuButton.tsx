// Botón de la cinta que abre un menú (Márgenes, Orientación, Saltos, Número de página…).
import { Fragment, type ReactNode } from 'react';
import { focusEditor } from '@renderer/editor/document-actions';
import { Menu, MenuItem, MenuSeparator } from '@renderer/ui/Menu';
import * as rc from '../ribbon-classes';

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
    <Menu
      label={label}
      trigger={({ anchorStyle, triggerProps }) => (
        <button
          type="button"
          {...triggerProps}
          className={size === 'large' ? rc.buttonLarge : rc.button}
          style={anchorStyle}
          aria-label={label}
          title={disabled && disabledReason ? `${label}: ${disabledReason}` : label}
          disabled={disabled}
          data-testid={testId}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className={rc.icon}>{icon}</span>
          <span className={rc.label}>
            {label} <span className={rc.miniArrow}>▾</span>
          </span>
        </button>
      )}
    >
      {entries.map((entry) => (
        <Fragment key={entry.id}>
          {entry.separatorBefore && <MenuSeparator />}
          <MenuItem
            disabled={entry.disabled}
            onSelect={() => {
              entry.onSelect();
              // El foco vuelve al documento para seguir escribiendo.
              setTimeout(focusEditor, 0);
            }}
          >
            <span className={rc.menuCheck}>{entry.checked ? '✓' : ''}</span>
            <span className="tw:flex tw:flex-col">
              {entry.label}
              {entry.detail && <span className="tw:text-[11px] tw:text-muted">{entry.detail}</span>}
            </span>
          </MenuItem>
        </Fragment>
      ))}
    </Menu>
  );
}

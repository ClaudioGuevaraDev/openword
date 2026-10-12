import { ChevronDown12Regular } from '@fluentui/react-icons';
// Botón de la cinta que abre un menú (Márgenes, Orientación, Saltos, Número de página…).
import type { ReactNode } from 'react';
import { focusEditor } from '@renderer/editor/document-actions';
import { Menu, MenuItem, MenuRadioItem, MenuSeparator } from '@renderer/ui/Menu';
import * as rc from '../ribbon-classes';

interface EntryBase {
  readonly id: string;
  readonly label: string;
  /** Texto secundario (p. ej. medidas de los márgenes). */
  readonly detail?: string;
  readonly disabled?: boolean;
  readonly onSelect: () => void;
}

/**
 * Elemento del menú, por variante explícita en vez de booleanos sueltos:
 * - `command` (o sin `kind`): ejecuta y devuelve el foco al documento;
 * - `option`: una opción entre varias excluyentes, con su ✓ (menuitemradio);
 * - `dialog`: abre un cuadro de diálogo, que se queda con el foco;
 * - `separator`: línea divisoria.
 */
export type MenuEntry =
  | (EntryBase & { readonly kind?: 'command' })
  | (EntryBase & { readonly kind: 'option'; readonly checked: boolean })
  | (EntryBase & { readonly kind: 'dialog' })
  | { readonly kind: 'separator'; readonly id: string };

type ItemEntry = Exclude<MenuEntry, { kind: 'separator' }>;

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
  const select = (entry: ItemEntry) => {
    entry.onSelect();
    // El foco vuelve al documento para seguir escribiendo.
    if (entry.kind !== 'dialog') setTimeout(focusEditor, 0);
  };
  const content = (entry: ItemEntry) => (
    <span className="tw:flex tw:flex-col">
      {entry.label}
      {entry.detail && <span className="tw:text-[11px] tw:text-muted">{entry.detail}</span>}
    </span>
  );
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
          <span className={rc.labelWithArrow}>
            {label}
            <ChevronDown12Regular className={rc.miniArrow} />
          </span>
        </button>
      )}
    >
      {entries.map((entry) =>
        entry.kind === 'separator' ? (
          <MenuSeparator key={entry.id} />
        ) : entry.kind === 'option' ? (
          <MenuRadioItem
            key={entry.id}
            checked={entry.checked}
            disabled={entry.disabled}
            onSelect={() => select(entry)}
          >
            {content(entry)}
          </MenuRadioItem>
        ) : (
          <MenuItem key={entry.id} disabled={entry.disabled} onSelect={() => select(entry)}>
            <span className={rc.menuCheck} />
            {content(entry)}
          </MenuItem>
        ),
      )}
    </Menu>
  );
}

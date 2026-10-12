// Menú desplegable accesible sobre Popover: roles ARIA de menú, foco itinerante y teclado como en Word.
import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import * as rc from '@renderer/ribbon/ribbon-classes';
import { cx } from './cx';
import { Popover, type PopoverAnchor } from './Popover';

const ITEM = '[role^="menuitem"]:not([aria-disabled="true"])';

const CloseContext = createContext<() => void>(() => {});

export interface MenuTriggerProps extends PopoverAnchor {
  readonly triggerProps: PopoverAnchor['triggerProps'] & {
    readonly 'aria-haspopup': 'menu';
    readonly onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  };
}

export function Menu({
  trigger,
  label,
  align = 'start',
  children,
}: {
  /** Dibuja el botón que abre el menú con las props recibidas. */
  readonly trigger: (props: MenuTriggerProps) => ReactNode;
  readonly label?: string;
  readonly align?: 'start' | 'end';
  readonly children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  // Con teclado se enfoca el primer elemento; con el ratón, el menú (sin resaltar nada).
  const fromKeyboard = useRef(false);
  const typeahead = useRef({ text: '', at: 0 });

  useEffect(() => {
    if (!open) return;
    const menu = content.current;
    const first = menu?.querySelector<HTMLElement>(ITEM);
    (fromKeyboard.current && first ? first : menu)?.focus();
  }, [open]);

  const items = () => [...(content.current?.querySelectorAll<HTMLElement>(ITEM) ?? [])];

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    if (list.length === 0) return;
    const index = list.indexOf(document.activeElement as HTMLElement);
    let next: HTMLElement | undefined;
    if (e.key === 'ArrowDown') next = list[(index + 1) % list.length];
    else if (e.key === 'ArrowUp') next = list[index <= 0 ? list.length - 1 : index - 1];
    else if (e.key === 'Home') next = list[0];
    else if (e.key === 'End') next = list[list.length - 1];
    else if (e.key === 'Tab') {
      e.preventDefault();
      setOpen(false);
      return;
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Búsqueda por las primeras letras del texto del elemento.
      const now = Date.now();
      const buffer = (now - typeahead.current.at < 700 ? typeahead.current.text : '') + e.key.toLowerCase();
      typeahead.current = { text: buffer, at: now };
      const ordered = [...list.slice(index + 1), ...list.slice(0, index + 1)];
      next = ordered.find((item) => item.textContent?.trim().toLowerCase().startsWith(buffer));
    } else return;
    e.preventDefault();
    next?.focus();
  };

  return (
    <CloseContext value={() => setOpen(false)}>
      <Popover
        ref={content}
        open={open}
        onOpenChange={setOpen}
        align={align}
        role="menu"
        // Solo con el menú abierto: cerrado sigue en el DOM y duplicaría la etiqueta del botón.
        aria-label={open ? label : undefined}
        tabIndex={-1}
        className={cx(rc.menu, 'tw:outline-none')}
        onKeyDown={onKeyDown}
        // Al salir el puntero de los elementos se quita el resaltado, como en Word.
        onPointerLeave={() => content.current?.focus()}
        anchor={({ anchorStyle, triggerProps }) =>
          trigger({
            anchorStyle,
            triggerProps: {
              ...triggerProps,
              'aria-haspopup': 'menu',
              onClick: (e) => {
                fromKeyboard.current = e.detail === 0;
              },
            },
          })
        }
      >
        {children}
      </Popover>
    </CloseContext>
  );
}

function useItemProps(onSelect: () => void, disabled: boolean | undefined) {
  const close = use(CloseContext);
  return {
    type: 'button' as const,
    tabIndex: -1,
    'aria-disabled': disabled || undefined,
    className: rc.menuItem,
    onPointerMove: (e: MouseEvent<HTMLButtonElement>) => {
      if (!disabled) e.currentTarget.focus();
    },
    onClick: () => {
      if (disabled) return;
      close();
      onSelect();
    },
  };
}

export function MenuItem({
  onSelect,
  disabled,
  children,
}: {
  readonly onSelect: () => void;
  readonly disabled?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <button role="menuitem" {...useItemProps(onSelect, disabled)}>
      {children}
    </button>
  );
}

/** Una opción entre varias excluyentes (márgenes, orientación, interlineado…), con su ✓. */
export function MenuRadioItem({
  checked,
  onSelect,
  disabled,
  children,
}: {
  readonly checked: boolean;
  readonly onSelect: () => void;
  readonly disabled?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <button role="menuitemradio" aria-checked={checked} {...useItemProps(onSelect, disabled)}>
      {/* El estado lo anuncia aria-checked; la marca es solo visual. */}
      <span className={rc.menuCheck} aria-hidden="true">
        {checked ? '✓' : ''}
      </span>
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" className={rc.menuSeparator} />;
}

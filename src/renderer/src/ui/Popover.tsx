// Ventana emergente de la cinta con la API popover del navegador y CSS anchor positioning.
// popover="auto" ya da la capa superior, el cierre con Esc o clic fuera y una sola abierta a la vez.
// La clase de la ventana no debe fijar `display` (anularía el display:none de cerrada): usar `tw:open:grid`.
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { cx } from './cx';

export interface PopoverAnchor {
  /** Estilo para el elemento al que se ancla la ventana (disparador o contenedor). */
  readonly anchorStyle: CSSProperties;
  /** Props para el botón que abre y cierra la ventana. */
  readonly triggerProps: {
    readonly popoverTarget: string;
    readonly 'aria-expanded': boolean;
    readonly 'aria-controls': string;
  };
}

export interface PopoverProps extends Omit<HTMLAttributes<HTMLDivElement>, 'popover' | 'children'> {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Dibuja el disparador o ancla con las props recibidas. */
  readonly anchor: (anchor: PopoverAnchor) => ReactNode;
  /** Borde del ancla con el que se alinea la ventana. */
  readonly align?: 'start' | 'end';
  /** Separación en píxeles entre el ancla y la ventana. */
  readonly offset?: number;
  readonly ref?: Ref<HTMLDivElement>;
  readonly children: ReactNode;
}

export function Popover({
  open,
  onOpenChange,
  anchor,
  align = 'start',
  offset = 2,
  className,
  style,
  ref,
  children,
  ...rest
}: PopoverProps) {
  const id = `ow-popover-${useId().replace(/[^\w-]/g, '')}`;
  const anchorName = `--${id}`;
  const element = useRef<HTMLDivElement | null>(null);
  const onToggle = useEffectEvent((e: Event) => onOpenChange((e as ToggleEvent).newState === 'open'));

  // El navegador también abre y cierra la ventana (popovertarget, Esc, clic fuera): se avisa al estado.
  useEffect(() => {
    const el = element.current;
    if (!el) return;
    el.addEventListener('toggle', onToggle);
    return () => el.removeEventListener('toggle', onToggle);
  }, []);

  useLayoutEffect(() => {
    const el = element.current;
    if (!el || el.matches(':popover-open') === open) return;
    if (open) el.showPopover();
    else el.hidePopover();
  }, [open]);

  return (
    <>
      {anchor({
        anchorStyle: { anchorName },
        triggerProps: { popoverTarget: id, 'aria-expanded': open, 'aria-controls': id },
      })}
      <div
        {...rest}
        ref={(node) => {
          element.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        id={id}
        popover="auto"
        className={cx('ow-popover', className)}
        style={{
          positionAnchor: anchorName,
          positionArea: align === 'start' ? 'bottom span-right' : 'bottom span-left',
          marginTop: offset,
          ...style,
        }}
      >
        {open && children}
      </div>
    </>
  );
}

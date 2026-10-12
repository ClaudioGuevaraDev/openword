import type { ReactNode } from 'react';
import * as rc from '../ribbon-classes';

export interface RibbonButtonProps {
  readonly icon: ReactNode;
  readonly label: string;
  /** Texto del tooltip (por defecto, la etiqueta) y atajo de teclado. */
  readonly tooltip?: string;
  readonly shortcut?: string;
  readonly size?: 'large' | 'small';
  /** Mostrar la etiqueta junto al icono en botones pequeños. */
  readonly showLabel?: boolean;
  readonly pressed?: boolean;
  readonly disabled?: boolean;
  readonly onClick?: () => void;
  readonly testId?: string;
}

/** Botón de la cinta. Nunca roba el foco: el cursor sigue en el documento. */
export function RibbonButton({
  icon,
  label,
  tooltip,
  shortcut,
  size = 'small',
  showLabel,
  pressed,
  disabled,
  onClick,
  testId,
}: RibbonButtonProps) {
  const title = `${tooltip ?? label}${shortcut ? ` (${shortcut})` : ''}`;
  return (
    <button
      type="button"
      className={size === 'large' ? rc.buttonLarge : rc.button}
      aria-label={label}
      aria-pressed={pressed === undefined ? undefined : pressed}
      title={title}
      disabled={disabled}
      data-testid={testId}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <span className={rc.icon}>{icon}</span>
      {(size === 'large' || showLabel) && <span className={rc.label}>{label}</span>}
    </button>
  );
}

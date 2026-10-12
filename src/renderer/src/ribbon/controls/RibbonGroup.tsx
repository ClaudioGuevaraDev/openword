import type { ReactNode } from 'react';
import { cx } from '@renderer/ui/cx';

export function RibbonGroup({
  label,
  children,
  onLauncher,
  launcherLabel,
  grow = false,
}: {
  readonly label: string;
  readonly children: ReactNode;
  /** Pequeño botón de la esquina que abre el diálogo completo del grupo (como en Word). */
  readonly onLauncher?: () => void;
  readonly launcherLabel?: string;
  /** Ocupa el espacio libre del panel (p. ej. la galería de estilos, que muestra los que quepan). */
  readonly grow?: boolean;
}) {
  return (
    // Divisor entre grupos, del borde superior del contenido al pie de la etiqueta, con el mismo
    // margen arriba y abajo para que se vea centrado en el panel. Es un grupo y no una <section>:
    // cada pestaña tiene varios y no deben contar como regiones de la página.
    <div
      role="group"
      className={cx(
        'tw:relative tw:flex tw:flex-col tw:px-2 tw:after:absolute tw:after:top-1 tw:after:right-0 tw:after:bottom-1 tw:after:w-px tw:after:bg-line tw:last:after:hidden',
        grow && 'tw:flex-1',
      )}
      aria-label={label}
    >
      {/* Altura común (la de un botón grande): las pilas de 2 o 3 filas se reparten en ella. */}
      <div
        className={cx(
          'tw:box-content tw:flex tw:min-h-21 tw:flex-1 tw:items-center tw:gap-1.5 tw:pt-1',
          grow && 'tw:[&>*]:flex-1',
        )}
      >
        {children}
      </div>
      <div className="tw:relative tw:px-3.5 tw:pt-1 tw:pb-1 tw:text-center tw:text-[11px] tw:whitespace-nowrap tw:text-muted">
        {label}
        {onLauncher && (
          <button
            type="button"
            className="tw:absolute tw:right-0 tw:bottom-0 tw:inline-flex tw:size-6 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded tw:border-0 tw:bg-transparent tw:p-0 tw:text-muted tw:transition-colors tw:hover:bg-hover tw:hover:text-accent"
            aria-label={launcherLabel ?? label}
            aria-haspopup="dialog"
            title={launcherLabel ?? label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onLauncher}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path
                d="M1 4V1h3M9 6v3H6M3.5 3.5l5 5M9 6.5V9H6.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Fila de botones pequeños dentro de un grupo. Con `layout="spread"` los botones se reparten a lo
 * ancho de la pila, alineados con la fila más larga (p. ej. la de fuente y tamaño).
 */
export function RibbonRow({
  children,
  layout = 'start',
}: {
  readonly children: ReactNode;
  readonly layout?: 'start' | 'spread';
}) {
  return (
    <div className={cx('tw:flex tw:items-center tw:gap-1', layout === 'spread' && 'tw:justify-between')}>
      {children}
    </div>
  );
}

export function RibbonStack({ children }: { readonly children: ReactNode }) {
  return <div className="tw:flex tw:flex-col tw:justify-evenly tw:self-stretch tw:px-1.5">{children}</div>;
}

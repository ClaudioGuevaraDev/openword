import type { ReactNode } from 'react';

export function RibbonGroup({
  label,
  children,
  onLauncher,
  launcherLabel,
}: {
  readonly label: string;
  readonly children: ReactNode;
  /** Pequeño botón de la esquina que abre el diálogo completo del grupo (como en Word). */
  readonly onLauncher?: () => void;
  readonly launcherLabel?: string;
}) {
  return (
    // Divisor corto entre grupos (no de lado a lado), como la cinta de Word 365.
    <section
      className="tw:relative tw:flex tw:flex-col tw:px-1.5 tw:after:absolute tw:after:top-[12%] tw:after:right-0 tw:after:h-[76%] tw:after:w-px tw:after:bg-line tw:last:after:hidden"
      aria-label={label}
    >
      <div className="tw:flex tw:flex-1 tw:items-start tw:gap-0.5">{children}</div>
      <div className="tw:relative tw:px-3.5 tw:pt-0.5 tw:pb-[3px] tw:text-center tw:text-[11px] tw:whitespace-nowrap tw:text-muted">
        {label}
        {onLauncher && (
          <button
            type="button"
            className="tw:absolute tw:right-0 tw:bottom-0.5 tw:inline-flex tw:size-4 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded tw:border-0 tw:bg-transparent tw:p-0 tw:text-muted tw:transition-colors tw:hover:bg-hover tw:hover:text-accent"
            aria-label={launcherLabel ?? label}
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
    </section>
  );
}

/** Fila de botones pequeños dentro de un grupo. */
export function RibbonRow({ children }: { readonly children: ReactNode }) {
  return <div className="tw:flex tw:items-center tw:gap-px">{children}</div>;
}

export function RibbonStack({ children }: { readonly children: ReactNode }) {
  return <div className="tw:flex tw:flex-col tw:gap-0.5">{children}</div>;
}

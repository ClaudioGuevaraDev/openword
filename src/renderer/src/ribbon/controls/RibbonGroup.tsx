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
    <section className="tw:flex tw:flex-col tw:border-r tw:border-line tw:px-1.5" aria-label={label}>
      <div className="tw:flex tw:flex-1 tw:items-start tw:gap-0.5">{children}</div>
      <div className="tw:relative tw:px-3.5 tw:pt-0.5 tw:pb-[3px] tw:text-center tw:text-[11px] tw:whitespace-nowrap tw:text-muted">
        {label}
        {onLauncher && (
          <button
            type="button"
            className="tw:absolute tw:right-0 tw:bottom-0.5 tw:cursor-pointer tw:border-0 tw:bg-transparent tw:px-0.5 tw:text-[10px] tw:leading-none tw:text-muted tw:hover:text-fg"
            aria-label={launcherLabel ?? label}
            title={launcherLabel ?? label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onLauncher}
          >
            ⇲
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

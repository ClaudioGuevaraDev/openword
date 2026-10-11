import type { ReactNode } from 'react';
import styles from '../Ribbon.module.css';

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
    <section className={styles.group} aria-label={label}>
      <div className={styles.groupBody}>{children}</div>
      <div className={styles.groupLabel}>
        {label}
        {onLauncher && (
          <button
            type="button"
            className={styles.launcher}
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
  return <div className={styles.row}>{children}</div>;
}

export function RibbonStack({ children }: { readonly children: ReactNode }) {
  return <div className={styles.stack}>{children}</div>;
}

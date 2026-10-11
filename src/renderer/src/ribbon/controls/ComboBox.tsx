// Cuadro combinado de la cinta (fuente, tamaño): se puede escribir o elegir de la lista.
import * as Popover from '@radix-ui/react-popover';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import styles from '../Ribbon.module.css';

export interface ComboOption {
  readonly value: string;
  readonly label: string;
  readonly style?: CSSProperties;
  /** Encabezado de sección (no seleccionable), p. ej. "Fuentes del documento". */
  readonly heading?: boolean;
}

export function ComboBox({
  label,
  value,
  options,
  onCommit,
  width,
  disabled,
  filter = true,
  testId,
}: {
  readonly label: string;
  /** Texto mostrado (vacío si la selección es mixta). */
  readonly value: string;
  readonly options: readonly ComboOption[];
  /** Aplica el valor elegido o escrito. */
  readonly onCommit: (value: string) => void;
  readonly width: number;
  readonly disabled?: boolean;
  /** Filtrar la lista por lo escrito (fuentes sí; tamaños no). */
  readonly filter?: boolean;
  readonly testId?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document.activeElement !== input.current) setDraft(value);
  }, [value]);

  const visible = useMemo(() => {
    if (!filter || !typed || !draft) return options;
    const needle = draft.toLowerCase();
    return options.filter((o) => !o.heading && o.label.toLowerCase().includes(needle));
  }, [options, draft, typed, filter]);

  const selectable = visible.map((o, i) => (o.heading ? -1 : i)).filter((i) => i >= 0);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const commit = (next: string) => {
    setOpen(false);
    setTyped(false);
    if (next.trim()) onCommit(next.trim());
    else setDraft(value);
  };

  return (
    <Popover.Root open={open && !disabled} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div className={styles.combo} style={{ width }}>
          <input
            ref={input}
            className={styles.comboInput}
            aria-label={label}
            title={label}
            role="combobox"
            aria-expanded={open}
            data-testid={testId}
            disabled={disabled}
            value={draft}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              setDraft(e.target.value);
              setTyped(true);
              setOpen(true);
              setActive(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const chosen = active >= 0 ? visible[active] : undefined;
                commit(chosen ? chosen.value : draft);
              } else if (e.key === 'Escape') {
                setDraft(value);
                setOpen(false);
                setTyped(false);
                commit('');
              } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                setOpen(true);
                const pos = selectable.indexOf(active);
                const next =
                  e.key === 'ArrowDown'
                    ? selectable[Math.min(pos + 1, selectable.length - 1)]
                    : selectable[Math.max(pos - 1, 0)];
                if (next !== undefined) setActive(next);
              }
            }}
            onBlur={() => {
              if (!open) {
                setTyped(false);
                setDraft(value);
              }
            }}
          />
          <button
            type="button"
            className={styles.comboArrow}
            aria-label={label}
            tabIndex={-1}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setTyped(false);
              setOpen((o) => !o);
            }}
          >
            ▾
          </button>
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          className={styles.comboList}
          align="start"
          sideOffset={2}
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{ minWidth: width }}
        >
          <div ref={list} role="listbox" aria-label={label}>
            {visible.map((option, index) =>
              option.heading ? (
                <div key={`h-${option.label}`} className={styles.comboHeading}>
                  {option.label}
                </div>
              ) : (
                <div
                  key={`${option.value}-${index}`}
                  role="option"
                  data-index={index}
                  aria-selected={option.value === value}
                  className={
                    index === active
                      ? `${styles.comboOption} ${styles.comboOptionActive}`
                      : styles.comboOption
                  }
                  style={option.style}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commit(option.value)}
                >
                  {option.label}
                </div>
              ),
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

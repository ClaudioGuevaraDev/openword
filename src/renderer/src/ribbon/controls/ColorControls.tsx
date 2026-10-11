// Color de fuente y resaltado: botón dividido (aplica el último color) + paleta.
import * as Popover from '@radix-ui/react-popover';
import { useState, type ReactNode } from 'react';
import { useEditorValueCommand } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import styles from '../Ribbon.module.css';

// Colores del tema Office y colores estándar de Word.
const THEME_COLORS = [
  'FFFFFF',
  '000000',
  'E7E6E6',
  '44546A',
  '4472C4',
  'ED7D31',
  'A5A5A5',
  'FFC000',
  '5B9BD5',
  '70AD47',
];
const STANDARD_COLORS = [
  'C00000',
  'FF0000',
  'FFC000',
  'FFFF00',
  '92D050',
  '00B050',
  '00B0F0',
  '0070C0',
  '002060',
  '7030A0',
];

// Los 15 colores de resaltado de Word (w:highlight) y cómo se ven.
export const HIGHLIGHT_COLORS: readonly (readonly [string, string])[] = [
  ['yellow', 'FFFF00'],
  ['green', '00FF00'],
  ['cyan', '00FFFF'],
  ['magenta', 'FF00FF'],
  ['blue', '0000FF'],
  ['red', 'FF0000'],
  ['darkBlue', '000080'],
  ['darkCyan', '008080'],
  ['darkGreen', '008000'],
  ['darkMagenta', '800080'],
  ['darkRed', '800000'],
  ['darkYellow', '808000'],
  ['darkGray', '808080'],
  ['lightGray', 'C0C0C0'],
  ['black', '000000'],
];

function SplitButton({
  label,
  icon,
  swatch,
  disabled,
  onApply,
  children,
}: {
  readonly label: string;
  readonly icon: ReactNode;
  readonly swatch: string;
  readonly disabled: boolean;
  readonly onApply: () => void;
  readonly children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className={styles.split}>
      <button
        type="button"
        className={styles.button}
        aria-label={label}
        title={label}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onApply}
      >
        <span className={styles.icon}>
          {icon}
          <span className={styles.swatchBar} style={{ background: swatch }} />
        </span>
      </button>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={styles.splitArrow}
            aria-label={`${label}: más colores`}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
          >
            ▾
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className={styles.palette}
            align="start"
            sideOffset={2}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {children(() => setOpen(false))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </span>
  );
}

function Swatch({
  hex,
  title,
  onPick,
}: {
  readonly hex: string;
  readonly title: string;
  readonly onPick: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.swatch}
      style={{ background: `#${hex}` }}
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
    />
  );
}

export function FontColorButton({ icon }: { readonly icon: ReactNode }) {
  const { t } = useTranslation();
  const color = useEditorValueCommand('text.color');
  const [last, setLast] = useState('C00000');
  const apply = (hex: string) => {
    setLast(hex === 'auto' ? last : hex);
    color.execute(hex);
  };
  return (
    <SplitButton
      label={t('home.font.color')}
      icon={icon}
      swatch={`#${last}`}
      disabled={!color.isEnabled}
      onApply={() => apply(last)}
    >
      {(close) => (
        <>
          <button
            type="button"
            className={styles.paletteWide}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => (apply('auto'), close())}
          >
            {t('home.font.automatic')}
          </button>
          <div className={styles.paletteTitle}>{t('home.font.themeColors')}</div>
          <div className={styles.paletteGrid}>
            {THEME_COLORS.map((hex) => (
              <Swatch key={hex} hex={hex} title={`#${hex}`} onPick={() => (apply(hex), close())} />
            ))}
          </div>
          <div className={styles.paletteTitle}>{t('home.font.standardColors')}</div>
          <div className={styles.paletteGrid}>
            {STANDARD_COLORS.map((hex) => (
              <Swatch key={hex} hex={hex} title={`#${hex}`} onPick={() => (apply(hex), close())} />
            ))}
          </div>
        </>
      )}
    </SplitButton>
  );
}

export function HighlightButton({ icon }: { readonly icon: ReactNode }) {
  const { t } = useTranslation();
  const highlight = useEditorValueCommand('text.highlight');
  const [last, setLast] = useState<readonly [string, string]>(HIGHLIGHT_COLORS[0]!);
  const apply = (name: string) => highlight.execute(name);
  return (
    <SplitButton
      label={t('home.font.highlight')}
      icon={icon}
      swatch={`#${last[1]}`}
      disabled={!highlight.isEnabled}
      onApply={() => apply(last[0])}
    >
      {(close) => (
        <>
          <div className={styles.paletteGrid5}>
            {HIGHLIGHT_COLORS.map((entry) => (
              <Swatch
                key={entry[0]}
                hex={entry[1]}
                title={t(`home.highlight.${entry[0]}`)}
                onPick={() => {
                  setLast(entry);
                  apply(entry[0]);
                  close();
                }}
              />
            ))}
          </div>
          <button
            type="button"
            className={styles.paletteWide}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => (apply('none'), close())}
          >
            {t('home.font.noColor')}
          </button>
        </>
      )}
    </SplitButton>
  );
}

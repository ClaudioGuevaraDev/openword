import { ChevronDown12Regular } from '@fluentui/react-icons';
// Color de fuente y resaltado: botón con paleta (la barra muestra el último color elegido).
import { createContext, use, useState, type ReactNode } from 'react';
import { useEditorValueCommand } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import { focusEditor } from '@renderer/editor/document-actions';
import { Popover } from '@renderer/ui/Popover';
import * as rc from '../ribbon-classes';

const paletteGrid = 'tw:grid tw:grid-cols-10 tw:gap-1';

// Colores del tema Office y colores estándar de Word, con su nombre (para el lector de pantalla).
const THEME_COLORS: readonly (readonly [string, string])[] = [
  ['white', 'FFFFFF'],
  ['black', '000000'],
  ['lightGray', 'E7E6E6'],
  ['blueGray', '44546A'],
  ['blue', '4472C4'],
  ['orange', 'ED7D31'],
  ['gray', 'A5A5A5'],
  ['gold', 'FFC000'],
  ['lightBlue', '5B9BD5'],
  ['green', '70AD47'],
];
const STANDARD_COLORS: readonly (readonly [string, string])[] = [
  ['darkRed', 'C00000'],
  ['red', 'FF0000'],
  ['orange', 'FFC000'],
  ['yellow', 'FFFF00'],
  ['lightGreen', '92D050'],
  ['green', '00B050'],
  ['lightBlue', '00B0F0'],
  ['blue', '0070C0'],
  ['darkBlue', '002060'],
  ['purple', '7030A0'],
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

/** Cierra la paleta abierta: lo usan sus botones, en vez de recibirlo por una render prop. */
const ClosePalette = createContext<() => void>(() => {});

/** Botón de color, igual que Espaciado entre líneas: icono con la barra del color y flecha; abre la paleta. */
function ColorMenuButton({
  label,
  icon,
  accent,
  swatch,
  disabled,
  children,
}: {
  readonly label: string;
  readonly icon: ReactNode;
  /** Icono "Accent" de Fluent: la barra de color, dibujada en el hueco que deja el icono. */
  readonly accent: ReactNode;
  readonly swatch: string;
  readonly disabled: boolean;
  readonly children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      className={rc.palette}
      role="dialog"
      aria-label={label}
      anchor={({ anchorStyle, triggerProps }) => (
        <button
          type="button"
          {...triggerProps}
          className={rc.button}
          style={anchorStyle}
          aria-label={label}
          title={label}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className={rc.icon}>
            {icon}
            <span
              className="tw:absolute tw:inset-0 tw:[&>svg]:size-5"
              style={{ color: swatch }}
              aria-hidden="true"
            >
              {accent}
            </span>
          </span>
          <ChevronDown12Regular className={rc.miniArrow} />
        </button>
      )}
    >
      <ClosePalette value={() => setOpen(false)}>{children}</ClosePalette>
    </Popover>
  );
}

/** Botón ancho de la paleta (Automático, Sin color). */
function PaletteButton({ onPick, children }: { readonly onPick: () => void; readonly children: ReactNode }) {
  const close = use(ClosePalette);
  return (
    <button
      type="button"
      className={rc.paletteWide}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        onPick();
        close();
      }}
    >
      {children}
    </button>
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
  const close = use(ClosePalette);
  return (
    <button
      type="button"
      className="tw:aspect-square tw:w-full tw:cursor-pointer tw:border tw:border-black/20 tw:p-0 tw:hover:outline-2 tw:hover:outline-accent"
      style={{ background: `#${hex}` }}
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        onPick();
        close();
      }}
    />
  );
}

export function FontColorButton({ icon, accent }: { readonly icon: ReactNode; readonly accent: ReactNode }) {
  const { t } = useTranslation();
  const color = useEditorValueCommand('text.color');
  const [last, setLast] = useState('C00000');
  const apply = (hex: string) => {
    setLast(hex === 'auto' ? last : hex);
    color.execute(hex);
    setTimeout(focusEditor, 0);
  };
  return (
    <ColorMenuButton
      label={t('home.font.color')}
      icon={icon}
      accent={accent}
      swatch={`#${last}`}
      disabled={!color.isEnabled}
    >
      <PaletteButton onPick={() => apply('auto')}>{t('home.font.automatic')}</PaletteButton>
      <div className={rc.paletteTitle}>{t('home.font.themeColors')}</div>
      <div className={paletteGrid}>
        {THEME_COLORS.map(([name, hex]) => (
          <Swatch key={hex} hex={hex} title={t(`home.colors.${name}`)} onPick={() => apply(hex)} />
        ))}
      </div>
      <div className={rc.paletteTitle}>{t('home.font.standardColors')}</div>
      <div className={paletteGrid}>
        {STANDARD_COLORS.map(([name, hex]) => (
          <Swatch key={hex} hex={hex} title={t(`home.colors.${name}`)} onPick={() => apply(hex)} />
        ))}
      </div>
    </ColorMenuButton>
  );
}

export function HighlightButton({ icon, accent }: { readonly icon: ReactNode; readonly accent: ReactNode }) {
  const { t } = useTranslation();
  const highlight = useEditorValueCommand('text.highlight');
  const [last, setLast] = useState<readonly [string, string]>(HIGHLIGHT_COLORS[0]!);
  const apply = (name: string) => {
    highlight.execute(name);
    setTimeout(focusEditor, 0);
  };
  return (
    <ColorMenuButton
      label={t('home.font.highlight')}
      icon={icon}
      accent={accent}
      swatch={`#${last[1]}`}
      disabled={!highlight.isEnabled}
    >
      <div className="tw:mb-2 tw:grid tw:grid-cols-5 tw:gap-1">
        {HIGHLIGHT_COLORS.map((entry) => (
          <Swatch
            key={entry[0]}
            hex={entry[1]}
            title={t(`home.highlight.${entry[0]}`)}
            onPick={() => {
              setLast(entry);
              apply(entry[0]);
            }}
          />
        ))}
      </div>
      <PaletteButton onPick={() => apply('none')}>{t('home.font.noColor')}</PaletteButton>
    </ColorMenuButton>
  );
}

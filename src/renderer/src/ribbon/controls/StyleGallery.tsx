import { ChevronDown12Regular } from '@fluentui/react-icons';
// Galería de estilos del documento (Inicio › Estilos), con vista previa de cada estilo.
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useDocxEditor, useParagraphStyle } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import { builtInStyleName } from './style-names';
import { cx } from '@renderer/ui/cx';
import { Popover } from '@renderer/ui/Popover';

type StyleOption = ReturnType<typeof useParagraphStyle>['options'][number];

// Medidas de la fila (en px) para calcular cuántas miniaturas caben: ancho mínimo de cada una,
// separación, flecha del desplegable y padding + borde del contenedor a cada lado.
const TILE = 70;
const GAP = 4;
const ARROW = 24;
const INSET = 5;

/** Cuántas miniaturas caben en una galería de `width` px (al menos una). */
function fitCount(width: number): number {
  return Math.max(1, Math.floor((width - INSET * 2 - ARROW + GAP) / (TILE + GAP)));
}

/** Número de miniaturas que caben en el elemento y que se recalcula al cambiar su ancho. */
function useFitCount() {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setCount(fitCount(el.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, count] as const;
}

function previewStyle(option: StyleOption): CSSProperties {
  const p = option.preview;
  return {
    fontFamily: p.fontFamily ? `"${p.fontFamily}"` : undefined,
    fontSize: `${Math.min(Math.max(p.fontSizePt ?? 11, 9), 16)}px`,
    fontWeight: p.bold ? 700 : 400,
    fontStyle: p.italic ? 'italic' : 'normal',
    color: p.color ? `#${p.color.replace(/^#/, '')}` : undefined,
  };
}

export function StyleGallery() {
  const { t } = useTranslation();
  const editor = useDocxEditor();
  const style = useParagraphStyle();
  const [open, setOpen] = useState(false);
  const [galleryRef, visible] = useFitCount();

  const apply = (id: string) => {
    style.setValue(id);
    setOpen(false);
    setTimeout(() => editor?.focus(), 0);
  };

  const nameOf = (option: StyleOption) => builtInStyleName(option.styleId, option.name, t) ?? option.name;

  // En la fila, las miniaturas se estiran (hasta 96 px) para repartir el sobrante; en el
  // desplegable son fijas.
  const tile = (option: StyleOption, inRow = false) => (
    <button
      key={option.styleId}
      type="button"
      aria-pressed={style.value === option.styleId}
      aria-label={nameOf(option)}
      className={cx(
        'tw:flex tw:cursor-pointer tw:flex-col tw:justify-center tw:gap-2 tw:overflow-hidden tw:rounded-md tw:border tw:px-2 tw:py-1.5 tw:text-left tw:font-[family-name:inherit] tw:text-[length:inherit] tw:text-fg tw:transition-colors tw:hover:enabled:bg-hover',
        inRow ? 'tw:max-w-24 tw:min-w-0 tw:flex-1' : 'tw:w-[70px]',
        style.value === option.styleId
          ? 'tw:border-pressed-line tw:bg-pressed'
          : 'tw:border-transparent tw:bg-transparent',
      )}
      title={nameOf(option)}
      disabled={!style.isEnabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => apply(option.styleId)}
    >
      <span
        className="tw:overflow-hidden tw:text-clip tw:whitespace-nowrap"
        style={previewStyle(option)}
        aria-hidden="true"
      >
        AaBbCc
      </span>
      <span className="tw:truncate tw:text-[11px] tw:text-muted">{nameOf(option)}</span>
    </button>
  );

  return (
    <div
      ref={galleryRef}
      className="tw:box-border tw:flex tw:h-21 tw:min-w-[108px] tw:items-stretch tw:gap-1 tw:overflow-hidden tw:rounded-lg tw:border tw:border-line tw:bg-input tw:p-1"
      role="group"
      aria-label={t('home.styles.label')}
      data-testid="style-gallery"
    >
      {style.options.slice(0, visible).map((option) => tile(option, true))}
      <Popover
        open={open}
        onOpenChange={setOpen}
        align="end"
        role="dialog"
        aria-label={t('home.styles.label')}
        className="tw:max-h-[320px] tw:grid-cols-[repeat(5,70px)] tw:gap-1 tw:overflow-y-auto tw:rounded-lg tw:border tw:border-line tw:bg-input tw:p-1.5 tw:shadow-float tw:open:grid tw:[&>button]:h-[64px]"
        anchor={({ anchorStyle, triggerProps }) => (
          <button
            type="button"
            {...triggerProps}
            className="tw:ml-auto tw:inline-flex tw:w-6 tw:flex-none tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-md tw:border-0 tw:bg-transparent tw:p-0 tw:text-muted tw:hover:bg-hover tw:hover:text-accent"
            style={anchorStyle}
            aria-label={t('home.styles.more')}
            title={t('home.styles.more')}
            disabled={!style.isEnabled || style.options.length === 0}
            onMouseDown={(e) => e.preventDefault()}
          >
            <ChevronDown12Regular />
          </button>
        )}
      >
        {style.options.map((option) => tile(option))}
      </Popover>
    </div>
  );
}

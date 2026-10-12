// Galería de estilos del documento (Inicio › Estilos), con vista previa de cada estilo.
import { useState, type CSSProperties } from 'react';
import { useDocxEditor, useParagraphStyle } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import { builtInStyleName } from './style-names';
import { cx } from '@renderer/ui/cx';
import { Popover } from '@renderer/ui/Popover';

type StyleOption = ReturnType<typeof useParagraphStyle>['options'][number];

const VISIBLE = 5;

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

  const apply = (id: string) => {
    style.setValue(id);
    setOpen(false);
    setTimeout(() => editor?.focus(), 0);
  };

  const nameOf = (option: StyleOption) => builtInStyleName(option.styleId, option.name, t) ?? option.name;

  const tile = (option: StyleOption) => (
    <button
      key={option.styleId}
      type="button"
      role="option"
      aria-selected={style.value === option.styleId}
      className={cx(
        'tw:flex tw:w-[70px] tw:cursor-pointer tw:flex-col tw:justify-between tw:overflow-hidden tw:border tw:px-[5px] tw:py-1 tw:text-left tw:font-[family-name:inherit] tw:text-[length:inherit] tw:text-fg tw:hover:enabled:border-line tw:hover:enabled:bg-hover',
        style.value === option.styleId
          ? 'tw:border-pressed-line tw:bg-pressed'
          : 'tw:border-transparent tw:bg-transparent',
      )}
      title={nameOf(option)}
      disabled={!style.isEnabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => apply(option.styleId)}
    >
      <span className="tw:overflow-hidden tw:text-clip tw:whitespace-nowrap" style={previewStyle(option)}>
        AaBbCc
      </span>
      <span className="tw:truncate tw:text-[11px] tw:text-muted">{nameOf(option)}</span>
    </button>
  );

  return (
    <div
      className="tw:flex tw:h-[66px] tw:items-stretch tw:rounded-[3px] tw:border tw:border-line tw:bg-input"
      role="listbox"
      aria-label={t('home.styles.label')}
      data-testid="style-gallery"
    >
      {style.options.slice(0, VISIBLE).map(tile)}
      <Popover
        open={open}
        onOpenChange={setOpen}
        align="end"
        className="tw:max-h-[320px] tw:grid-cols-[repeat(5,70px)] tw:gap-0.5 tw:overflow-y-auto tw:rounded tw:border tw:border-line tw:bg-input tw:p-1 tw:shadow-[0_4px_16px_rgb(0_0_0/20%)] tw:open:grid tw:[&>button]:h-[60px]"
        anchor={({ anchorStyle, triggerProps }) => (
          <button
            type="button"
            {...triggerProps}
            className="tw:w-4 tw:cursor-pointer tw:border-0 tw:border-l tw:border-line tw:bg-transparent tw:p-0 tw:text-[9px] tw:text-muted"
            style={anchorStyle}
            aria-label={t('home.styles.more')}
            title={t('home.styles.more')}
            disabled={!style.isEnabled || style.options.length === 0}
            onMouseDown={(e) => e.preventDefault()}
          >
            ▾
          </button>
        )}
      >
        {style.options.map(tile)}
      </Popover>
    </div>
  );
}

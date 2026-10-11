// Galería de estilos del documento (Inicio › Estilos), con vista previa de cada estilo.
import * as Popover from '@radix-ui/react-popover';
import { useState, type CSSProperties } from 'react';
import { useDocxEditor, useParagraphStyle } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import { builtInStyleName } from './style-names';
import styles from '../Ribbon.module.css';

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
      className={
        style.value === option.styleId ? `${styles.styleTile} ${styles.styleTileActive}` : styles.styleTile
      }
      title={nameOf(option)}
      disabled={!style.isEnabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => apply(option.styleId)}
    >
      <span className={styles.stylePreview} style={previewStyle(option)}>
        AaBbCc
      </span>
      <span className={styles.styleName}>{nameOf(option)}</span>
    </button>
  );

  return (
    <div
      className={styles.gallery}
      role="listbox"
      aria-label={t('home.styles.label')}
      data-testid="style-gallery"
    >
      {style.options.slice(0, VISIBLE).map(tile)}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={styles.galleryMore}
            aria-label={t('home.styles.more')}
            title={t('home.styles.more')}
            disabled={!style.isEnabled || style.options.length === 0}
            onMouseDown={(e) => e.preventDefault()}
          >
            ▾
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className={styles.galleryPopup}
            align="end"
            sideOffset={2}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {style.options.map(tile)}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

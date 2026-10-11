// Pestaña contextual "Imagen" (aparece con una imagen seleccionada).
import {
  FlipHorizontal20Regular,
  FlipVertical20Regular,
  ImageAltText20Regular,
  RotateLeft20Regular,
  RotateRight20Regular,
  Settings20Regular,
  TextWrap20Regular,
} from '@fluentui/react-icons';
import {
  ImagePropertiesTrigger,
  useDocxEditor,
  useEditorState,
  useEditorValueCommand,
} from '@docx-editor.dev/react';
import * as Popover from '@radix-ui/react-popover';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CommandButton } from '../controls/CommandButton';
import { MenuButton } from '../controls/MenuButton';
import { RibbonGroup, RibbonStack } from '../controls/RibbonGroup';
import styles from '../Ribbon.module.css';

const WRAPS = ['inline', 'square', 'tight', 'through', 'topAndBottom', 'behind', 'inFront'] as const;

/** Texto alternativo (accesibilidad): popover con un cuadro de texto. */
function AltTextButton() {
  const { t } = useTranslation();
  const editor = useDocxEditor();
  const altText = useEditorValueCommand('image.altText');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const apply = () => {
    altText.execute(draft);
    setOpen(false);
    editor?.focus();
  };
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(altText.value ?? '');
        setOpen(next);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className={styles.button}
          disabled={!altText.isEnabled}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className={styles.icon}>
            <ImageAltText20Regular />
          </span>
          <span className={styles.label}>{t('picture.size.altText')}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={styles.palette} align="start" sideOffset={2}>
          <div className={styles.paletteTitle}>{t('picture.size.altTextPrompt')}</div>
          <textarea
            className={styles.altText}
            value={draft}
            rows={4}
            aria-label={t('picture.size.altText')}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                apply();
              }
            }}
          />
          <button type="button" className={styles.paletteWide} onClick={apply}>
            {t('picture.size.apply')}
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function PictureTab() {
  const { t } = useTranslation();
  const wrap = useEditorValueCommand('image.wrap');
  // El motor solo cambia el ajuste de imágenes flotantes; las que están en línea no se convierten.
  const inline = useEditorState((s) => s.image?.kind === 'inline');

  return (
    <>
      <RibbonGroup label={t('picture.arrange.label')}>
        <MenuButton
          icon={<TextWrap20Regular />}
          label={t('picture.arrange.wrap')}
          disabled={!wrap.isEnabled}
          disabledReason={inline ? t('picture.wrap.inlineOnly') : wrap.disabledReason}
          testId="image-wrap"
          entries={WRAPS.map((target) => ({
            id: target,
            label: t(`picture.wrap.${target}`),
            checked: wrap.value === target,
            onSelect: () => wrap.execute(target),
          }))}
        />
        <RibbonStack>
          <CommandButton
            command={{ type: 'transformImage', action: 'rotateCW' }}
            icon={<RotateRight20Regular />}
            label={t('picture.arrange.rotateRight')}
            showLabel
          />
          <CommandButton
            command={{ type: 'transformImage', action: 'rotateCCW' }}
            icon={<RotateLeft20Regular />}
            label={t('picture.arrange.rotateLeft')}
            showLabel
          />
        </RibbonStack>
        <RibbonStack>
          <CommandButton
            command={{ type: 'transformImage', action: 'flipH' }}
            icon={<FlipHorizontal20Regular />}
            label={t('picture.arrange.flipH')}
            showLabel
          />
          <CommandButton
            command={{ type: 'transformImage', action: 'flipV' }}
            icon={<FlipVertical20Regular />}
            label={t('picture.arrange.flipV')}
            showLabel
          />
        </RibbonStack>
      </RibbonGroup>
      <RibbonGroup label={t('picture.size.label')}>
        <RibbonStack>
          <ImagePropertiesTrigger asChild>
            <button type="button" className={styles.button} onMouseDown={(e) => e.preventDefault()}>
              <span className={styles.icon}>
                <Settings20Regular />
              </span>
              <span className={styles.label}>{t('picture.size.properties')}</span>
            </button>
          </ImagePropertiesTrigger>
          <AltTextButton />
        </RibbonStack>
      </RibbonGroup>
    </>
  );
}

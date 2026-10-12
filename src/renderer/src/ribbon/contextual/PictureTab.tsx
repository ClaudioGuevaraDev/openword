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
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CommandButton } from '../controls/CommandButton';
import { MenuButton } from '../controls/MenuButton';
import { RibbonGroup, RibbonStack } from '../controls/RibbonGroup';
import { Popover } from '@renderer/ui/Popover';
import * as rc from '../ribbon-classes';

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
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(altText.value ?? '');
        setOpen(next);
      }}
      className={rc.palette}
      role="dialog"
      aria-label={t('picture.size.altText')}
      anchor={({ anchorStyle, triggerProps }) => (
        <button
          type="button"
          {...triggerProps}
          className={rc.button}
          style={anchorStyle}
          disabled={!altText.isEnabled}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className={rc.icon}>
            <ImageAltText20Regular />
          </span>
          <span className={rc.label}>{t('picture.size.altText')}</span>
        </button>
      )}
    >
      <div className={rc.paletteTitle}>{t('picture.size.altTextPrompt')}</div>
      <textarea
        className="tw:mb-1.5 tw:box-border tw:w-full tw:resize-y tw:rounded-md tw:border tw:border-line tw:bg-input tw:p-1 tw:font-[family-name:inherit] tw:text-[length:inherit] tw:text-fg"
        value={draft}
        rows={4}
        autoFocus
        aria-label={t('picture.size.altText')}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            apply();
          }
        }}
      />
      <button type="button" className={rc.paletteWide} onClick={apply}>
        {t('picture.size.apply')}
      </button>
    </Popover>
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
            kind: 'option' as const,
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
            <button type="button" className={rc.button} onMouseDown={(e) => e.preventDefault()}>
              <span className={rc.icon}>
                <Settings20Regular />
              </span>
              <span className={rc.label}>{t('picture.size.properties')}</span>
            </button>
          </ImagePropertiesTrigger>
          <AltTextButton />
        </RibbonStack>
      </RibbonGroup>
    </>
  );
}

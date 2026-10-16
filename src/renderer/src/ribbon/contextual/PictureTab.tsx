// Pestaña contextual "Imagen" (aparece con una imagen seleccionada).
import {
  ArrowReset20Regular,
  FlipHorizontal20Regular,
  FlipVertical20Regular,
  ImageAltText24Regular,
  RotateLeft20Regular,
  RotateRight20Regular,
  Settings20Regular,
  TextWrap20Regular,
} from '@fluentui/react-icons';
import {
  useDocxEditor,
  useEditorCommand,
  useEditorState,
  useEditorValueCommand,
} from '@docx-editor.dev/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CommandButton } from '../controls/CommandButton';
import { MenuButton } from '../controls/MenuButton';
import { RibbonButton } from '../controls/RibbonButton';
import { RibbonGroup, RibbonStack } from '../controls/RibbonGroup';
import { Popover } from '@renderer/ui/Popover';
import { useUiStore } from '@renderer/state/ui-store';
import * as rc from '../ribbon-classes';

const EMU_PER_INCH = 914400;

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
          className={rc.buttonLarge}
          style={anchorStyle}
          disabled={!altText.isEnabled}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className={rc.icon}>
            <ImageAltText24Regular />
          </span>
          <span className={rc.label}>{t('picture.size.altText')}</span>
        </button>
      )}
    >
      <div className={rc.paletteTitle}>{t('picture.size.altTextPrompt')}</div>
      <textarea
        className="tw:mb-2 tw:box-border tw:block tw:w-full tw:resize-y tw:rounded-md tw:border tw:border-line tw:bg-input tw:px-1.5 tw:py-1 tw:font-[family-name:inherit] tw:text-[length:inherit] tw:text-fg tw:outline-none tw:focus:border-accent tw:focus-visible:outline-2 tw:focus-visible:-outline-offset-1 tw:focus-visible:outline-accent"
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
      <div className="tw:flex tw:justify-end">
        <button
          type="button"
          className="tw:cursor-pointer tw:rounded-md tw:border tw:border-line tw:bg-input tw:px-2.5 tw:py-1 tw:font-[family-name:inherit] tw:text-[length:inherit] tw:text-fg tw:hover:bg-hover tw:focus-visible:outline-2 tw:focus-visible:outline-offset-1 tw:focus-visible:outline-accent"
          onClick={apply}
        >
          {t('picture.size.apply')}
        </button>
      </div>
    </Popover>
  );
}

export function PictureTab() {
  const { t } = useTranslation();
  const wrap = useEditorValueCommand('image.wrap');
  // El motor solo cambia el ajuste de imágenes flotantes; las que están en línea no se convierten.
  const inline = useEditorState((s) => s.image?.kind === 'inline');
  const properties = useEditorCommand('image.properties');
  const openImageProperties = useUiStore((s) => s.openImagePropertiesDialog);
  const editor = useDocxEditor();
  const canResize = useEditorState((s) => s.image?.canResize === true);
  // Tamaño original: el del archivo de imagen a su resolución, como el botón "Restablecer
  // tamaño original" del diálogo (resetToNaturalSize del motor no siempre lo tiene a mano).
  const resetSize = () => {
    const image = editor?.getSelectedImage();
    const natural = image?.intrinsic;
    if (!editor || !natural) return;
    editor.exec({
      type: 'setImageProperties',
      widthEmu: Math.round((natural.pixelWidth / natural.dpiX) * EMU_PER_INCH),
      heightEmu: Math.round((natural.pixelHeight / natural.dpiY) * EMU_PER_INCH),
    });
    editor.focus();
  };

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
        <AltTextButton />
        <RibbonStack>
          {/* El diálogo se monta en EditorHost: el trigger de la librería lo pinta junto al
              botón, dentro de la cinta, y queda recortado. */}
          <button
            type="button"
            className={rc.button}
            disabled={!properties.isEnabled}
            title={properties.isEnabled ? undefined : (properties.disabledReason ?? undefined)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={openImageProperties}
          >
            <span className={rc.icon}>
              <Settings20Regular />
            </span>
            <span className={rc.label}>{t('picture.size.properties')}</span>
          </button>
          <RibbonButton
            icon={<ArrowReset20Regular />}
            label={t('picture.size.reset')}
            testId="image-reset-size"
            showLabel
            disabled={!canResize}
            onClick={resetSize}
          />
        </RibbonStack>
      </RibbonGroup>
    </>
  );
}

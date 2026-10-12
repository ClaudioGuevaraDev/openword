// Pestaña Inicio: Portapapeles, Fuente, Párrafo, Estilos y Edición.
import {
  ArrowSwap20Regular,
  Copy20Regular,
  Cut20Regular,
  FontDecrease20Regular,
  FontIncrease20Regular,
  Highlight20Regular,
  HighlightAccent20Filled,
  PaintBrush20Regular,
  Search20Regular,
  SelectAllOn20Regular,
  TextAlignCenter20Regular,
  TextAlignJustify20Regular,
  TextAlignLeft20Regular,
  TextAlignRight20Regular,
  TextBold20Regular,
  TextBulletListLtr20Regular,
  TextClearFormatting20Regular,
  TextColor20Regular,
  TextColorAccent20Filled,
  TextIndentDecreaseLtr20Regular,
  TextIndentIncreaseLtr20Regular,
  TextItalic20Regular,
  TextLineSpacing20Regular,
  TextNumberListLtr20Regular,
  TextParagraph20Regular,
  TextStrikethrough20Regular,
  TextSubscript20Regular,
  TextSuperscript20Regular,
  TextUnderline20Regular,
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import type { UiLanguage } from '@shared/ipc-contract';
import { openFind, openReplace, selectAll, stepSelectionFont } from '@renderer/editor/document-actions';
import { useUiStore } from '@renderer/state/ui-store';
import { FontColorButton, HighlightButton } from '../controls/ColorControls';
import { CommandButton } from '../controls/CommandButton';
import { FontFamilyBox, FontSizeBox } from '../controls/FontControls';
import { LineSpacingMenu } from '../controls/LineSpacingMenu';
import { ListButton } from '../controls/ListButton';
import { PasteButton } from '../controls/PasteButton';
import { RibbonButton } from '../controls/RibbonButton';
import { RibbonGroup, RibbonRow, RibbonStack } from '../controls/RibbonGroup';
import { StyleGallery } from '../controls/StyleGallery';
import { shortcutLabel } from '../shortcut-label';

export function HomeTab({
  language,
  platform,
}: {
  readonly language: UiLanguage;
  readonly platform: 'darwin' | 'other';
}) {
  const { t } = useTranslation();
  const openParagraphDialog = useUiStore((s) => s.openParagraphDialog);
  const k = (combo: string) => shortcutLabel(combo, platform, language);

  return (
    <>
      <RibbonGroup label={t('home.clipboard.label')}>
        <PasteButton shortcut={k('Mod+V')} plainShortcut={k('Mod+Shift+V')} />
        <RibbonStack>
          <CommandButton
            command={{ type: 'cut' }}
            icon={<Cut20Regular />}
            label={t('home.clipboard.cut')}
            shortcut={k('Mod+X')}
            showLabel
          />
          <CommandButton
            command={{ type: 'copy' }}
            icon={<Copy20Regular />}
            label={t('home.clipboard.copy')}
            shortcut={k('Mod+C')}
            showLabel
          />
          <CommandButton
            command="format.painter"
            toggle
            icon={<PaintBrush20Regular />}
            label={t('home.clipboard.formatPainter')}
            shortcut={k('Mod+Alt+C')}
            showLabel
          />
        </RibbonStack>
      </RibbonGroup>

      <RibbonGroup label={t('home.font.label')}>
        <RibbonStack>
          <RibbonRow>
            <FontFamilyBox />
            <FontSizeBox language={language} />
            <RibbonButton
              icon={<FontIncrease20Regular />}
              label={t('home.font.grow')}
              shortcut={k('Mod+Shift+>')}
              onClick={() => stepSelectionFont(1)}
            />
            <RibbonButton
              icon={<FontDecrease20Regular />}
              label={t('home.font.shrink')}
              shortcut={k('Mod+Shift+<')}
              onClick={() => stepSelectionFont(-1)}
            />
            <CommandButton
              command="format.clear"
              icon={<TextClearFormatting20Regular />}
              label={t('home.font.clear')}
            />
          </RibbonRow>
          <RibbonRow layout="spread">
            <CommandButton
              command="text.bold"
              toggle
              icon={<TextBold20Regular />}
              label={t('home.font.bold')}
              shortcut={k('Mod+B')}
              testId="bold"
            />
            <CommandButton
              command="text.italic"
              toggle
              icon={<TextItalic20Regular />}
              label={t('home.font.italic')}
              shortcut={k('Mod+I')}
              testId="italic"
            />
            <CommandButton
              command="text.underline"
              toggle
              icon={<TextUnderline20Regular />}
              label={t('home.font.underline')}
              shortcut={k('Mod+U')}
            />
            <CommandButton
              command="text.strike"
              toggle
              icon={<TextStrikethrough20Regular />}
              label={t('home.font.strike')}
            />
            <CommandButton
              command="script.sub"
              toggle
              icon={<TextSubscript20Regular />}
              label={t('home.font.subscript')}
              shortcut={k('Mod+=')}
            />
            <CommandButton
              command="script.super"
              toggle
              icon={<TextSuperscript20Regular />}
              label={t('home.font.superscript')}
              shortcut={k('Mod+Shift+=')}
            />
            <HighlightButton icon={<Highlight20Regular />} accent={<HighlightAccent20Filled />} />
            <FontColorButton icon={<TextColor20Regular />} accent={<TextColorAccent20Filled />} />
          </RibbonRow>
        </RibbonStack>
      </RibbonGroup>

      <RibbonGroup
        label={t('home.paragraph.label')}
        onLauncher={openParagraphDialog}
        launcherLabel={t('home.paragraph.dialog')}
      >
        <RibbonStack>
          <RibbonRow>
            <ListButton
              command="list.bullet"
              icon={<TextBulletListLtr20Regular />}
              label={t('home.paragraph.bullets')}
            />
            <ListButton
              command="list.numbered"
              icon={<TextNumberListLtr20Regular />}
              label={t('home.paragraph.numbering')}
            />
            <CommandButton
              command="list.outdent"
              icon={<TextIndentDecreaseLtr20Regular />}
              label={t('home.paragraph.outdent')}
              shortcut={k('Mod+Shift+M')}
            />
            <CommandButton
              command="list.indent"
              icon={<TextIndentIncreaseLtr20Regular />}
              label={t('home.paragraph.indent')}
              shortcut={k('Mod+M')}
            />
            <CommandButton
              command="review.paragraphMarks"
              toggle
              icon={<TextParagraph20Regular />}
              label={t('home.paragraph.marks')}
              shortcut={k('Mod+Shift+8')}
            />
          </RibbonRow>
          <RibbonRow>
            <CommandButton
              command="alignment.left"
              toggle
              icon={<TextAlignLeft20Regular />}
              label={t('home.paragraph.alignLeft')}
              shortcut={k('Mod+L')}
            />
            <CommandButton
              command="alignment.center"
              toggle
              icon={<TextAlignCenter20Regular />}
              label={t('home.paragraph.alignCenter')}
              shortcut={k('Mod+E')}
              testId="align-center"
            />
            <CommandButton
              command="alignment.right"
              toggle
              icon={<TextAlignRight20Regular />}
              label={t('home.paragraph.alignRight')}
              shortcut={k('Mod+R')}
            />
            <CommandButton
              command="alignment.justify"
              toggle
              icon={<TextAlignJustify20Regular />}
              label={t('home.paragraph.justify')}
              shortcut={k('Mod+J')}
            />
            <LineSpacingMenu
              icon={<TextLineSpacing20Regular />}
              language={language}
              onMoreOptions={openParagraphDialog}
            />
          </RibbonRow>
        </RibbonStack>
      </RibbonGroup>

      <RibbonGroup label={t('home.styles.label')} grow>
        <StyleGallery />
      </RibbonGroup>

      <RibbonGroup label={t('home.editing.label')}>
        <RibbonStack>
          <RibbonButton
            icon={<Search20Regular />}
            label={t('home.editing.find')}
            shortcut={k('Mod+F')}
            showLabel
            onClick={openFind}
            testId="home-find"
          />
          <RibbonButton
            icon={<ArrowSwap20Regular />}
            label={t('home.editing.replace')}
            shortcut={platform === 'darwin' ? '⌃H' : k('Mod+H')}
            showLabel
            onClick={openReplace}
            testId="home-replace"
          />
          <RibbonButton
            icon={<SelectAllOn20Regular />}
            label={t('home.editing.selectAll')}
            shortcut={k('Mod+A')}
            showLabel
            onClick={selectAll}
          />
        </RibbonStack>
      </RibbonGroup>
    </>
  );
}

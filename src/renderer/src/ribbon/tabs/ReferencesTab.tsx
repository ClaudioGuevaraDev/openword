// Pestaña Referencias: Tabla de contenido y Notas al pie.
import {
  ArrowSync24Regular,
  DocumentBulletList24Regular,
  TextFootnote24Regular,
} from '@fluentui/react-icons';
import { useDocxEditor } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import { CommandButton } from '../controls/CommandButton';
import { RibbonButton } from '../controls/RibbonButton';
import { RibbonGroup } from '../controls/RibbonGroup';
import { shortcutLabel } from '../shortcut-label';

export function ReferencesTab({
  language,
  platform,
}: {
  readonly language: 'es' | 'en';
  readonly platform: 'darwin' | 'other';
}) {
  const { t } = useTranslation();
  const editor = useDocxEditor();
  return (
    <>
      <RibbonGroup label={t('references.toc.label')}>
        <CommandButton
          size="large"
          command="insert.toc"
          icon={<DocumentBulletList24Regular />}
          label={t('references.toc.insert')}
          testId="insert-toc"
        />
        <RibbonButton
          size="large"
          icon={<ArrowSync24Regular />}
          label={t('references.toc.update')}
          tooltip={t('references.toc.updateTooltip')}
          disabled={!editor}
          onClick={() => {
            // Actualiza toda la tabla; si el motor solo puede renumerar páginas, lo hace.
            const result = editor?.exec({ type: 'refreshToc', mode: 'entire' });
            if (result && !result.ok) editor?.exec({ type: 'refreshToc', mode: 'pageNumbers' });
          }}
        />
      </RibbonGroup>
      <RibbonGroup label={t('references.notes.label')}>
        <CommandButton
          size="large"
          command="insert.footnote"
          icon={<TextFootnote24Regular />}
          label={t('references.notes.footnote')}
          shortcut={shortcutLabel('Mod+Alt+F', platform, language)}
          testId="insert-footnote"
        />
        <CommandButton
          size="large"
          command="insert.endnote"
          icon={<TextFootnote24Regular />}
          label={t('references.notes.endnote')}
          shortcut={shortcutLabel('Mod+Alt+D', platform, language)}
        />
      </RibbonGroup>
    </>
  );
}

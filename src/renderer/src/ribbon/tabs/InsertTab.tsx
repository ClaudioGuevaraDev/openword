// Pestaña Insertar: Páginas, Tablas, Ilustraciones, Vínculos, Encabezado y pie, Texto.
import {
  DocumentFooter24Regular,
  DocumentHeader24Regular,
  DocumentPageBreak24Regular,
  Image24Regular,
  Link24Regular,
  NumberSymbol24Regular,
  Table24Regular,
  Textbox24Regular,
} from '@fluentui/react-icons';
import { useDocxEditor, useEditorCommand, useHyperlinkPopup } from '@docx-editor.dev/react';
import { commandForSlot, type DocxEditorInstance } from '@docx-editor.dev/core';
import { useTranslation } from 'react-i18next';
import { insertImage } from '@renderer/editor/insert-image';
import { useDocumentStore } from '@renderer/state/document-store';
import { CommandButton } from '../controls/CommandButton';
import { MenuButton } from '../controls/MenuButton';
import { RibbonButton } from '../controls/RibbonButton';
import { RibbonGroup } from '../controls/RibbonGroup';
import { TableGridPicker } from '../controls/TableGridPicker';
import { shortcutLabel } from '../shortcut-label';

/** Número de página como en Word: entra al encabezado/pie, inserta el campo y lo centra. */
export function insertPageNumber(
  editor: DocxEditorInstance,
  position: 'header' | 'footer',
  field: 'PAGE' | 'PAGE_X_OF_Y',
): void {
  editor.exec({ type: 'editHeaderFooter', position });
  const center = commandForSlot('alignment.center');
  if (center) editor.exec(center);
  editor.exec({ type: 'insertPageField', field });
}

export function InsertTab({
  language,
  platform,
}: {
  readonly language: 'es' | 'en';
  readonly platform: 'darwin' | 'other';
}) {
  const { t } = useTranslation();
  const editor = useDocxEditor();
  const link = useHyperlinkPopup();
  const canInsertTable = useEditorCommand({ type: 'insertTable', rows: 1, cols: 1 }).isEnabled;
  const setError = useDocumentStore((s) => s.setError);

  const pickImage = async () => {
    if (!editor) return;
    const picked = await window.openword.file.pickImage();
    if (!picked) return;
    const error = await insertImage(editor, picked.bytes, picked.name);
    if (error) setError(error);
    editor.focus();
  };

  return (
    <>
      <RibbonGroup label={t('insert.pages.label')}>
        <CommandButton
          size="large"
          command="insert.pageBreak"
          icon={<DocumentPageBreak24Regular />}
          label={t('insert.pages.pageBreak')}
          shortcut={shortcutLabel('Mod+Enter', platform, language)}
          testId="insert-page-break"
        />
      </RibbonGroup>

      <RibbonGroup label={t('insert.table.label')}>
        <TableGridPicker
          icon={<Table24Regular />}
          label={t('insert.table.button')}
          disabled={!canInsertTable}
          onPick={(rows, cols) => {
            editor?.exec({ type: 'insertTable', rows, cols });
            editor?.focus();
          }}
        />
      </RibbonGroup>

      <RibbonGroup label={t('insert.illustrations.label')}>
        <RibbonButton
          size="large"
          icon={<Image24Regular />}
          label={t('insert.illustrations.image')}
          onClick={() => void pickImage()}
          testId="insert-image"
        />
      </RibbonGroup>

      <RibbonGroup label={t('insert.links.label')}>
        <RibbonButton
          size="large"
          icon={<Link24Regular />}
          label={t('insert.links.link')}
          shortcut={shortcutLabel('Mod+K', platform, language)}
          onClick={() => link.openAtCaret()}
          testId="insert-link"
        />
      </RibbonGroup>

      <RibbonGroup label={t('insert.headerFooter.label')}>
        <RibbonButton
          size="large"
          icon={<DocumentHeader24Regular />}
          label={t('insert.headerFooter.header')}
          onClick={() => editor?.exec({ type: 'editHeaderFooter', position: 'header' })}
          testId="insert-header"
        />
        <RibbonButton
          size="large"
          icon={<DocumentFooter24Regular />}
          label={t('insert.headerFooter.footer')}
          onClick={() => editor?.exec({ type: 'editHeaderFooter', position: 'footer' })}
          testId="insert-footer"
        />
        <MenuButton
          icon={<NumberSymbol24Regular />}
          label={t('insert.headerFooter.pageNumber')}
          testId="insert-page-number"
          disabled={!editor}
          entries={[
            {
              id: 'top',
              label: t('insert.headerFooter.pageTop'),
              onSelect: () => editor && insertPageNumber(editor, 'header', 'PAGE'),
            },
            {
              id: 'bottom',
              label: t('insert.headerFooter.pageBottom'),
              onSelect: () => editor && insertPageNumber(editor, 'footer', 'PAGE'),
            },
            {
              id: 'xofy',
              label: t('insert.headerFooter.pageXofY'),
              onSelect: () => editor && insertPageNumber(editor, 'footer', 'PAGE_X_OF_Y'),
            },
          ]}
        />
      </RibbonGroup>

      <RibbonGroup label={t('insert.text.label')}>
        <CommandButton
          size="large"
          command="insert.textBox"
          icon={<Textbox24Regular />}
          label={t('insert.text.textBox')}
        />
      </RibbonGroup>
    </>
  );
}

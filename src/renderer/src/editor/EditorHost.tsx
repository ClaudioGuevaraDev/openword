// Monta el motor docx-editor con nuestra propia interfaz alrededor (sin su barra empaquetada).
// Referencia: examples/vite/src/ComposedEditorDemo.tsx de eigenpal/docx-editor v2.27.0.
import type { ReactNode } from 'react';
import { DocxEditor, LocaleProvider, useFonts } from '@docx-editor.dev/react';
import { es } from '@docx-editor.dev/i18n/es';
import { en } from '@docx-editor.dev/i18n/en';
import type { DocumentSource } from '@docx-editor.dev/core';
import '@docx-editor.dev/core/styles/editor.css';
import type { UiLanguage } from '@shared/ipc-contract';
import { bundledFonts } from './fonts';
import styles from './EditorHost.module.css';

interface EditorHostProps {
  readonly document: DocumentSource;
  readonly language: UiLanguage;
  /** Cinta de opciones: va dentro de Root para poder usar los hooks del motor. */
  readonly ribbon: ReactNode;
  readonly statusBar: ReactNode;
}

export function EditorHost({ document, language, ribbon, statusBar }: EditorHostProps) {
  const fonts = useFonts(bundledFonts);

  return (
    <LocaleProvider i18n={language === 'es' ? es : en}>
      <DocxEditor.Root
        document={document}
        // Siempre "edit": si se omite, un documento con w:trackRevisions abre en modo
        // sugerencias, que requiere la licencia Pro.
        mode="edit"
        fonts={fonts}
        locale={language === 'es' ? 'es-ES' : 'en-US'}
        onFontError={(error) => console.warn(`[fuentes] ${error.code}: ${error.message}`)}
      >
        {ribbon}
        <div className={styles.workspace}>
          <DocxEditor.Viewport className={styles.viewport} data-testid="editor-viewport">
            {/* Una composición propia debe montar estas partes por nombre o no habrá UI
                para editar encabezados, pies y notas. */}
            <DocxEditor.HeaderFooterChrome />
            <DocxEditor.NotesChrome />
            <DocxEditor.Content />
            <DocxEditor.ContextMenu />
            <DocxEditor.HyperLink />
          </DocxEditor.Viewport>
          <DocxEditor.Loading overlay />
        </div>
        {statusBar}
      </DocxEditor.Root>
    </LocaleProvider>
  );
}

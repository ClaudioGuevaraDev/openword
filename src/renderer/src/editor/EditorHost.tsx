// Monta el motor docx-editor con nuestra propia interfaz alrededor (sin su barra empaquetada).
// Referencia: examples/vite/src/ComposedEditorDemo.tsx de eigenpal/docx-editor v2.27.0.
import type { ReactNode } from 'react';
import { DocxEditor, LocaleProvider, useFonts } from '@docx-editor.dev/react';
import { es } from '@docx-editor.dev/i18n/es';
import { en } from '@docx-editor.dev/i18n/en';
import type { DocumentSource } from '@docx-editor.dev/core';
import '@docx-editor.dev/core/styles/editor.css';
import type { UiLanguage } from '@shared/ipc-contract';
import { useUiStore } from '@renderer/state/ui-store';
import { DocumentSession } from './DocumentSession';
import { bundledFonts, systemFonts } from './fonts';
import styles from './EditorHost.module.css';

interface EditorHostProps {
  readonly document: DocumentSource;
  readonly language: UiLanguage;
  /** Cinta de opciones: va dentro de Root para poder usar los hooks del motor. */
  readonly ribbon: ReactNode;
  /** Barra de avisos bajo la cinta (macros, plantilla, errores). */
  readonly notices: ReactNode;
  readonly statusBar: ReactNode;
  /** Documento nuevo en blanco (puede reutilizarse para abrir un archivo). */
  readonly isNew: boolean;
}

export function EditorHost({ document, language, ribbon, notices, statusBar, isNew }: EditorHostProps) {
  // El primero gana: fuente real del sistema y, si no existe, el sustituto métrico.
  const fonts = useFonts(systemFonts, bundledFonts);
  const paragraphDialogOpen = useUiStore((s) => s.paragraphDialogOpen);
  const closeParagraphDialog = useUiStore((s) => s.closeParagraphDialog);

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
        <DocumentSession isNew={isNew} />
        {ribbon}
        {notices}
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
          <DocxEditor.ParagraphDialog open={paragraphDialogOpen} onClose={closeParagraphDialog} />
        </div>
        {statusBar}
      </DocxEditor.Root>
    </LocaleProvider>
  );
}

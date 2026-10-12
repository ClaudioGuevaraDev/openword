// Monta el motor docx-editor con nuestra propia interfaz alrededor (sin su barra empaquetada).
// Referencia: examples/vite/src/ComposedEditorDemo.tsx de eigenpal/docx-editor v2.27.0.
import type { ReactNode } from 'react';
import { DocxEditor, LocaleProvider, useChromeTranslate, useFonts } from '@docx-editor.dev/react';
import { es } from '@docx-editor.dev/i18n/es';
import { en } from '@docx-editor.dev/i18n/en';
import type { DocumentSource } from '@docx-editor.dev/core';
import '@docx-editor.dev/core/styles/editor.css';
import type { UiLanguage } from '@shared/ipc-contract';
import { useUiStore } from '@renderer/state/ui-store';
import { DocumentSession } from './DocumentSession';
import { bundledFonts, systemFonts } from './fonts';
import { ReplaceDialog } from './ReplaceDialog';
import { SpellChecker } from './spelling/SpellChecker';
import { SpellingMenu } from './spelling/SpellingMenu';

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
  /** Documento recuperado: empieza "con cambios" hasta que se guarde. */
  readonly startDirty?: boolean;
}

/**
 * Menú contextual con las piezas del motor (traducidas), y las sugerencias del corrector
 * arriba como en Word. Las filas de tabla y tabla de contenido solo aparecen donde aplican.
 */
function EditorContextMenu() {
  const t = useChromeTranslate();
  const M = DocxEditor.ContextMenu;
  return (
    <M t={t} preset={false}>
      <SpellingMenu />
      <M.Cut />
      <M.Copy />
      <M.Paste />
      <M.PasteWithoutFormatting />
      <M.Separator />
      <M.Slot slot="format.painter" />
      <M.Slot slot="text.link" />
      <M.InsertRowAbove />
      <M.InsertRowBelow />
      <M.InsertColumnLeft />
      <M.InsertColumnRight />
      <M.DeleteTableRow />
      <M.DeleteTableColumn />
      <M.DeleteTable />
      <M.CellVerticalAlignment />
      <M.RefreshToc />
      <M.RefreshTocPageNumbers />
      <M.Separator />
      <M.SelectAll />
    </M>
  );
}

export function EditorHost({
  document,
  language,
  ribbon,
  notices,
  statusBar,
  isNew,
  startDirty = false,
}: EditorHostProps) {
  // El primero gana: fuente real del sistema y, si no existe, el sustituto métrico.
  const fonts = useFonts(systemFonts, bundledFonts);
  const ui = useUiStore();
  const rulerUnit = ui.unit === 'in' ? 'inch' : 'cm';

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
        <DocumentSession isNew={isNew} startDirty={startDirty} />
        <SpellChecker />
        {ribbon}
        {notices}
        {ui.showRulers && (
          <div
            className="tw:flex tw:min-h-6 tw:flex-none tw:justify-center-safe tw:overflow-hidden tw:border-b tw:border-line tw:bg-canvas tw:py-0.5"
            data-testid="ruler"
          >
            <DocxEditor.HorizontalRuler unit={rulerUnit} />
          </div>
        )}
        <div className="tw:relative tw:flex tw:min-h-0 tw:flex-1 tw:items-stretch tw:bg-canvas">
          <DocxEditor.Navigation
            open={ui.navigationOpen}
            onOpenChange={(open) => ui.setNavigation(open)}
            tab={ui.navigationTab}
            onTabChange={ui.setNavigationTab}
            paneWidth={280}
          />
          <DocxEditor.Viewport className="tw:min-h-0 tw:flex-1 tw:overflow-auto">
            {ui.showRulers && (
              <div className="tw:pointer-events-none tw:absolute tw:top-6 tw:left-0 tw:z-10">
                <DocxEditor.VerticalRuler unit={rulerUnit} />
              </div>
            )}
            {/* Una composición propia debe montar estas partes por nombre o no habrá UI
                para editar encabezados, pies y notas. */}
            <DocxEditor.HeaderFooterChrome />
            <DocxEditor.NotesChrome />
            <DocxEditor.Content />
            <EditorContextMenu />
            <DocxEditor.HyperLink />
          </DocxEditor.Viewport>
          <DocxEditor.Loading overlay />
          <DocxEditor.ParagraphDialog open={ui.paragraphDialogOpen} onClose={ui.closeParagraphDialog} />
          <DocxEditor.PageSetupDialog open={ui.pageSetupDialogOpen} onClose={ui.closePageSetupDialog} />
          <ReplaceDialog open={ui.replaceDialogOpen} onClose={() => ui.setReplaceDialogOpen(false)} />
        </div>
        {statusBar}
      </DocxEditor.Root>
    </LocaleProvider>
  );
}

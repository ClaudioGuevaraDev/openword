// Atajos de nivel de aplicación (los de edición, como Ctrl+B, los maneja el motor).
import {
  backspaceRemovesList,
  closeWindow,
  focusEditor,
  newDocument,
  openDocument,
  openFind,
  openPrint,
  openReplace,
  saveDocument,
  stepSelectionFont,
} from '@renderer/editor/document-actions';
import { useUiStore } from '@renderer/state/ui-store';
import { matchShortcut, type Platform } from './shortcut-map';

const ESCAPE_OWNERS =
  '[role="dialog"], [role="menu"], [role="listbox"], [role="combobox"], [popover]:popover-open';

function escapeBelongsToWidget(): boolean {
  const focused = document.activeElement;
  return focused instanceof Element && focused.closest(ESCAPE_OWNERS) !== null;
}

export function installAppShortcuts(platform: Platform): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing || e.defaultPrevented) return;
    // Esc cierra el cuadro Buscar y reemplazar aunque el foco esté en el documento. Si el foco
    // está en el propio cuadro, en un menú o en otra ventana emergente, Esc es de ellos.
    if (e.key === 'Escape' && useUiStore.getState().replaceDialogOpen && !escapeBelongsToWidget()) {
      e.preventDefault();
      e.stopPropagation();
      useUiStore.getState().setReplaceDialogOpen(false);
      focusEditor();
      return;
    }
    // Antes que el motor (que escucha en burbuja e ignora los eventos ya atendidos).
    if (backspaceRemovesList(e)) {
      e.preventDefault();
      return;
    }
    const { backstageOpen, closeBackstage } = useUiStore.getState();
    const action = matchShortcut(e, platform, backstageOpen);
    if (!action) return;
    e.preventDefault();
    e.stopPropagation();
    if (backstageOpen && action !== 'print') closeBackstage();
    switch (action) {
      case 'new':
        newDocument();
        break;
      case 'open':
        void openDocument();
        break;
      case 'save':
        void saveDocument('save');
        break;
      case 'saveAs':
        void saveDocument('saveAs');
        break;
      case 'close':
        closeWindow();
        break;
      case 'growFont':
        stepSelectionFont(1);
        break;
      case 'shrinkFont':
        stepSelectionFont(-1);
        break;
      case 'print':
        openPrint();
        break;
      case 'find':
        openFind();
        break;
      case 'replace':
        openReplace();
        break;
      case 'backstageBack':
        break;
    }
  };
  window.addEventListener('keydown', onKeyDown, true);
  return () => window.removeEventListener('keydown', onKeyDown, true);
}

const DOCUMENT_FILE = /\.(docx|docm|dotx|dotm|doc|rtf|odt)$/i;

/** Soltar documentos sobre la ventana los abre (las imágenes siguen yendo al motor). */
export function installDocumentDrop(): () => void {
  const documentFiles = (e: DragEvent) =>
    [...(e.dataTransfer?.files ?? [])].filter((f) => DOCUMENT_FILE.test(f.name));
  // Durante dragover Chromium no expone los nombres de archivo: solo sabemos que hay archivos.
  // Permitimos soltar (preventDefault) sin detener la propagación, para que el motor siga
  // mostrando el cursor de inserción si es una imagen.
  const onDragOver = (e: DragEvent) => {
    if (![...(e.dataTransfer?.items ?? [])].some((item) => item.kind === 'file')) return;
    e.preventDefault();
  };
  const onDrop = (e: DragEvent) => {
    const files = documentFiles(e);
    if (files.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    void window.openword.file.openDropped(files);
  };
  window.addEventListener('dragover', onDragOver, true);
  window.addEventListener('drop', onDrop, true);
  return () => {
    window.removeEventListener('dragover', onDragOver, true);
    window.removeEventListener('drop', onDrop, true);
  };
}

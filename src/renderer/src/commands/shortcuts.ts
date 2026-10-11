// Atajos de nivel de aplicación (los de edición, como Ctrl+B, los maneja el motor).
import { closeWindow, newDocument, openDocument, saveDocument } from '@renderer/editor/document-actions';
import { useUiStore } from '@renderer/state/ui-store';
import { matchShortcut, type Platform } from './shortcut-map';

export function installAppShortcuts(platform: Platform): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing || e.defaultPrevented) return;
    const action = matchShortcut(e, platform, useUiStore.getState().activeTab === 'file');
    if (!action) return;
    e.preventDefault();
    e.stopPropagation();
    if (useUiStore.getState().activeTab === 'file') useUiStore.getState().setActiveTab('home');
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

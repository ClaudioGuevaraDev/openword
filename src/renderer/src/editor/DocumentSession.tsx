// Vive dentro de DocxEditor.Root: sigue la revisión del documento para saber si hay
// cambios sin guardar, y ejecuta el guardado (bytes del motor → main).
import { useCallback, useEffect, useRef } from 'react';
import { useDocxEditor, useEditorEvent } from '@docx-editor.dev/react';
import type { DocumentChange } from '@docx-editor.dev/core';
import { useDocumentStore } from '@renderer/state/document-store';
import { registerSave, type SaveMode } from './document-actions';

export function DocumentSession({ isNew }: { readonly isNew: boolean }) {
  const editor = useDocxEditor();
  const savedRevision = useRef<number | null>(null);
  const everChanged = useRef(false);
  const setDirty = useDocumentStore((s) => s.setDirty);

  const report = useCallback(
    (dirty: boolean) => {
      if (dirty) everChanged.current = true;
      setDirty(dirty);
      window.openword.doc.setState({ dirty, untouched: isNew && !everChanged.current });
    },
    [isNew, setDirty],
  );

  // Línea base: la revisión con la que se abrió el documento.
  useEffect(() => {
    if (!editor) return;
    savedRevision.current = editor.getDocumentHandle().revision;
    report(false);
  }, [editor, report]);

  useEditorEvent('change', (change: DocumentChange) => {
    if (change.source === 'load' || savedRevision.current === null) {
      savedRevision.current = change.revision;
      return;
    }
    report(change.revision !== savedRevision.current);
  });

  useEditorEvent('error', (error: { message?: string }) => {
    useDocumentStore.getState().setError(error.message ?? String(error));
  });

  const save = useCallback(
    async (mode: SaveMode): Promise<boolean> => {
      if (!editor) return false;
      const store = useDocumentStore.getState();
      if (store.busy) return false;
      store.setBusy(true);
      try {
        const buffer = await editor.save();
        // Los bytes corresponden a esta revisión (lo que se escriba después sigue pendiente).
        const revision = editor.getDocumentHandle().revision;
        const bytes = new Uint8Array(buffer);
        const result =
          mode === 'saveAs' ? await window.openword.doc.saveAs(bytes) : await window.openword.doc.save(bytes);
        if (result.status === 'saved') {
          savedRevision.current = revision;
          store.setDisplayName(result.displayName);
          report(editor.getDocumentHandle().revision !== revision);
          return true;
        }
        if (result.status === 'error') store.setError(result.message);
        return false;
      } catch (error) {
        store.setError((error as Error).message);
        return false;
      } finally {
        useDocumentStore.getState().setBusy(false);
      }
    },
    [editor, report],
  );

  useEffect(() => {
    registerSave(save);
    return () => registerSave(null);
  }, [save]);

  // Main pide guardar al cerrar la ventana con cambios.
  useEffect(
    () =>
      window.openword.doc.onSaveRequest((requestId) => {
        void save('save').then((saved) => window.openword.doc.answerSaveRequest(requestId, saved));
      }),
    [save],
  );

  return null;
}

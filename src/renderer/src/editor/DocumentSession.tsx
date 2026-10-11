// Vive dentro de DocxEditor.Root: sigue la revisión del documento para saber si hay
// cambios sin guardar, y ejecuta el guardado (bytes del motor → main).
import { useCallback, useEffect, useRef } from 'react';
import { useDocxEditor, useEditorEvent } from '@docx-editor.dev/react';
import type { DocumentChange } from '@docx-editor.dev/core';
import { useDocumentStore } from '@renderer/state/document-store';
import { useSettingsStore } from '@renderer/state/settings-store';
import { redo, registerEditor, registerSave, undo, type SaveMode } from './document-actions';

let recoverIntervalOverride: number | undefined;
/** Solo pruebas: acorta el intervalo de recuperación automática. */
export function setRecoverIntervalOverride(ms: number | undefined): void {
  recoverIntervalOverride = ms;
}

export function DocumentSession({
  isNew,
  startDirty,
}: {
  readonly isNew: boolean;
  readonly startDirty: boolean;
}) {
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

  useEffect(() => {
    registerEditor(editor);
    return () => registerEditor(null);
  }, [editor]);

  // Deshacer / Rehacer desde el menú nativo de macOS.
  useEffect(() => window.openword.menu.onCommand((command) => (command === 'undo' ? undo() : redo())), []);

  // Línea base: la revisión con la que se abrió el documento. Un documento recuperado
  // empieza con cambios (su contenido no está guardado en ningún archivo).
  useEffect(() => {
    if (!editor) return;
    savedRevision.current = startDirty ? -1 : editor.getDocumentHandle().revision;
    report(startDirty);
  }, [editor, report, startDirty]);

  // Recuperación automática: cada N minutos, si hay cambios nuevos, se guarda una copia.
  const autoRecoverMinutes = useSettingsStore((s) => s.settings.autoRecoverMinutes);
  const lastSnapshot = useRef<number | null>(null);
  useEffect(() => {
    if (!editor || autoRecoverMinutes <= 0) return;
    const id = setInterval(
      () => {
        const revision = editor.getDocumentHandle().revision;
        const dirty = useDocumentStore.getState().dirty;
        if (!dirty || revision === lastSnapshot.current) return;
        lastSnapshot.current = revision;
        void editor
          .save()
          .then((buffer) => window.openword.recovery.snapshot(new Uint8Array(buffer)))
          .catch((error: unknown) => console.warn('[recuperación]', error));
      },
      recoverIntervalOverride ?? autoRecoverMinutes * 60_000,
    );
    return () => clearInterval(id);
  }, [editor, autoRecoverMinutes]);

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

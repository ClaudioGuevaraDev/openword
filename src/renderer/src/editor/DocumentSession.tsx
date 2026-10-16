// Vive dentro de DocxEditor.Root: sigue la revisión del documento para saber si hay
// cambios sin guardar, y ejecuta el guardado (bytes del motor → main).
import { useCallback, useEffect, useRef } from 'react';
import { useDocxEditor, useEditorEvent } from '@docx-editor.dev/react';
import type { DocumentChange } from '@docx-editor.dev/core';
import { useDocumentStore } from '@renderer/state/document-store';
import { useSettingsStore } from '@renderer/state/settings-store';
import { redo, registerEditor, registerSave, undo, type SaveMode } from './document-actions';
import { remoteErrorMessage } from '@shared/errors';

/** Parte de encabezado o pie que el motor crea al entrar en una sección que no la tiene. */
const HEADER_FOOTER_PART = /^\/word\/(header|footer)\d*\.xml$/;

/** Encabezado o pie recién creado al entrar, mientras no se haya escrito nada en él. */
interface CreatedOnEntry {
  readonly part: string;
  /** Revisión tras crearlo: si sigue siendo esta al salir, no se tocó. */
  readonly revision: number;
  /** El documento estaba guardado justo antes de crearlo. */
  readonly wasClean: boolean;
  readonly everChanged: boolean;
}

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
  const lastRevision = useRef<number | null>(null);
  const createdOnEntry = useRef<CreatedOnEntry | null>(null);
  const restoring = useRef<Pick<CreatedOnEntry, 'wasClean' | 'everChanged'> | null>(null);
  const editingFurniture = useRef<'header' | 'footer' | null>(null);

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
      lastRevision.current = change.revision;
      createdOnEntry.current = null;
      return;
    }
    const restored = restoring.current;
    restoring.current = null;
    if (restored) {
      // Se deshizo un encabezado o pie vacío: el documento vuelve a estar como antes de entrar.
      if (restored.wasClean) savedRevision.current = change.revision;
      everChanged.current = restored.everChanged;
    } else {
      const part = change.created?.find((name) => HEADER_FOOTER_PART.test(name));
      createdOnEntry.current =
        part && lastRevision.current !== null
          ? {
              part,
              revision: change.revision,
              wasClean: lastRevision.current === savedRevision.current,
              everChanged: everChanged.current,
            }
          : null;
    }
    lastRevision.current = change.revision;
    report(change.revision !== savedRevision.current);
  });

  // Entrar en un encabezado o pie que la sección no tiene lo crea vacío (Insertar › Pie de
  // página, doble clic en la banda). Si se sale sin escribir nada (Esc, clic en el cuerpo,
  // Cerrar), se deshace esa creación: cancelar no deja un pie vacío ni el documento con cambios.
  useEditorEvent('selectionChange', () => {
    if (!editor) return;
    const state = editor.getHeaderFooterState();
    const editing = state?.editing ?? null;
    const previous = editingFurniture.current;
    editingFurniture.current = editing;
    const created = createdOnEntry.current;
    if (editing && !previous) {
      // Solo cuenta si se entró justo en la parte recién creada.
      if (created && state?.partName !== created.part) createdOnEntry.current = null;
      return;
    }
    if (!previous || editing) return;
    createdOnEntry.current = null;
    if (!created || editor.getDocumentHandle().revision !== created.revision) return;
    // Fuera del aviso del motor: deshacer mientras sale del ámbito lo dejaría a medias.
    queueMicrotask(() => {
      if (editor.getDocumentHandle().revision !== created.revision) return;
      restoring.current = { wasClean: created.wasClean, everChanged: created.everChanged };
      editor.exec({ type: 'undo' });
      // El aviso de cambio del undo llega dentro de exec: si no llegó (undo rechazado), el
      // siguiente cambio real no debe tomarse por esta restauración.
      restoring.current = null;
    });
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
        store.setError(remoteErrorMessage(error));
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

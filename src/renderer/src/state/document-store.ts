import { create } from 'zustand';
import type { LoadedDocument } from '@shared/ipc-contract';

interface DocumentState {
  /** Documento cargado en la ventana (null mientras llega de main). */
  readonly doc: LoadedDocument | null;
  /** Cambia en cada carga: remonta el editor. */
  readonly loadSeq: number;
  readonly displayName: string;
  readonly dirty: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  load(doc: LoadedDocument): void;
  setDirty(dirty: boolean): void;
  setDisplayName(name: string): void;
  setBusy(busy: boolean): void;
  setError(error: string | null): void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  doc: null,
  loadSeq: 0,
  displayName: '',
  dirty: false,
  busy: false,
  error: null,
  load: (doc) =>
    set((s) => ({ doc, loadSeq: s.loadSeq + 1, displayName: doc.displayName, dirty: false, error: null })),
  setDirty: (dirty) => set({ dirty }),
  setDisplayName: (displayName) => set({ displayName }),
  setBusy: (busy) => set({ busy }),
  setError: (error) => set({ error }),
}));

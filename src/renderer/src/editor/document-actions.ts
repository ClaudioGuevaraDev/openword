// Acciones de archivo que dependen del editor montado. DocumentSession registra la
// implementación; la cinta, la vista Archivo y los atajos solo llaman a estas funciones.

export type SaveMode = 'save' | 'saveAs';

let saveImpl: ((mode: SaveMode) => Promise<boolean>) | null = null;

export function registerSave(impl: ((mode: SaveMode) => Promise<boolean>) | null): void {
  saveImpl = impl;
}

/** Guarda el documento. Devuelve true si quedó guardado. */
export function saveDocument(mode: SaveMode = 'save'): Promise<boolean> {
  return saveImpl ? saveImpl(mode) : Promise.resolve(false);
}

export const newDocument = () => window.openword.file.newDocument();
export const openDocument = () => window.openword.file.openDialog();
export const closeWindow = () => window.openword.file.closeWindow();

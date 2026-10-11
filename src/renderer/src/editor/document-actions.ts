// Acciones que dependen del editor montado. DocumentSession registra la implementación;
// la cinta, la vista Archivo, los atajos y el menú nativo solo llaman a estas funciones.
import { commandForSlotValue, type DocxEditorInstance } from '@docx-editor.dev/core';
import { stepFontSize } from '@shared/font-size';
import { useUiStore } from '@renderer/state/ui-store';

export type SaveMode = 'save' | 'saveAs';

let saveImpl: ((mode: SaveMode) => Promise<boolean>) | null = null;
let currentEditor: DocxEditorInstance | null = null;

export function registerSave(impl: ((mode: SaveMode) => Promise<boolean>) | null): void {
  saveImpl = impl;
}

export function registerEditor(editor: DocxEditorInstance | null): void {
  currentEditor = editor;
}

/** Guarda el documento. Devuelve true si quedó guardado. */
export function saveDocument(mode: SaveMode = 'save'): Promise<boolean> {
  return saveImpl ? saveImpl(mode) : Promise.resolve(false);
}

export const newDocument = () => window.openword.file.newDocument();
export const openDocument = () => window.openword.file.openDialog();
export const closeWindow = () => window.openword.file.closeWindow();

/** Tamaño de la selección en puntos (null si es mixto). */
function selectionFontSize(editor: DocxEditorInstance): number | null {
  const size = editor.snapshot().formatting?.fontSizePt;
  return typeof size === 'number' ? size : null;
}

/** Agrandar / Reducir fuente con los pasos de Word. */
export function stepSelectionFont(direction: 1 | -1): void {
  const editor = currentEditor;
  if (!editor) return;
  const next = stepFontSize(selectionFontSize(editor) ?? 11, direction);
  const command = commandForSlotValue('font.size', next * 2); // medios puntos
  if (command) editor.exec(command);
}

export function undo(): void {
  currentEditor?.exec({ type: 'undo' });
}

export function redo(): void {
  currentEditor?.exec({ type: 'redo' });
}

export function selectAll(): void {
  currentEditor?.exec({ type: 'selectAll' });
  currentEditor?.focus();
}

/** Pegar desde la cinta: el motor recibe el contenido; lo leemos del portapapeles del sistema. */
export async function pasteFromClipboard(plainText = false): Promise<void> {
  const editor = currentEditor;
  if (!editor) return;
  const { text, html } = await window.openword.clipboard.read();
  if (!text && !html) return;
  editor.focus();
  if (plainText || !html) editor.exec({ type: 'pasteWithoutFormatting', text });
  else editor.exec({ type: 'paste', text, html });
}

/** Ctrl+F: panel de navegación en la pestaña de búsqueda (como Word). */
export function openFind(): void {
  useUiStore.getState().setReplaceDialogOpen(false);
  useUiStore.getState().setNavigation(true, 'find');
}

/** Ctrl+H: cuadro Buscar y reemplazar. */
export function openReplace(): void {
  useUiStore.getState().setReplaceDialogOpen(true);
}

/** Bytes del documento tal como está ahora (sin guardarlo en disco). */
export async function currentDocumentBytes(): Promise<Uint8Array | null> {
  return currentEditor ? new Uint8Array(await currentEditor.save()) : null;
}

/** Ctrl+P: vista Archivo › Imprimir, como en Word. */
export function openPrint(): void {
  useUiStore.getState().setBackstageSection('print');
  useUiStore.getState().setActiveTab('file');
}

/** Devuelve el foco al documento (tras elegir algo en un menú o paleta de la cinta). */
export function focusEditor(): void {
  currentEditor?.focus();
}

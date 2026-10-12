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

/** "Párrafo de lista": el estilo con la sangría que el motor pone al activar viñetas o números. */
function isListParagraphStyle(editor: DocxEditorInstance, styleId: string | null): boolean {
  if (!styleId) return false;
  if (styleId.toLowerCase() === 'listparagraph') return true;
  // Word en español lo guarda con otro id (p. ej. "Prrafodelista"), pero el nombre es el inglés.
  const style = editor.getDocumentStyles().find((s) => s.styleId === styleId);
  return style?.name.toLowerCase() === 'list paragraph';
}

/**
 * Quita la lista (viñetas o números) de los párrafos de la selección, en un solo paso de deshacer.
 * El motor, al desactivar, solo borra la numeración y deja el estilo Párrafo de lista con su
 * sangría; aquí se quita también, como hace Word, para que el texto vuelva a su sitio.
 */
export function removeListFromSelection(): boolean {
  const editor = currentEditor;
  const surface = editor?.surface;
  if (!editor || !surface?.isListParagraph()) return false;
  const entries: { localName: string; remove: true }[] = [{ localName: 'numPr', remove: true }];
  if (isListParagraphStyle(editor, surface.formatting().styleId)) {
    entries.push({ localName: 'pStyle', remove: true });
  }
  surface.setParagraphProperties(entries);
  return true;
}

/**
 * Retroceso al inicio de un elemento de lista quita la viñeta o el número, como en Word (el motor
 * uniría el párrafo con el anterior). Devuelve true si se ocupó de la tecla.
 */
export function backspaceRemovesList(e: KeyboardEvent): boolean {
  if (e.key !== 'Backspace' || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return false;
  const target = e.target instanceof Element ? e.target : null;
  if (!target?.closest('.docx-editor') || target.closest('input, textarea')) return false;
  const surface = currentEditor?.surface;
  if (!surface) return false;
  const { anchor, head } = surface.state().selection;
  const atStart =
    anchor.paragraphId === head.paragraphId && anchor.offset === head.offset && head.offset === 0;
  if (!atStart || !surface.isListParagraph()) return false;
  return removeListFromSelection();
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
  useUiStore.getState().openBackstage('print');
}

/** Devuelve el foco al documento (tras elegir algo en un menú o paleta de la cinta). */
export function focusEditor(): void {
  currentEditor?.focus();
}

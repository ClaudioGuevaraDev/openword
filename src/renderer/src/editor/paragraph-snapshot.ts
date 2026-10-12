// Texto de los párrafos del documento, consultado una sola vez por revisión: el corrector y
// el contador de palabras recorren el mismo documento tras cada cambio y comparten la consulta.
import type { DocxEditorInstance } from '@docx-editor.dev/core';

export interface ParagraphText {
  readonly text: string;
}

let cached: { editor: DocxEditorInstance; revision: number; paragraphs: readonly ParagraphText[] } | null =
  null;

export function paragraphTexts(editor: DocxEditorInstance): readonly ParagraphText[] {
  const revision = editor.getDocumentHandle().revision;
  if (cached?.editor !== editor || cached.revision !== revision) {
    const paragraphs = editor.query({ type: 'paragraphs' }) as readonly ParagraphText[];
    cached = { editor, revision, paragraphs };
  }
  return cached.paragraphs;
}

/** Ejecuta un trabajo de fondo cuando el hilo principal está libre (como mucho, tras `timeout` ms). */
export function whenIdle(work: () => void, timeout = 1000): () => void {
  const id = requestIdleCallback(work, { timeout });
  return () => cancelIdleCallback(id);
}

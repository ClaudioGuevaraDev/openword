// Reemplazo de coincidencias. El motor 2.27 declara replaceMatch/replaceAllMatches pero no
// los implementa; se reemplaza seleccionando la coincidencia y escribiendo encima, con los
// comandos que sí soporta (setSelection + pasteWithoutFormatting / deleteText).
import type { DocxEditorInstance, ExecResult, TextMatch } from '@docx-editor.dev/core';

export function replaceOneMatch(editor: DocxEditorInstance, match: TextMatch, text: string): ExecResult {
  const selected = editor.exec({
    type: 'setSelection',
    range: {
      anchor: { paragraphId: match.blockId, offset: match.start },
      head: { paragraphId: match.blockId, offset: match.start + match.length },
    },
  });
  if (!selected.ok) return selected;
  return text ? editor.exec({ type: 'pasteWithoutFormatting', text }) : editor.exec({ type: 'deleteText' });
}

/**
 * Reemplaza todas las coincidencias de atrás hacia adelante (así no se corren las
 * posiciones de las que faltan). Devuelve cuántas se reemplazaron y el último error.
 */
export function replaceAllMatches(
  editor: DocxEditorInstance,
  matches: readonly TextMatch[],
  text: string,
): { replaced: number; error: string | null } {
  const ordered = [...matches].sort((a, b) => b.paragraphIndex - a.paragraphIndex || b.start - a.start);
  let replaced = 0;
  let error: string | null = null;
  for (const match of ordered) {
    const result = replaceOneMatch(editor, match, text);
    if (result.ok) replaced++;
    else error = 'reason' in result ? String(result.reason) : 'error';
  }
  return { replaced, error };
}

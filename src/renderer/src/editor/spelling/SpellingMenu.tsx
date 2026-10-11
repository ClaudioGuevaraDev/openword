// Sugerencias del corrector al hacer clic derecho sobre una palabra subrayada.
import { DocxEditor, useDocxEditor } from '@docx-editor.dev/react';
import { useTranslation } from 'react-i18next';
import { replaceOneMatch } from '../replace-text';
import { ignoredWords, requestSpellingRecheck, SPELLING_HIGHLIGHT, type SpellingRange } from './SpellChecker';

// Posición del último clic derecho (el menú se arma en ese momento).
let lastContextPoint: { x: number; y: number } | null = null;
window.addEventListener('contextmenu', (e) => (lastContextPoint = { x: e.clientX, y: e.clientY }), true);

export function SpellingMenu() {
  const { t } = useTranslation();
  const editor = useDocxEditor();
  const point = lastContextPoint;
  const hit =
    editor && point
      ? editor.getHighlightsAt<SpellingRange>(point.x, point.y).find((h) => h.name === SPELLING_HIGHLIGHT)
      : undefined;
  if (!hit || !editor) return null;
  const word = hit.range.word;
  const suggestions = window.openword.spell.suggestions(word);

  const replace = (text: string) => {
    // start/length del hit son la posición actual (el motor los actualiza al editar).
    replaceOneMatch(editor, { blockId: hit.range.blockId, start: hit.start, length: hit.length }, text);
    editor.focus();
  };

  return (
    <>
      <DocxEditor.ContextMenu.Group label={t('spelling.group', { word })}>
        {suggestions.length === 0 ? (
          <DocxEditor.ContextMenu.Item label={t('spelling.noSuggestions')} disabled />
        ) : (
          suggestions.map((s) => (
            <DocxEditor.ContextMenu.Item key={s} label={s} onSelect={() => replace(s)} />
          ))
        )}
        <DocxEditor.ContextMenu.Item
          label={t('spelling.ignoreAll')}
          onSelect={() => {
            ignoredWords.add(word);
            requestSpellingRecheck();
          }}
        />
        <DocxEditor.ContextMenu.Item
          label={t('spelling.addToDictionary')}
          onSelect={() => {
            window.openword.spell.addToDictionary(word);
            requestSpellingRecheck();
          }}
        />
      </DocxEditor.ContextMenu.Group>
      <DocxEditor.ContextMenu.Separator />
    </>
  );
}

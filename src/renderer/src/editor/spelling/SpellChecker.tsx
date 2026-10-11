// Corrector ortográfico propio. El motor desactiva el corrector nativo en su superficie
// editable, así que OpenWord revisa las palabras con el diccionario de Chromium
// (webFrame.isWordMisspelled vía preload) y las subraya con los resaltados del motor.
//
// Cada revisión: (1) palabras únicas del texto con veredicto en caché, (2) una sola pasada
// de findMatches con todas las mal escritas (da las posiciones que entiende el motor),
// (3) setHighlights. Se repite tras una pausa al escribir.
import { useCallback, useEffect, useRef } from 'react';
import { useDocxEditor, useEditorEvent } from '@docx-editor.dev/react';
import type { DocumentChange } from '@docx-editor.dev/core';
import { spellTokens } from '@shared/spell-tokens';
import { useSettingsStore } from '@renderer/state/settings-store';

export const SPELLING_HIGHLIGHT = 'spelling';
const PAUSE_MS = 500;

export interface SpellingRange {
  readonly blockId: string;
  readonly start: number;
  readonly length: number;
  /** El motor descarta el subrayado si el texto en esa posición ya no coincide. */
  readonly expectedText: string;
  readonly word: string;
}

/** Palabras omitidas en esta sesión ("Omitir todo"). */
export const ignoredWords = new Set<string>();
const verdicts = new Map<string, boolean>();

function isMisspelled(word: string): boolean {
  if (ignoredWords.has(word)) return false;
  let verdict = verdicts.get(word);
  if (verdict === undefined) {
    verdict = window.openword.spell.isMisspelled(word);
    verdicts.set(word, verdict);
  }
  return verdict;
}

export function SpellChecker() {
  const editor = useDocxEditor();
  const spell = useSettingsStore((s) => s.settings.spellcheck);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const check = useCallback(() => {
    if (!editor) return;
    if (!spell.enabled) {
      editor.clearHighlights(SPELLING_HIGHLIGHT);
      return;
    }
    const paragraphs = editor.query({ type: 'paragraphs' }) as readonly { readonly text: string }[];
    const misspelled = new Set<string>();
    for (const p of paragraphs) {
      for (const token of spellTokens(p.text, spell))
        if (isMisspelled(token.word)) misspelled.add(token.word);
    }
    const words = [...misspelled];
    const results = words.length > 0 ? editor.findMatches(words, { matchCase: true, wholeWord: true }) : [];
    const ranges: SpellingRange[] = [];
    results.forEach((matches, i) => {
      for (const m of matches)
        ranges.push({
          blockId: m.blockId,
          start: m.start,
          length: m.length,
          expectedText: m.text,
          word: words[i]!,
        });
    });
    editor.setHighlights(SPELLING_HIGHLIGHT, ranges, {
      className: 'ow-misspelled',
      color: 'transparent',
      priority: -10,
    });
  }, [editor, spell]);

  const schedule = useCallback(
    (delay: number) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(check, delay);
    },
    [check],
  );

  useEffect(() => {
    schedule(0);
    return () => clearTimeout(timer.current);
  }, [schedule]);

  // Se revisa al hacer una pausa al escribir (no se subraya la palabra a medio escribir).
  useEditorEvent('change', (change: DocumentChange) => schedule(change.source === 'load' ? 0 : PAUSE_MS));

  // "Agregar al diccionario" u "Omitir todo": revisar de nuevo.
  useEffect(() => {
    const onRecheck = () => schedule(0);
    window.addEventListener('ow:spelling-recheck', onRecheck);
    return () => window.removeEventListener('ow:spelling-recheck', onRecheck);
  }, [schedule]);

  return null;
}

export function requestSpellingRecheck(): void {
  verdicts.clear();
  window.dispatchEvent(new Event('ow:spelling-recheck'));
}

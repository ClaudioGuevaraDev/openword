import { describe, expect, it } from 'vitest';
import type { DocxEditorInstance, TextMatch } from '@docx-editor.dev/core';
import { replaceAllMatches } from '../../src/renderer/src/editor/replace-text';
import { matchShortcut } from '../../src/renderer/src/commands/shortcut-map';

const match = (paragraphIndex: number, start: number): TextMatch =>
  ({
    blockId: `p${paragraphIndex}`,
    start,
    length: 4,
    paragraphIndex,
    runIndex: 0,
    runOffset: start,
    text: 'gato',
  }) as TextMatch;

describe('replaceAllMatches', () => {
  it('reemplaza de atrás hacia adelante para no correr las posiciones', () => {
    const calls: string[] = [];
    const editor = {
      exec(command: {
        type: string;
        range?: { anchor: { paragraphId: string; offset: number } };
        text?: string;
      }) {
        calls.push(
          command.type === 'setSelection'
            ? `sel ${command.range!.anchor.paragraphId}:${command.range!.anchor.offset}`
            : `${command.type} ${command.text ?? ''}`,
        );
        return { ok: true };
      },
    } as unknown as DocxEditorInstance;
    const result = replaceAllMatches(editor, [match(0, 0), match(1, 5), match(0, 10)], 'felino');
    expect(result).toEqual({ replaced: 3, error: null });
    expect(calls.filter((c) => c.startsWith('sel'))).toEqual(['sel p1:5', 'sel p0:10', 'sel p0:0']);
    expect(calls).toContain('pasteWithoutFormatting felino');
  });

  it('reemplazar por nada borra el texto', () => {
    const types: string[] = [];
    const editor = {
      exec: (c: { type: string }) => (types.push(c.type), { ok: true }),
    } as unknown as DocxEditorInstance;
    replaceAllMatches(editor, [match(0, 0)], '');
    expect(types).toEqual(['setSelection', 'deleteText']);
  });
});

describe('atajos Buscar / Reemplazar', () => {
  const k = (key: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>>) => ({
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...mods,
  });
  it('Ctrl+F / Ctrl+H en Windows y Linux', () => {
    expect(matchShortcut(k('f', { ctrlKey: true }), 'other', false)).toBe('find');
    expect(matchShortcut(k('h', { ctrlKey: true }), 'other', false)).toBe('replace');
  });
  it('macOS: ⌘F busca, Ctrl+H reemplaza y ⌘H queda para ocultar la app', () => {
    expect(matchShortcut(k('f', { metaKey: true }), 'darwin', false)).toBe('find');
    expect(matchShortcut(k('h', { ctrlKey: true }), 'darwin', false)).toBe('replace');
    expect(matchShortcut(k('h', { metaKey: true }), 'darwin', false)).toBeNull();
  });
});

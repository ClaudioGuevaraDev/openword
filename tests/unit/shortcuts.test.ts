import { describe, expect, it } from 'vitest';
import { matchShortcut } from '../../src/renderer/src/commands/shortcut-map';

const key = (
  k: string,
  mods: Partial<Record<'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey', boolean>> = {},
) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

describe('matchShortcut', () => {
  it('Windows/Linux usan Ctrl', () => {
    expect(matchShortcut(key('s', { ctrlKey: true }), 'other', false)).toBe('save');
    expect(matchShortcut(key('S', { ctrlKey: true, shiftKey: true }), 'other', false)).toBe('saveAs');
    expect(matchShortcut(key('n', { ctrlKey: true }), 'other', false)).toBe('new');
    expect(matchShortcut(key('o', { ctrlKey: true }), 'other', false)).toBe('open');
    expect(matchShortcut(key('w', { ctrlKey: true }), 'other', false)).toBe('close');
    expect(matchShortcut(key('s', { metaKey: true }), 'other', false)).toBeNull();
  });
  it('macOS usa ⌘ y deja ⌘W al menú', () => {
    expect(matchShortcut(key('s', { metaKey: true }), 'darwin', false)).toBe('save');
    expect(matchShortcut(key('s', { ctrlKey: true }), 'darwin', false)).toBeNull();
    expect(matchShortcut(key('w', { metaKey: true }), 'darwin', false)).toBeNull();
  });
  it('F12 es Guardar como; Esc solo cierra la vista Archivo', () => {
    expect(matchShortcut(key('F12'), 'other', false)).toBe('saveAs');
    expect(matchShortcut(key('Escape'), 'other', true)).toBe('backstageBack');
    expect(matchShortcut(key('Escape'), 'other', false)).toBeNull();
  });
  it('no roba atajos de edición del motor', () => {
    expect(matchShortcut(key('b', { ctrlKey: true }), 'other', false)).toBeNull();
    expect(matchShortcut(key('n', { ctrlKey: true, altKey: true }), 'other', false)).toBeNull();
  });
});

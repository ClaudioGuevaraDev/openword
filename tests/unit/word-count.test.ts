import { describe, expect, it } from 'vitest';
import { countWords, countWordsInParagraphs } from '../../src/shared/word-count';

describe('countWords', () => {
  it('cuenta como Word', () => {
    expect(countWords('Hola mundo')).toBe(2);
    expect(countWords('  Año   nuevo,  vida nueva. ')).toBe(4);
    expect(countWords('correo@ejemplo.com 3,14 — fin')).toBe(3);
    expect(countWords('')).toBe(0);
    expect(countWords('… — ¡')).toBe(0);
  });
  it('cada carácter CJK es una palabra', () => {
    expect(countWords('你好世界')).toBe(4);
    expect(countWords('OpenWord 日本語')).toBe(4);
  });
  it('suma párrafos', () => {
    expect(countWordsInParagraphs([{ text: 'Uno dos' }, { text: '' }, { text: 'tres' }])).toBe(3);
  });
});

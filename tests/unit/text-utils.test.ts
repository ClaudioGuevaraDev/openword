import { describe, expect, it } from 'vitest';
import { formatFontSize, parseFontSize, stepFontSize } from '../../src/shared/font-size';
import { countWords, countWordsInParagraphs } from '../../src/shared/word-count';

describe('stepFontSize (Agrandar/Reducir de Word)', () => {
  it.each([
    [11, 1, 12],
    [12, 1, 14],
    [10, 1, 10.5],
    [13, 1, 14],
    [72, 1, 80],
    [80, 1, 90],
    [12, -1, 11],
    [8, -1, 7],
    [1, -1, 1],
    [80, -1, 72],
    [95, -1, 90],
  ] as const)('%d %s → %d', (from, dir, to) => {
    expect(stepFontSize(from, dir)).toBe(to);
  });
});

describe('parseFontSize', () => {
  it('acepta coma o punto y redondea a medio punto', () => {
    expect(parseFontSize('10,5')).toBe(10.5);
    expect(parseFontSize(' 12 ')).toBe(12);
    expect(parseFontSize('11.3')).toBe(11.5);
  });
  it('rechaza valores inválidos', () => {
    expect(parseFontSize('abc')).toBeNull();
    expect(parseFontSize('0')).toBeNull();
    expect(parseFontSize('2000')).toBeNull();
    expect(parseFontSize('')).toBeNull();
  });
  it('muestra la coma decimal en español', () => {
    expect(formatFontSize(10.5, 'es')).toBe('10,5');
    expect(formatFontSize(10.5, 'en')).toBe('10.5');
  });
});

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

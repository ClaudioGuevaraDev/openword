import { describe, expect, it } from 'vitest';
import { formatFontSize, parseFontSize, stepFontSize } from '../../src/shared/font-size';

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

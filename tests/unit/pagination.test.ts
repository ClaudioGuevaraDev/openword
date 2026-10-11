import { describe, expect, it } from 'vitest';
import { comparePagination, type PdfPage } from '../fidelity/pdf-text';

const page = (text: string): PdfPage => ({ width: 612, height: 792, words: text.split(' ') });

describe('comparePagination', () => {
  it('paginación idéntica: mismos saltos de página', () => {
    const word = [page('Uno dos tres'), page('cuatro cinco')];
    expect(comparePagination([page('Uno dos tres'), page('Cuatro cinco.')], word)).toEqual({
      pages: { ours: 2, word: 2 },
      matchingBreaks: 2,
      firstMismatch: null,
    });
  });
  it('detecta la primera página donde el salto cae distinto', () => {
    const word = [page('Uno dos tres'), page('cuatro cinco'), page('seis')];
    const ours = [page('Uno dos'), page('tres cuatro cinco'), page('seis')];
    expect(comparePagination(ours, word)).toMatchObject({ matchingBreaks: 1, firstMismatch: 1 });
  });
  it('una página de más o de menos cuenta como diferencia', () => {
    expect(comparePagination([page('a b')], [page('a b'), page('c')])).toMatchObject({
      pages: { ours: 1, word: 2 },
      firstMismatch: 2,
    });
  });
});

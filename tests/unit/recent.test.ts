import { describe, expect, it } from 'vitest';
import { parseRecentFiles } from '../../src/main/documents/recent';

describe('parseRecentFiles', () => {
  it('conserva las entradas válidas y descarta las dañadas una a una', () => {
    const ok = { path: '/docs/a.docx', name: 'a.docx', folder: '/docs', openedAt: 1 };
    expect(parseRecentFiles([ok, null, { path: 3 }, { ...ok, openedAt: 'ayer' }, 'x'])).toEqual([ok]);
  });
  it('un archivo que no es una lista no tiene recientes', () => {
    expect(parseRecentFiles({ path: '/a' })).toEqual([]);
    expect(parseRecentFiles(null)).toEqual([]);
  });
});

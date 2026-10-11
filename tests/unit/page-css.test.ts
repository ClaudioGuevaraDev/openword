import { describe, expect, it } from 'vitest';
import { pageCss } from '../../src/renderer/src/print/page-css';

describe('pageCss', () => {
  it('un @page por tamaño distinto, asignado a cada página por su índice', () => {
    const { css, sizes } = pageCss([
      { index: 0, width: 793.8, height: 1122.67 },
      { index: 1, width: 793.8, height: 1122.67 },
      { index: 2, width: 1122.67, height: 793.8 },
    ]);
    expect(sizes).toEqual(['794x1123', '1123x794']);
    expect(css).toContain('@page ow0 { size: 793.8px 1122.67px; margin: 0; }');
    expect(css).toContain('@page ow1 { size: 1122.67px 793.8px; margin: 0; }');
    expect(css).toContain(
      '.docx-page[data-page-index="1"] { page: ow0; width: 793.8px !important; height: 1122.67px !important; }',
    );
    expect(css).toContain(
      '.docx-page[data-page-index="2"] { page: ow1; width: 1122.67px !important; height: 793.8px !important; }',
    );
    expect(css).toContain('break-after: page');
    expect(css).toContain('.docx-page[data-page-index="2"] { break-after: auto !important; }');
  });
});

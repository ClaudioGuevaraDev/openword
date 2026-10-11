// CSS de impresión para las páginas pintadas por el motor. Las medidas de getPageGeometry()
// vienen en px CSS (96 ppp), así que @page usa px. El motor recrea los elementos .docx-page
// al repintar: los selectores usan su propio data-page-index en lugar de marcas nuestras.

export interface PageBox {
  readonly index: number;
  readonly width: number;
  readonly height: number;
}

export function pageCss(pages: readonly PageBox[]): { css: string; sizes: string[] } {
  const named = new Map<string, string>();
  const rules: string[] = [];
  for (const page of pages) {
    const w = Math.round(page.width * 100) / 100;
    const h = Math.round(page.height * 100) / 100;
    const key = `${Math.round(w)}x${Math.round(h)}`;
    if (!named.has(key)) {
      named.set(key, `ow${named.size}`);
      rules.push(`@page ow${named.size - 1} { size: ${w}px ${h}px; margin: 0; }`);
    }
    // Alto y ancho exactos: el motor redondea al píxel (1123 px para 1122,67) y esa fracción
    // desbordaría la hoja, generando una página en blanco.
    rules.push(
      `.docx-page[data-page-index="${page.index}"] { page: ${named.get(key)}; width: ${w}px !important; height: ${h}px !important; }`,
    );
  }
  // Sin salto después de la última página (si no, Chromium agrega una hoja en blanco).
  const last = pages.reduce((max, page) => Math.max(max, page.index), 0);
  rules.push(`.docx-page[data-page-index="${last}"] { break-after: auto !important; }`);
  const css = `${rules.join('\n')}
html, body { margin: 0; padding: 0; background: #fff; }
@media print {
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  #print-root, #print-root * { box-shadow: none !important; }
  /* El motor fija la altura de pantalla (páginas + separaciones): sobraría una hoja en blanco. */
  #print-root, #print-root .docx-pages { height: auto !important; min-height: 0 !important; }
  /* Capas de interacción (selección, resaltados, tablas) que no se imprimen. */
  .docx-table-furniture, .docx-comment-overlay, .docx-text-highlight-overlay,
  .docx-remote-selection-overlay, .docx-selection-overlay, .docx-text-form-status { display: none !important; }
  .docx-page {
    position: relative !important; left: 0 !important; top: 0 !important;
    transform: none !important; margin: 0 !important;
    break-after: page; break-inside: avoid; overflow: hidden !important;
  }
}`;
  return { css, sizes: [...named.keys()] };
}

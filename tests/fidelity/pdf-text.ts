// Texto por página de un PDF (pdf.js en Node), para comparar la paginación con Word.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface PdfPage {
  readonly width: number;
  readonly height: number;
  readonly words: readonly string[];
}

export async function pdfPages(data: Uint8Array): Promise<PdfPage[]> {
  const task = getDocument({ data: data.slice(), useSystemFonts: false, disableFontFace: true });
  const doc = await task.promise;
  const pages: PdfPage[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
      pages.push({
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
        words: text.split(/\s+/u).filter((w) => /[\p{L}\p{N}]/u.test(w)),
      });
    }
  } finally {
    await task.destroy();
  }
  return pages;
}

export interface PageComparison {
  readonly pages: { readonly ours: number; readonly word: number };
  /** Páginas cuyo primer y último término coinciden con Word (el salto de página cae igual). */
  readonly matchingBreaks: number;
  readonly firstMismatch: number | null;
}

const norm = (w: string | undefined) =>
  (w ?? '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase();

export function comparePagination(ours: readonly PdfPage[], word: readonly PdfPage[]): PageComparison {
  let matching = 0;
  let firstMismatch: number | null = null;
  for (let i = 0; i < Math.min(ours.length, word.length); i++) {
    const a = ours[i]!;
    const b = word[i]!;
    const same = norm(a.words[0]) === norm(b.words[0]) && norm(a.words.at(-1)) === norm(b.words.at(-1));
    if (same) matching++;
    else firstMismatch ??= i + 1;
  }
  if (firstMismatch === null && ours.length !== word.length)
    firstMismatch = Math.min(ours.length, word.length) + 1;
  return { pages: { ours: ours.length, word: word.length }, matchingBreaks: matching, firstMismatch };
}

// Conteo de palabras como la barra de estado de Word: secuencias separadas por espacios;
// en chino, japonés y coreano cada carácter cuenta como una palabra.

const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/u;
const CJK_GLOBAL = new RegExp(CJK.source, 'gu');
const HAS_WORD_CHAR = /[\p{L}\p{N}]/u;

export function countWords(text: string): number {
  let count = 0;
  for (const token of text.split(/\s+/u)) {
    if (!token) continue;
    if (CJK.test(token)) {
      count += token.match(CJK_GLOBAL)?.length ?? 0;
      const rest = token.replace(CJK_GLOBAL, ' ').trim();
      if (rest) count += rest.split(/\s+/u).filter((t) => HAS_WORD_CHAR.test(t)).length;
    } else if (HAS_WORD_CHAR.test(token)) {
      count += 1;
    }
  }
  return count;
}

export function countWordsInParagraphs(paragraphs: readonly { readonly text: string }[]): number {
  let total = 0;
  for (const p of paragraphs) total += countWords(p.text);
  return total;
}

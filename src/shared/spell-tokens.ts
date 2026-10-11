// Palabras de un párrafo para el corrector, con su posición (offsets UTF-16, como el motor).

export interface WordToken {
  readonly word: string;
  readonly start: number;
  readonly length: number;
}

export interface TokenOptions {
  readonly ignoreUppercase: boolean;
  readonly ignoreWithNumbers: boolean;
}

// Letras, marcas (tildes combinadas), dígitos y apóstrofos/guiones internos.
const TOKEN = /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*/gu;
const HAS_LETTER = /\p{L}/u;
const HAS_DIGIT = /\p{N}/u;
const HAS_LOWER = /\p{Ll}/u;

// Correos, direcciones web y rutas: se tapan con espacios (mismas posiciones) antes de separar.
const NOT_WORDS = /\S*(?:@|:\/\/|www\.)\S*|\S*[\\/]\S*[\\/]\S*/giu;

export function spellTokens(text: string, options: TokenOptions): WordToken[] {
  const masked = text.replace(NOT_WORDS, (m) => ' '.repeat(m.length));
  const tokens: WordToken[] = [];
  for (const match of masked.matchAll(TOKEN)) {
    const word = match[0];
    const start = match.index;
    if (!HAS_LETTER.test(word) || word.length < 2) continue;
    if (options.ignoreWithNumbers && HAS_DIGIT.test(word)) continue;
    if (options.ignoreUppercase && !HAS_LOWER.test(word)) continue;
    tokens.push({ word, start, length: word.length });
  }
  return tokens;
}

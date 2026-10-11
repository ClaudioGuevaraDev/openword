// Tamaños de fuente como en Word: la lista del selector y los pasos de Agrandar/Reducir fuente.

export const FONT_SIZE_PRESETS = [
  8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72,
] as const;

export const MIN_FONT_SIZE = 1;
export const MAX_FONT_SIZE = 1638;

/** Agrandar (Ctrl+Mayús+>) / Reducir (Ctrl+Mayús+<): siguiente valor de la lista; por encima de 72, de 10 en 10. */
export function stepFontSize(current: number, direction: 1 | -1): number {
  if (direction === 1) {
    const next = FONT_SIZE_PRESETS.find((size) => size > current);
    if (next !== undefined) return next;
    return Math.min(MAX_FONT_SIZE, Math.floor(current / 10) * 10 + 10);
  }
  if (current > 72) return Math.max(72, Math.ceil(current / 10) * 10 - 10);
  const previous = [...FONT_SIZE_PRESETS].reverse().find((size) => size < current);
  return previous ?? Math.max(MIN_FONT_SIZE, current - 1);
}

/** Interpreta lo que el usuario escribe en el cuadro de tamaño ("12", "10,5", "10.5"). Word usa medios puntos. */
export function parseFontSize(input: string): number | null {
  const value = Number(input.trim().replace(',', '.'));
  if (!Number.isFinite(value) || value < MIN_FONT_SIZE || value > MAX_FONT_SIZE) return null;
  return Math.round(value * 2) / 2;
}

export function formatFontSize(points: number, language: 'es' | 'en'): string {
  return language === 'es' ? String(points).replace('.', ',') : String(points);
}

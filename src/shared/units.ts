// Unidades de medida de la interfaz: Word usa pulgadas en EE. UU. y centímetros en el resto.

export type MeasureUnit = 'cm' | 'in';

export const TWIPS_PER_INCH = 1440;
export const TWIPS_PER_CM = 1440 / 2.54;

export function unitForRegion(region: string | null): MeasureUnit {
  return region === 'US' || region === 'LR' || region === 'MM' ? 'in' : 'cm';
}

export function twipsToUnit(twips: number, unit: MeasureUnit): number {
  return twips / (unit === 'in' ? TWIPS_PER_INCH : TWIPS_PER_CM);
}

export function unitToTwips(value: number, unit: MeasureUnit): number {
  return Math.round(value * (unit === 'in' ? TWIPS_PER_INCH : TWIPS_PER_CM));
}

/** "2,5 cm" / "1"" con la coma decimal del idioma. */
export function formatMeasure(twips: number, unit: MeasureUnit, language: 'es' | 'en'): string {
  const value = Math.round(twipsToUnit(twips, unit) * 100) / 100;
  const text = language === 'es' ? String(value).replace('.', ',') : String(value);
  return unit === 'in' ? `${text}"` : `${text} cm`;
}

/** Interpreta "2,5", "2.5 cm" o "1\"" en la unidad indicada. */
export function parseMeasure(input: string, unit: MeasureUnit): number | null {
  const cleaned = input
    .trim()
    .replace(',', '.')
    .replace(/\s*(cm|in|")$/i, '');
  const value = Number(cleaned);
  if (!Number.isFinite(value) || cleaned === '') return null;
  return unitToTwips(value, unit);
}

/** Márgenes predefinidos de Word, en twips (arriba, abajo, izquierda, derecha). */
export const MARGIN_PRESETS = {
  normal: { top: 1417, bottom: 1417, left: 1701, right: 1701 }, // 2,5 / 3 cm (Word en español)
  normalUs: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1" (Word en EE. UU.)
  narrow: { top: 720, bottom: 720, left: 720, right: 720 }, // 1,27 cm
  moderate: { top: 1440, bottom: 1440, left: 1080, right: 1080 }, // 2,54 / 1,91 cm
  wide: { top: 1440, bottom: 1440, left: 2880, right: 2880 }, // 2,54 / 5,08 cm
} as const;

/** Tamaños de papel habituales, en twips (vertical). */
export const PAPER_SIZES = {
  letter: { width: 12240, height: 15840 },
  legal: { width: 12240, height: 20160 },
  a4: { width: 11906, height: 16838 },
  a5: { width: 8391, height: 11906 },
  executive: { width: 10440, height: 15120 },
  b5: { width: 10319, height: 14571 },
} as const;

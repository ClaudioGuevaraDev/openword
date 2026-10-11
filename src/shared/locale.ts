import type { UiLanguage } from './ipc-contract';

/** Idioma de la interfaz a partir de los idiomas preferidos del SO (BCP-47). Español por defecto. */
export function pickUiLanguage(preferred: readonly string[]): UiLanguage {
  for (const tag of preferred) {
    const lang = tag.toLowerCase().split(/[-_]/)[0];
    if (lang === 'es' || lang === 'en') return lang;
  }
  return 'es';
}

/** Región (ISO 3166) del primer idioma preferido que la declare, p. ej. "es-MX" → "MX". */
export function pickRegion(preferred: readonly string[]): string | null {
  for (const tag of preferred) {
    const region = tag.split(/[-_]/).find((part, i) => i > 0 && /^[A-Za-z]{2}$/.test(part));
    if (region) return region.toUpperCase();
  }
  return null;
}

// Países con papel Carta (Letter) por defecto según CLDR (supplemental paperSize); el resto usa A4.
const LETTER_REGIONS = new Set([
  'BZ',
  'CA',
  'CL',
  'CO',
  'CR',
  'GT',
  'MX',
  'NI',
  'PA',
  'PH',
  'PR',
  'SV',
  'US',
  'VE',
]);

export function defaultPaper(region: string | null): 'letter' | 'a4' {
  return region && LETTER_REGIONS.has(region) ? 'letter' : 'a4';
}

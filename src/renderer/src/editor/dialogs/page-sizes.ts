// Nombres de los tamaños de papel del selector de Configurar página. El motor los trae con las
// medidas en pulgadas ('A4 (8.27" × 11.69")'): se rehacen con su nombre y las medidas en la
// unidad de la app.
import { deepMerge, en, type PartialLocaleStrings } from '@docx-editor.dev/i18n';
import { formatMeasure, type MeasureUnit } from '@shared/units';

/** Tamaños del selector del motor (dialogs.pageSetup.pageSizes), en twips y en vertical. */
const ENGINE_PAGE_SIZES = {
  letter: { width: 12240, height: 15840 },
  a4: { width: 11906, height: 16838 },
  legal: { width: 12240, height: 20160 },
  a3: { width: 16838, height: 23811 },
  a5: { width: 8391, height: 11906 },
  b5: { width: 9979, height: 14175 },
  executive: { width: 10440, height: 15120 },
} as const;

/** Etiquetas del motor con las medidas en `unit`: "A4 (21 × 29,7 cm)". */
export function pageSizeLabels(
  engineLabels: Readonly<Record<string, string | null | undefined>>,
  unit: MeasureUnit,
  language: 'es' | 'en',
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const [key, size] of Object.entries(ENGINE_PAGE_SIZES)) {
    const name = engineLabels[key]?.replace(/\s*\(.*\)$/, '');
    if (!name) continue;
    // "21 cm × 29,7 cm" → "21 × 29,7 cm": la unidad, una sola vez al final.
    const width = formatMeasure(size.width, unit, language).replace(/\s*cm$/, '');
    labels[key] = `${name} (${width} × ${formatMeasure(size.height, unit, language)})`;
  }
  return labels;
}

/** Diccionario del motor con los tamaños de papel en `unit` (el resto, sin cambios). */
export function withPageSizes(
  locale: PartialLocaleStrings,
  unit: MeasureUnit,
  language: 'es' | 'en',
): PartialLocaleStrings {
  const engineLabels = { ...en.dialogs.pageSetup.pageSizes, ...locale.dialogs?.pageSetup?.pageSizes };
  return deepMerge(locale, {
    dialogs: { pageSetup: { pageSizes: pageSizeLabels(engineLabels, unit, language) } },
  });
}

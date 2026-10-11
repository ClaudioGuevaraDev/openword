// Fuentes para medir con HarfBuzz. Hito 1: sustitutos métricos OFL empaquetados
// (Carlito→Calibri, Caladea→Cambria, Liberation→Times/Arial/Courier).
// El hito 2 antepone las fuentes reales del sistema.
import { packagedFonts } from '@docx-editor.dev/fonts';

export const bundledFonts = packagedFonts();

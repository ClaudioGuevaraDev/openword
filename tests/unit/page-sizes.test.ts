import { describe, expect, it } from 'vitest';
import { es } from '@docx-editor.dev/i18n/es';
import { pageSizeLabels, withPageSizes } from '../../src/renderer/src/editor/dialogs/page-sizes';

describe('tamaños de papel de Configurar página', () => {
  it('rehace las medidas del motor en centímetros con la coma del español', () => {
    const labels = pageSizeLabels({ a4: 'A4 (8.27" × 11.69")', letter: 'Carta (8.5" × 11")' }, 'cm', 'es');
    expect(labels).toEqual({ a4: 'A4 (21 × 29,7 cm)', letter: 'Carta (21,59 × 27,94 cm)' });
  });

  it('en pulgadas conserva el formato de la app', () => {
    expect(pageSizeLabels({ letter: 'Letter (8.5" × 11")' }, 'in', 'en')).toEqual({
      letter: 'Letter (8.5" × 11")',
    });
  });

  it('cambia solo los tamaños y conserva el resto del diccionario del motor', () => {
    const locale = withPageSizes(es, 'cm', 'es');
    expect(locale.dialogs?.pageSetup?.pageSizes?.a3).toBe('A3 (29,7 × 42 cm)');
    expect(locale.dialogs?.pageSetup?.title).toBe(es.dialogs?.pageSetup?.title);
    expect(locale.dialogs?.paragraph).toEqual(es.dialogs?.paragraph);
  });
});

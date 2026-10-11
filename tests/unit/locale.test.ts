import { describe, expect, it } from 'vitest';
import { defaultPaper, pickRegion, pickUiLanguage } from '../../src/shared/locale';

describe('pickUiLanguage', () => {
  it('elige el primer idioma soportado', () => {
    expect(pickUiLanguage(['es-MX', 'en-US'])).toBe('es');
    expect(pickUiLanguage(['fr-FR', 'en-GB'])).toBe('en');
    expect(pickUiLanguage(['EN_us'])).toBe('en');
  });
  it('usa español si ninguno está soportado', () => {
    expect(pickUiLanguage(['de-DE'])).toBe('es');
    expect(pickUiLanguage([])).toBe('es');
  });
});

describe('pickRegion y defaultPaper', () => {
  it('extrae la región, incluso con script', () => {
    expect(pickRegion(['es-MX'])).toBe('MX');
    expect(pickRegion(['zh-Hant-TW'])).toBe('TW');
    expect(pickRegion(['es'])).toBeNull();
  });
  it('Carta en América según CLDR, A4 en el resto', () => {
    expect(defaultPaper('MX')).toBe('letter');
    expect(defaultPaper('US')).toBe('letter');
    expect(defaultPaper('ES')).toBe('a4');
    expect(defaultPaper('AR')).toBe('a4');
    expect(defaultPaper(null)).toBe('a4');
  });
});

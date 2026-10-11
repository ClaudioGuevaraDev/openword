import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, mergeSettings } from '../../src/shared/settings';

describe('mergeSettings', () => {
  it('aplica cambios válidos', () => {
    const s = mergeSettings(DEFAULT_SETTINGS, {
      uiLanguage: 'en',
      autoRecoverMinutes: 5,
      spellcheck: { enabled: false, languages: ['es-MX'] },
    });
    expect(s.uiLanguage).toBe('en');
    expect(s.autoRecoverMinutes).toBe(5);
    expect(s.spellcheck).toEqual({
      enabled: false,
      languages: ['es-MX'],
      ignoreUppercase: true,
      ignoreWithNumbers: true,
    });
  });
  it('descarta valores inválidos o maliciosos', () => {
    const s = mergeSettings(DEFAULT_SETTINGS, {
      uiLanguage: 'fr',
      autoRecoverMinutes: -3,
      spellcheck: { enabled: 'sí', languages: ['../../etc', 'es'] },
    });
    expect(s).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings(DEFAULT_SETTINGS, null)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings(DEFAULT_SETTINGS, { autoRecoverMinutes: 1.5 }).autoRecoverMinutes).toBe(2);
  });
});

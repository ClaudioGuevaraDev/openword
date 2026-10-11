import { describe, expect, it } from 'vitest';
import { spellTokens } from '../../src/shared/spell-tokens';

const opts = { ignoreUppercase: true, ignoreWithNumbers: true };
const words = (text: string, o = opts) => spellTokens(text, o).map((t) => t.word);

describe('spellTokens', () => {
  it('separa palabras con tildes, ñ y apóstrofos, con su posición', () => {
    expect(spellTokens('El niño comió', opts)).toEqual([
      { word: 'El', start: 0, length: 2 },
      { word: 'niño', start: 3, length: 4 },
      { word: 'comió', start: 8, length: 5 },
    ]);
    expect(words("don't l'école bien-estar")).toEqual(["don't", "l'école", 'bien-estar']);
  });
  it('omite MAYÚSCULAS y palabras con números según las opciones', () => {
    expect(words('La ONU y el COVID19 en 2026')).toEqual(['La', 'el', 'en']);
    expect(words('La ONU y A1', { ignoreUppercase: false, ignoreWithNumbers: false })).toEqual([
      'La',
      'ONU',
      'A1',
    ]);
  });
  it('omite correos, direcciones web y rutas', () => {
    expect(words('Escribe a ana@ejemplo.com o visita https://openword.dev/docs hoy')).toEqual([
      'Escribe',
      'visita',
      'hoy',
    ]);
  });
  it('no cuenta letras sueltas ni signos', () => {
    expect(words('a — ¡ ¿ … e')).toEqual([]);
  });
});

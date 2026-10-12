import { describe, expect, it } from 'vitest';
import { readEnv } from '../../src/main/env';

describe('readEnv', () => {
  it('convierte y valida las variables conocidas', () => {
    expect(
      readEnv(
        { OPENWORD_AUTORECOVER_MS: '1500', ELECTRON_RENDERER_URL: 'http://localhost:5173', PATH: '/bin' },
        false,
      ),
    ).toEqual({ OPENWORD_AUTORECOVER_MS: 1500, ELECTRON_RENDERER_URL: 'http://localhost:5173' });
  });
  it('ignora valores inválidos en lugar de fallar', () => {
    expect(readEnv({ OPENWORD_AUTORECOVER_MS: 'pronto', ELECTRON_RENDERER_URL: 'no es url' }, false)).toEqual(
      {},
    );
  });
  it('en la app instalada no acepta las variables de desarrollo y pruebas', () => {
    expect(
      readEnv({ OPENWORD_AUTORECOVER_MS: '1500', ELECTRON_RENDERER_URL: 'http://localhost:5173' }, true),
    ).toEqual({ OPENWORD_USER_DATA: undefined });
  });
});

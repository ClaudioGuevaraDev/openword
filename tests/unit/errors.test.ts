import { describe, expect, it } from 'vitest';
import { errnoCode, errorMessage, remoteErrorMessage } from '../../src/shared/errors';

describe('errores', () => {
  it('obtiene el mensaje de cualquier valor lanzado', () => {
    expect(errorMessage(new Error('falló'))).toBe('falló');
    expect(errorMessage('texto')).toBe('texto');
  });
  it('quita el prefijo de Electron a los errores de main', () => {
    expect(
      remoteErrorMessage(new Error("Error invoking remote method 'print:prepare': Error: Sin páginas")),
    ).toBe('Sin páginas');
  });
  it('lee el código de los errores del sistema', () => {
    expect(errnoCode(Object.assign(new Error('x'), { code: 'ENOENT' }))).toBe('ENOENT');
    expect(errnoCode(new Error('x'))).toBe('');
  });
});

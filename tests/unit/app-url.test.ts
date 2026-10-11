import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY, resolveAppPath } from '../../src/main/app-url';

const root = join('/opt', 'openword', 'renderer');

describe('resolveAppPath', () => {
  it('resuelve archivos dentro de la carpeta del renderer', () => {
    expect(resolveAppPath('app://openword/index.html', root)).toBe(join(root, 'index.html'));
    expect(resolveAppPath('app://openword/assets/harfbuzz-1.wasm', root)).toBe(
      join(root, 'assets', 'harfbuzz-1.wasm'),
    );
    expect(resolveAppPath('app://openword/', root)).toBe(join(root, 'index.html'));
  });

  it('rechaza salir de la carpeta (path traversal), incluso codificado', () => {
    // El parser de URL ya normaliza "/../" literal: queda dentro de la carpeta.
    expect(resolveAppPath('app://openword/../secret.txt', root)).toBe(join(root, 'secret.txt'));
    // WHATWG también normaliza "%2e%2e" como "..".
    expect(resolveAppPath('app://openword/%2e%2e/%2e%2e/etc/passwd', root)).toBe(join(root, 'etc', 'passwd'));
    // "%2F" sí se decodifica después del parser: es el caso peligroso y debe rechazarse.
    expect(resolveAppPath('app://openword/assets/..%2F..%2Fx', root)).toBeNull();
    expect(resolveAppPath('app://openword/a%00b', root)).toBeNull();
  });

  it('rechaza otros hosts, esquemas y URLs inválidas', () => {
    expect(resolveAppPath('app://otro/index.html', root)).toBeNull();
    expect(resolveAppPath('file:///etc/passwd', root)).toBeNull();
    expect(resolveAppPath('no es url', root)).toBeNull();
    expect(resolveAppPath('app://openword/%E0%A4%A', root)).toBeNull();
  });
});

describe('CONTENT_SECURITY_POLICY', () => {
  it('permite WebAssembly pero no eval ni scripts en línea', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(CONTENT_SECURITY_POLICY).not.toContain("'unsafe-eval'");
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
  });
});

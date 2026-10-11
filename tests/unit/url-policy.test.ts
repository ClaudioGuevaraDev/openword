import { describe, expect, it } from 'vitest';
import { isSafeExternalUrl, isTrustedOrigin } from '../../src/main/url-policy';

describe('isSafeExternalUrl', () => {
  it.each(['https://example.com', 'http://example.com/a?b=c', 'mailto:alguien@example.com'])(
    'acepta %s',
    (url) => {
      expect(isSafeExternalUrl(url)).toBe(true);
    },
  );
  it.each([
    'file:///etc/passwd',
    'javascript:alert(1)',
    'app://openword/index.html',
    'smb://srv/share',
    'ms-word:ofe|u|x',
    'vacío',
  ])('rechaza %s', (url) => {
    expect(isSafeExternalUrl(url)).toBe(false);
  });
});

describe('isTrustedOrigin', () => {
  it('confía en app://openword y en el servidor de desarrollo indicado', () => {
    expect(isTrustedOrigin('app://openword/index.html', undefined)).toBe(true);
    expect(isTrustedOrigin('http://localhost:5173/index.html', 'http://localhost:5173')).toBe(true);
  });
  it('no confía en nada más', () => {
    expect(isTrustedOrigin('app://otro/index.html', undefined)).toBe(false);
    expect(isTrustedOrigin('http://localhost:5173/index.html', undefined)).toBe(false);
    expect(isTrustedOrigin('http://localhost:9999/', 'http://localhost:5173')).toBe(false);
    expect(isTrustedOrigin('https://evil.example/', undefined)).toBe(false);
    expect(isTrustedOrigin('', undefined)).toBe(false);
  });
});

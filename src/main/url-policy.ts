// Política de URLs (pura, sin Electron).
import { APP_HOST, APP_SCHEME } from './app-url';

const EXTERNAL_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

/** Solo abrimos fuera de la app vínculos http, https y mailto. */
export function isSafeExternalUrl(raw: string): boolean {
  try {
    return EXTERNAL_SCHEMES.has(new URL(raw).protocol);
  } catch {
    return false;
  }
}

export function isTrustedOrigin(raw: string, devServerUrl: string | undefined): boolean {
  try {
    const url = new URL(raw);
    // URL.origin es "null" para esquemas no especiales como app://: comparamos protocolo y host.
    if (url.protocol === `${APP_SCHEME}:` && url.host === APP_HOST) return true;
    return devServerUrl !== undefined && url.origin === new URL(devServerUrl).origin;
  } catch {
    return false;
  }
}

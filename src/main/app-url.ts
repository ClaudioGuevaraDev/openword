// Funciones puras (sin Electron) del protocolo app://, para poder probarlas con Vitest.
import { join, normalize, sep } from 'node:path';

export const APP_SCHEME = 'app';
export const APP_HOST = 'openword';
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' blob: data:",
  "connect-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

/**
 * Traduce una URL app:// a un archivo dentro de `root`. Devuelve null si la URL sale de la
 * carpeta (path traversal) o no es del host esperado.
 */
export function resolveAppPath(requestUrl: string, root: string): string | null {
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }
  if (url.protocol !== `${APP_SCHEME}:` || url.host !== APP_HOST) return null;
  let rel: string;
  try {
    rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  } catch {
    return null;
  }
  if (rel === '') rel = 'index.html';
  if (rel.includes('\0')) return null;
  const base = normalize(root);
  const target = normalize(join(base, rel));
  return target.startsWith(base.endsWith(sep) ? base : base + sep) ? target : null;
}

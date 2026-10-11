// Endurecimiento de cada ventana y de la sesión: los documentos son entrada no confiable.
import { session, shell, type WebContents } from 'electron';
import { isSafeExternalUrl, isTrustedOrigin } from './url-policy';

const ALLOWED_PERMISSIONS = new Set(['clipboard-read', 'clipboard-sanitized-write', 'fullscreen']);

function isDictionaryDownload(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'redirector.gvt1.com' || url.hostname.endsWith('.gvt1.com'))
    );
  } catch {
    return false;
  }
}

export function hardenSession(devServerUrl: string | undefined): void {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((wc, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission) && isTrustedOrigin(wc.getURL(), devServerUrl));
  });
  ses.setPermissionCheckHandler(
    (_wc, permission, requestingOrigin) =>
      ALLOWED_PERMISSIONS.has(permission) && isTrustedOrigin(requestingOrigin, devServerUrl),
  );
  // Sin red en producción: solo nuestro protocolo y la descarga de diccionarios del corrector
  // (Hunspell en Windows/Linux, desde el CDN de Google que usa Chromium).
  if (!devServerUrl) {
    ses.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
      (details, callback) => callback({ cancel: !isDictionaryDownload(details.url) }),
    );
  }
}

export function hardenWebContents(contents: WebContents): void {
  contents.on('will-navigate', (event) => event.preventDefault());
  contents.on('will-frame-navigate', (event) => {
    if (!event.isMainFrame) event.preventDefault();
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());
  // El motor abre los vínculos del documento con window.open: nunca creamos ventanas nuevas.
  contents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
}

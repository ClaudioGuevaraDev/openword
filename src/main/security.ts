// Endurecimiento de cada ventana y de la sesión: los documentos son entrada no confiable.
import { session, shell, type WebContents } from 'electron';
import { isSafeExternalUrl, isTrustedOrigin } from './url-policy';

const ALLOWED_PERMISSIONS = new Set(['clipboard-read', 'clipboard-sanitized-write', 'fullscreen']);

export function hardenSession(devServerUrl: string | undefined): void {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((wc, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission) && isTrustedOrigin(wc.getURL(), devServerUrl));
  });
  ses.setPermissionCheckHandler(
    (_wc, permission, requestingOrigin) =>
      ALLOWED_PERMISSIONS.has(permission) && isTrustedOrigin(requestingOrigin, devServerUrl),
  );
  // Sin red en producción: solo nuestro protocolo (los diccionarios del corrector usan otra vía).
  if (!devServerUrl) {
    ses.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
      (_details, callback) => callback({ cancel: true }),
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

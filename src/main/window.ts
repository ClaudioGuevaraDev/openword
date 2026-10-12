import { BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';
import { join } from 'node:path';
import { APP_ORIGIN } from './protocol';
import { hardenWebContents } from './security';

/** Alto de la barra de título propia (titlebar/TitleBar.tsx usa el mismo valor). */
export const TITLE_BAR_HEIGHT = 40;

/**
 * Botones nativos de ventana con fondo transparente: se ve el degradado de la cabecera
 * (--ow-header en app.css) detrás, sin bloque ni corte de color. El tema ya no cambia el fondo.
 */
export function titleBarOverlay(_dark: boolean): Electron.TitleBarOverlayOptions {
  return { color: '#00000000', symbolColor: '#ffffff', height: TITLE_BAR_HEIGHT };
}

/**
 * Sin marco nativo: la barra de título la pinta el renderer (como Word 365). En Windows y Linux
 * Electron dibuja los botones de ventana encima (titleBarOverlay); en macOS, los semáforos.
 */
function frameOptions(): BrowserWindowConstructorOptions {
  if (process.platform === 'darwin')
    return { titleBarStyle: 'hidden', trafficLightPosition: { x: 14, y: 13 } };
  return { titleBarStyle: 'hidden', titleBarOverlay: titleBarOverlay(false) };
}

export function createDocumentWindow(devServerUrl: string | undefined, title: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 720,
    minHeight: 480,
    show: false,
    title,
    backgroundColor: '#f3f5f9',
    ...frameOptions(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
      // El corrector de Chromium se usa como diccionario (webFrame.isWordMisspelled); el motor
      // desactiva el subrayado nativo y OpenWord pinta el suyo.
      spellcheck: true,
    },
  });
  hardenWebContents(win.webContents);
  win.once('ready-to-show', () => win.show());
  // El título lo controla main (nombre del documento); ignoramos <title> del HTML.
  win.on('page-title-updated', (event) => event.preventDefault());
  void win.loadURL(devServerUrl ? `${devServerUrl}/index.html` : `${APP_ORIGIN}/index.html`);
  return win;
}

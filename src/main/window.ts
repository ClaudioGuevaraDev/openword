import { BrowserWindow } from 'electron';
import { join } from 'node:path';
import { APP_ORIGIN } from './protocol';
import { hardenWebContents } from './security';

export function createDocumentWindow(devServerUrl: string | undefined, title: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 720,
    minHeight: 480,
    show: false,
    title,
    backgroundColor: '#f3f3f3',
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

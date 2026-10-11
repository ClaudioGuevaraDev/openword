import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { installApplicationMenu } from './menu';
import { handleAppProtocol, registerAppSchemePrivileges } from './protocol';
import { hardenSession } from './security';
import { registerIpcHandlers } from './ipc';
import { createDocumentWindow } from './window';

// Solo en desarrollo: electron-vite define esta variable con la URL del servidor de Vite.
const devServerUrl = !app.isPackaged ? process.env['ELECTRON_RENDERER_URL'] : undefined;

registerAppSchemePrivileges();

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // El hito 2 abrirá aquí los archivos recibidos por argv; por ahora enfocamos la ventana.
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  void app.whenReady().then(() => {
    handleAppProtocol(join(__dirname, '../renderer'));
    hardenSession(devServerUrl);
    installApplicationMenu();
    registerIpcHandlers(devServerUrl);
    createDocumentWindow(devServerUrl);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createDocumentWindow(devServerUrl);
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

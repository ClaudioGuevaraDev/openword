import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { extractDocumentPaths } from './cli-args';
import { RecentFiles } from './documents/recent';
import { FontIndex } from './fonts/font-index';
import { registerIpcHandlers } from './ipc';
import { installApplicationMenu } from './menu';
import { handleAppProtocol, registerAppSchemePrivileges } from './protocol';
import { hardenSession } from './security';
import { DocumentWindows } from './windows/document-windows';

// Solo en desarrollo: electron-vite define esta variable con la URL del servidor de Vite.
const devServerUrl = !app.isPackaged ? process.env['ELECTRON_RENDERER_URL'] : undefined;

// Carpeta de datos alternativa (pruebas E2E aisladas). Debe fijarse antes del bloqueo de
// instancia única, que depende de ella.
if (process.env['OPENWORD_USER_DATA']) app.setPath('userData', process.env['OPENWORD_USER_DATA']);

registerAppSchemePrivileges();

if (!app.requestSingleInstanceLock({ argv: process.argv, cwd: process.cwd() })) {
  // Otra instancia ya corre: le reenviamos los archivos (llegan por 'second-instance').
  app.quit();
} else {
  let windows: DocumentWindows | undefined;
  // macOS entrega los archivos con 'open-file', incluso antes de 'ready'.
  const pendingPaths: string[] = [];

  const openOrQueue = (paths: string[]) => {
    if (windows) void windows.openPaths(paths);
    else pendingPaths.push(...paths);
  };

  app.on('will-finish-launching', () => {
    app.on('open-file', (event, path) => {
      event.preventDefault();
      openOrQueue([path]);
    });
  });

  app.on('second-instance', (_event, argv, workingDirectory) => {
    const paths = extractDocumentPaths(argv, workingDirectory);
    if (paths.length > 0) openOrQueue(paths);
    else if (windows) windows.newDocument();
  });

  void app.whenReady().then(async () => {
    handleAppProtocol(join(__dirname, '../renderer'));
    hardenSession(devServerUrl);
    installApplicationMenu();

    const recents = new RecentFiles();
    const fonts = new FontIndex({ cacheFile: join(app.getPath('userData'), 'font-index.json') });
    windows = new DocumentWindows(devServerUrl, recents);
    registerIpcHandlers({ devServerUrl, windows, recents, fonts });
    void fonts.all(); // indexar en segundo plano mientras abre la primera ventana

    const initial = [...pendingPaths.splice(0), ...extractDocumentPaths(process.argv, process.cwd())];
    if (initial.length > 0) await windows.openPaths(initial);
    if (BrowserWindow.getAllWindows().length === 0) windows.newDocument();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) windows?.newDocument();
    });
  });

  // Salir: preguntar por cada documento con cambios antes de cerrar nada.
  let quitConfirmed = false;
  app.on('before-quit', (event) => {
    if (quitConfirmed || !windows) return;
    event.preventDefault();
    void windows.confirmQuit().then((ok) => {
      if (ok) {
        quitConfirmed = true;
        app.quit();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

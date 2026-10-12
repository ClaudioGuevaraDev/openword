import { app, BrowserWindow, dialog, session } from 'electron';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { errorMessage } from '@shared/errors';
import { pickUiLanguage } from '@shared/locale';
import { extractDocumentPaths } from './cli-args';
import { readEnv } from './env';
import { RecentFiles } from './documents/recent';
import { RecoveryStore } from './documents/recovery';
import { SettingsStore } from './settings';
import { conversionWorkRoot, convertToDocx } from './libreoffice/convert';
import { findSoffice } from './libreoffice/detect';
import { FontIndex } from './fonts/font-index';
import { registerIpcHandlers } from './ipc';
import { configureLog, logError, logTo } from './log';
import { installApplicationMenu } from './menu';
import { handleAppProtocol, registerAppSchemePrivileges } from './protocol';
import { hardenSession } from './security';
import { DocumentWindows } from './windows/document-windows';
import { PrintJobs } from './windows/print-jobs';

/** Idiomas del corrector (Windows/Linux; macOS usa el corrector del sistema y lo ignora). */
function applySpellcheckLanguages(languages: readonly string[]): void {
  if (process.platform === 'darwin') return;
  const available = new Set(session.defaultSession.availableSpellCheckerLanguages);
  const chosen = languages.filter((l) => available.has(l));
  session.defaultSession.setSpellCheckerLanguages(chosen.length > 0 ? chosen : ['es']);
}

const env = readEnv(process.env, app.isPackaged);
// Solo en desarrollo: electron-vite define esta variable con la URL del servidor de Vite.
const devServerUrl = env.ELECTRON_RENDERER_URL;

// Carpeta de datos alternativa (pruebas E2E aisladas). Debe fijarse antes del bloqueo de
// instancia única, que depende de ella.
if (env.OPENWORD_USER_DATA) app.setPath('userData', env.OPENWORD_USER_DATA);

configureLog(join(app.getPath('userData'), 'openword.log'));
process.on('unhandledRejection', logTo('unhandledRejection'));
process.on('uncaughtException', logTo('uncaughtException'));

registerAppSchemePrivileges();

if (!app.requestSingleInstanceLock({ argv: process.argv, cwd: process.cwd() })) {
  // Otra instancia ya corre: le reenviamos los archivos (llegan por 'second-instance').
  app.quit();
} else {
  let windows: DocumentWindows | undefined;
  // macOS entrega los archivos con 'open-file', incluso antes de 'ready'.
  const pendingPaths: string[] = [];

  const openOrQueue = (paths: string[]) => {
    if (windows) void windows.openPaths(paths).catch(logTo('open'));
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

  const start = async () => {
    handleAppProtocol(join(__dirname, '../renderer'));
    hardenSession(devServerUrl);
    installApplicationMenu();

    const settings = new SettingsStore();
    await settings.load();
    applySpellcheckLanguages(settings.get().spellcheck.languages);
    settings.onChange((next) => applySpellcheckLanguages(next.spellcheck.languages));

    const recents = new RecentFiles();
    const fonts = new FontIndex({ cacheFile: join(app.getPath('userData'), 'font-index.json') });
    windows = new DocumentWindows(
      devServerUrl,
      recents,
      {
        find: () => findSoffice(),
        convert: (soffice, path) =>
          convertToDocx(soffice, path, conversionWorkRoot(soffice, homedir(), app.getPath('userData'))),
      },
      new RecoveryStore(join(app.getPath('userData'), 'recovery')),
      () => {
        const chosen = settings.get().uiLanguage;
        return chosen === 'auto' ? pickUiLanguage(app.getPreferredSystemLanguages()) : chosen;
      },
    );
    registerIpcHandlers({
      devServerUrl,
      env,
      windows,
      recents,
      fonts,
      printJobs: new PrintJobs(devServerUrl),
      settings,
    });
    void fonts.all().catch(logTo('fonts')); // indexar en segundo plano mientras abre la primera ventana

    // Documentos que quedaron sin guardar por un cierre inesperado. Si falla, la app arranca igual.
    await windows.restoreRecovered().catch(logTo('recovery'));
    const initial = [...pendingPaths.splice(0), ...extractDocumentPaths(process.argv, process.cwd())];
    if (initial.length > 0) await windows.openPaths(initial);
    if (BrowserWindow.getAllWindows().length === 0) windows.newDocument();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) windows?.newDocument();
    });
  };

  void app
    .whenReady()
    .then(start)
    .catch((error: unknown) => {
      // Sin ventana ni mensaje la app parecería colgada: se informa y se sale.
      logError('startup', error);
      dialog.showErrorBox('OpenWord no pudo iniciarse', errorMessage(error));
      app.exit(1);
    });

  // Salir: preguntar por cada documento con cambios antes de cerrar nada.
  let quitConfirmed = false;
  app.on('before-quit', (event) => {
    if (quitConfirmed || !windows) return;
    event.preventDefault();
    void windows
      .confirmQuit()
      .then((ok) => {
        if (ok) {
          quitConfirmed = true;
          app.quit();
        }
      })
      .catch(logTo('quit'));
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

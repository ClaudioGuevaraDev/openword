import { app, BrowserWindow, clipboard, dialog, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { IpcChannel } from '@shared/ipc-contract';
import { defaultPaper, pickRegion, pickUiLanguage } from '@shared/locale';
import type { RecentFiles } from './documents/recent';
import type { AppEnv } from './env';
import type { FontIndex } from './fonts/font-index';
import { createIpcRouter } from './ipc-router';
import { titleBarOverlay } from './window';
import type { DocumentWindows } from './windows/document-windows';
import { registerPrintWindowIpc, type PrintJobs } from './windows/print-jobs';
import type { SettingsStore } from './settings';

interface Services {
  readonly devServerUrl: string | undefined;
  readonly env: AppEnv;
  readonly windows: DocumentWindows;
  readonly recents: RecentFiles;
  readonly fonts: FontIndex;
  readonly printJobs: PrintJobs;
  readonly settings: SettingsStore;
}

// El origen y los argumentos de cada mensaje ya vienen comprobados por el router
// (ipc-router.ts + ipc-schemas.ts); aquí solo queda la lógica de cada canal.
export function registerIpcHandlers({
  devServerUrl,
  env,
  windows,
  recents,
  fonts,
  printJobs,
  settings,
}: Services): void {
  const ipc = createIpcRouter(devServerUrl);

  /** Documento de la ventana que envía (la de impresión, p. ej., no tiene). */
  const recordOf = (event: IpcMainInvokeEvent | IpcMainEvent) => {
    const record = windows.fromWebContents(event.sender);
    if (!record) throw new Error('Ventana desconocida');
    return record;
  };
  const windowOf = (event: IpcMainInvokeEvent | IpcMainEvent) =>
    BrowserWindow.fromWebContents(event.sender) ?? undefined;

  ipc.handle(IpcChannel.appInfo, () => {
    const preferred = app.getPreferredSystemLanguages();
    const region = pickRegion(preferred);
    const { uiLanguage } = settings.get();
    return {
      version: app.getVersion(),
      platform: process.platform,
      uiLanguage: uiLanguage === 'auto' ? pickUiLanguage(preferred) : uiLanguage,
      region,
      paper: defaultPaper(region),
      ...(env.OPENWORD_AUTORECOVER_MS ? { autoRecoverIntervalMs: env.OPENWORD_AUTORECOVER_MS } : {}),
    };
  });

  // ----- documento de la ventana -----
  ipc.handle(IpcChannel.docCurrent, (event) => recordOf(event).pending);
  ipc.on(IpcChannel.docSetState, (event, state) =>
    windows.setState(recordOf(event), state.dirty, state.untouched),
  );
  ipc.handle(IpcChannel.docSave, (event, bytes) => windows.save(recordOf(event), bytes, false));
  ipc.handle(IpcChannel.docSaveAs, (event, bytes) => windows.save(recordOf(event), bytes, true));
  ipc.on(IpcChannel.docSaveAnswer, (event, requestId, saved) =>
    windows.answerSaveRequest(recordOf(event), requestId, saved),
  );

  // ----- archivos -----
  ipc.on(IpcChannel.fileNew, () => windows.newDocument());
  ipc.handle(IpcChannel.fileOpenDialog, (event) => windows.openDialog(windowOf(event)));
  ipc.handle(IpcChannel.fileOpenRecent, async (event, path) => {
    // Solo rutas que el propio main registró como recientes.
    if (!(await recents.has(path))) throw new Error('No es un documento reciente');
    await windows.openPath(path, windowOf(event));
  });
  ipc.handle(IpcChannel.fileOpenPaths, (event, paths) => windows.openPaths(paths, windowOf(event)));
  ipc.handle(IpcChannel.fileRecent, () => recents.list());
  ipc.on(IpcChannel.windowTitleBarTheme, (event, dark) => {
    const win = windowOf(event);
    if (win && process.platform !== 'darwin') win.setTitleBarOverlay(titleBarOverlay(dark));
  });
  ipc.on(IpcChannel.fileClose, (event) => windowOf(event)?.close());

  ipc.handle(IpcChannel.filePickImage, async (event) => {
    const win = windowOf(event);
    const options: Electron.OpenDialogOptions = {
      title: 'Insertar imagen',
      properties: ['openFile'],
      filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] }],
    };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    const path = result.filePaths[0];
    if (result.canceled || !path) return null;
    const info = await stat(path);
    if (info.size > 50 * 1024 * 1024) throw new Error('La imagen supera 50 MB.');
    const buffer = await readFile(path);
    return {
      name: basename(path),
      bytes: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    };
  });

  // ----- portapapeles (botón Pegar de la cinta) -----
  ipc.handle(IpcChannel.clipboardRead, async () => {
    let html = '';
    for (const item of await clipboard.read()) {
      if (item.types.includes('text/html')) {
        html = await (await item.getType('text/html')).text();
        break;
      }
    }
    return { text: await clipboard.readText(), html };
  });

  // ----- imprimir / PDF -----
  ipc.handle(IpcChannel.printPrepare, (event, bytes) =>
    printJobs.prepare(event.sender, bytes, recordOf(event).displayName),
  );
  ipc.handle(IpcChannel.printPrint, (event, jobId) => {
    recordOf(event);
    return printJobs.print(event.sender, jobId);
  });
  ipc.handle(IpcChannel.printSavePdf, (event, jobId) => {
    recordOf(event);
    return printJobs.savePdf(event.sender, jobId);
  });
  ipc.on(IpcChannel.printDispose, (event, jobId) => printJobs.disposeOwnedBy(event.sender, jobId));
  registerPrintWindowIpc(ipc, printJobs);

  // ----- opciones, corrector y recuperación -----
  ipc.handle(IpcChannel.settingsGet, () => settings.get());
  ipc.handle(IpcChannel.settingsUpdate, (_event, patch) => settings.update(patch));
  ipc.on(IpcChannel.spellAddWord, (event, word) =>
    event.sender.session.addWordToSpellCheckerDictionary(word),
  );
  ipc.handle(IpcChannel.spellLanguages, (event) => event.sender.session.availableSpellCheckerLanguages);
  ipc.handle(IpcChannel.recoverySnapshot, (event, bytes) => windows.snapshot(recordOf(event), bytes));

  // ----- fuentes del sistema -----
  ipc.handle(IpcChannel.fontFamilies, () => fonts.families());
  ipc.handle(IpcChannel.fontResolve, (_event, families) => fonts.resolve(families));
}

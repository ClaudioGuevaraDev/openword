import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
} from 'electron';
import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { z } from 'zod';
import { IpcChannel, type AppInfo, type LoadedDocument } from '@shared/ipc-contract';
import { defaultPaper, pickRegion, pickUiLanguage } from '@shared/locale';
import type { RecentFiles } from './documents/recent';
import type { FontIndex } from './fonts/font-index';
import { logError } from './log';
import { isTrustedOrigin } from './url-policy';
import { titleBarOverlay } from './window';
import type { DocumentWindows } from './windows/document-windows';
import { registerPrintWindowIpc, type PrintJobs } from './windows/print-jobs';
import type { SettingsStore } from './settings';

interface Services {
  readonly devServerUrl: string | undefined;
  readonly windows: DocumentWindows;
  readonly recents: RecentFiles;
  readonly fonts: FontIndex;
  readonly printJobs: PrintJobs;
  readonly settings: SettingsStore;
}

const Bytes = z
  .instanceof(Uint8Array)
  .refine((b) => b.byteLength <= 512 * 1024 * 1024, 'documento demasiado grande');
const PathList = z.array(z.string().min(1).max(4096)).max(100);
const FamilyList = z.array(z.string().min(1).max(256)).max(64);

export function registerIpcHandlers({
  devServerUrl,
  windows,
  recents,
  fonts,
  printJobs,
  settings,
}: Services): void {
  /** Solo atendemos frames de nuestro propio origen. */
  const trusted = (event: IpcMainInvokeEvent | IpcMainEvent) => {
    const url = event.senderFrame?.url ?? '';
    if (!isTrustedOrigin(url, devServerUrl))
      throw new Error(`IPC rechazado desde ${url || 'origen desconocido'}`);
  };
  const recordOf = (event: IpcMainInvokeEvent | IpcMainEvent) => {
    trusted(event);
    const record = windows.fromWebContents(event.sender);
    if (!record) throw new Error('Ventana desconocida');
    return record;
  };
  /**
   * `ipcMain.on` sin respuesta: un error aquí no tiene a quién volver y acabaría como
   * excepción no capturada en main. Se registra y el mensaje se descarta.
   */
  const listen = (channel: string, listener: (event: IpcMainEvent, ...args: unknown[]) => void) =>
    ipcMain.on(channel, (event, ...args: unknown[]) => {
      try {
        listener(event, ...args);
      } catch (error) {
        logError(`ipc ${channel}`, error);
      }
    });
  const windowOf = (event: IpcMainInvokeEvent | IpcMainEvent) =>
    BrowserWindow.fromWebContents(event.sender) ?? undefined;

  ipcMain.handle(IpcChannel.appInfo, (event): AppInfo => {
    trusted(event);
    const preferred = app.getPreferredSystemLanguages();
    const region = pickRegion(preferred);
    return {
      version: app.getVersion(),
      platform: process.platform,
      uiLanguage:
        settings.get().uiLanguage === 'auto'
          ? pickUiLanguage(preferred)
          : (settings.get().uiLanguage as 'es' | 'en'),
      region,
      paper: defaultPaper(region),
      ...(process.env['OPENWORD_AUTORECOVER_MS']
        ? { autoRecoverIntervalMs: Number(process.env['OPENWORD_AUTORECOVER_MS']) }
        : {}),
    };
  });

  // ----- documento de la ventana -----
  ipcMain.handle(IpcChannel.docCurrent, (event): LoadedDocument => recordOf(event).pending);

  listen(IpcChannel.docSetState, (event, state) => {
    const record = recordOf(event);
    const parsed = z.object({ dirty: z.boolean(), untouched: z.boolean() }).parse(state);
    windows.setState(record, parsed.dirty, parsed.untouched);
  });

  ipcMain.handle(IpcChannel.docSave, (event, bytes: unknown) =>
    windows.save(recordOf(event), Bytes.parse(bytes), false),
  );
  ipcMain.handle(IpcChannel.docSaveAs, (event, bytes: unknown) =>
    windows.save(recordOf(event), Bytes.parse(bytes), true),
  );

  listen(IpcChannel.docSaveAnswer, (event, requestId, saved) => {
    windows.answerSaveRequest(recordOf(event), z.string().parse(requestId), z.boolean().parse(saved));
  });

  // ----- archivos -----
  listen(IpcChannel.fileNew, (event) => {
    trusted(event);
    windows.newDocument();
  });
  ipcMain.handle(IpcChannel.fileOpenDialog, (event) => {
    trusted(event);
    return windows.openDialog(windowOf(event));
  });
  ipcMain.handle(IpcChannel.fileOpenRecent, async (event, path: unknown) => {
    trusted(event);
    const target = z.string().parse(path);
    // Solo rutas que el propio main registró como recientes.
    if (!(await recents.has(target))) throw new Error('No es un documento reciente');
    await windows.openPath(target, windowOf(event));
  });
  ipcMain.handle(IpcChannel.fileOpenPaths, (event, paths: unknown) => {
    trusted(event);
    return windows.openPaths(PathList.parse(paths), windowOf(event));
  });
  ipcMain.handle(IpcChannel.fileRecent, (event) => {
    trusted(event);
    return recents.list();
  });
  listen(IpcChannel.windowTitleBarTheme, (event, dark) => {
    trusted(event);
    const win = windowOf(event);
    if (win && process.platform !== 'darwin') win.setTitleBarOverlay(titleBarOverlay(dark === true));
  });

  listen(IpcChannel.fileClose, (event) => {
    trusted(event);
    windowOf(event)?.close();
  });

  ipcMain.handle(IpcChannel.filePickImage, async (event) => {
    trusted(event);
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
  ipcMain.handle(IpcChannel.clipboardRead, async (event) => {
    trusted(event);
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
  ipcMain.handle(IpcChannel.printPrepare, (event, bytes: unknown) => {
    const record = recordOf(event);
    return printJobs.prepare(event.sender, Bytes.parse(bytes), record.displayName);
  });
  ipcMain.handle(IpcChannel.printPrint, (event, jobId: unknown) => {
    recordOf(event);
    return printJobs.print(event.sender, z.string().parse(jobId));
  });
  ipcMain.handle(IpcChannel.printSavePdf, (event, jobId: unknown) => {
    recordOf(event);
    return printJobs.savePdf(event.sender, z.string().parse(jobId));
  });
  listen(IpcChannel.printDispose, (event, jobId) => {
    recordOf(event);
    printJobs.disposeOwnedBy(event.sender, z.string().parse(jobId));
  });
  registerPrintWindowIpc(printJobs);

  // ----- opciones, corrector y recuperación -----
  ipcMain.handle(IpcChannel.settingsGet, (event) => {
    trusted(event);
    return settings.get();
  });
  ipcMain.handle(IpcChannel.settingsUpdate, (event, patch: unknown) => {
    trusted(event);
    return settings.update(z.record(z.string(), z.unknown()).parse(patch));
  });
  listen(IpcChannel.spellAddWord, (event, word) => {
    trusted(event);
    const text = z.string().min(1).max(64).parse(word);
    event.sender.session.addWordToSpellCheckerDictionary(text);
  });
  ipcMain.handle(IpcChannel.spellLanguages, (event) => {
    trusted(event);
    return event.sender.session.availableSpellCheckerLanguages;
  });
  ipcMain.handle(IpcChannel.recoverySnapshot, (event, bytes: unknown) =>
    windows.snapshot(recordOf(event), Bytes.parse(bytes)),
  );

  // ----- fuentes del sistema -----
  ipcMain.handle(IpcChannel.fontFamilies, (event) => {
    trusted(event);
    return fonts.families();
  });
  ipcMain.handle(IpcChannel.fontResolve, (event, families: unknown) => {
    trusted(event);
    return fonts.resolve(FamilyList.parse(families));
  });
}

import { app, BrowserWindow, clipboard, ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { IpcChannel, type AppInfo, type LoadedDocument } from '@shared/ipc-contract';
import { defaultPaper, pickRegion, pickUiLanguage } from '@shared/locale';
import type { RecentFiles } from './documents/recent';
import type { FontIndex } from './fonts/font-index';
import { isTrustedOrigin } from './url-policy';
import type { DocumentWindows } from './windows/document-windows';

interface Services {
  readonly devServerUrl: string | undefined;
  readonly windows: DocumentWindows;
  readonly recents: RecentFiles;
  readonly fonts: FontIndex;
}

const Bytes = z
  .instanceof(Uint8Array)
  .refine((b) => b.byteLength <= 512 * 1024 * 1024, 'documento demasiado grande');
const PathList = z.array(z.string().min(1).max(4096)).max(100);
const FamilyList = z.array(z.string().min(1).max(256)).max(64);

export function registerIpcHandlers({ devServerUrl, windows, recents, fonts }: Services): void {
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
  const windowOf = (event: IpcMainInvokeEvent | IpcMainEvent) =>
    BrowserWindow.fromWebContents(event.sender) ?? undefined;

  ipcMain.handle(IpcChannel.appInfo, (event): AppInfo => {
    trusted(event);
    const preferred = app.getPreferredSystemLanguages();
    const region = pickRegion(preferred);
    return {
      version: app.getVersion(),
      platform: process.platform,
      uiLanguage: pickUiLanguage(preferred),
      region,
      paper: defaultPaper(region),
    };
  });

  // ----- documento de la ventana -----
  ipcMain.handle(IpcChannel.docCurrent, (event): LoadedDocument => recordOf(event).pending);

  ipcMain.on(IpcChannel.docSetState, (event, state: unknown) => {
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

  ipcMain.on(IpcChannel.docSaveAnswer, (event, requestId: unknown, saved: unknown) => {
    windows.answerSaveRequest(recordOf(event), z.string().parse(requestId), z.boolean().parse(saved));
  });

  // ----- archivos -----
  ipcMain.on(IpcChannel.fileNew, (event) => {
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
  ipcMain.on(IpcChannel.fileClose, (event) => {
    trusted(event);
    windowOf(event)?.close();
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

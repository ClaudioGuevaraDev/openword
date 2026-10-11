import { app, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { IpcChannel, type AppInfo } from '@shared/ipc-contract';
import { pickRegion, pickUiLanguage } from '@shared/locale';
import { isTrustedOrigin } from './url-policy';

/** Solo atendemos mensajes de frames con nuestro origen. */
function assertTrustedSender(event: IpcMainInvokeEvent, devServerUrl: string | undefined): void {
  const url = event.senderFrame?.url ?? '';
  if (!isTrustedOrigin(url, devServerUrl))
    throw new Error(`IPC rechazado desde ${url || 'origen desconocido'}`);
}

export function registerIpcHandlers(devServerUrl: string | undefined): void {
  ipcMain.handle(IpcChannel.appInfo, (event): AppInfo => {
    assertTrustedSender(event, devServerUrl);
    const preferred = app.getPreferredSystemLanguages();
    return {
      version: app.getVersion(),
      platform: process.platform,
      uiLanguage: pickUiLanguage(preferred),
      region: pickRegion(preferred),
    };
  });
}

// Puente mínimo y tipado entre el renderer (sin Node) y main. Nada de ipcRenderer crudo.
import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannel, type OpenWordApi } from '@shared/ipc-contract';

const api: OpenWordApi = {
  app: {
    info: () => ipcRenderer.invoke(IpcChannel.appInfo),
  },
};

contextBridge.exposeInMainWorld('openword', api);

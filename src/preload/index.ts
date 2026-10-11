// Puente mínimo y tipado entre el renderer (sin Node) y main. Nada de ipcRenderer crudo.
import { contextBridge, ipcRenderer, webFrame, webUtils, type IpcRendererEvent } from 'electron';
import { IpcChannel, type LoadedDocument, type MenuCommand, type OpenWordApi } from '@shared/ipc-contract';
import type { Settings } from '@shared/settings';

function subscribe<T extends unknown[]>(channel: string, listener: (...args: T) => void): () => void {
  const wrapped = (_event: IpcRendererEvent, ...args: unknown[]) => listener(...(args as T));
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

const api: OpenWordApi = {
  app: {
    info: () => ipcRenderer.invoke(IpcChannel.appInfo),
  },
  doc: {
    current: () => ipcRenderer.invoke(IpcChannel.docCurrent),
    onReplaced: (listener) => subscribe<[LoadedDocument]>(IpcChannel.docReplaced, listener),
    setState: (state) =>
      ipcRenderer.send(IpcChannel.docSetState, { dirty: state.dirty, untouched: state.untouched }),
    save: (bytes) => ipcRenderer.invoke(IpcChannel.docSave, bytes),
    saveAs: (bytes) => ipcRenderer.invoke(IpcChannel.docSaveAs, bytes),
    onSaveRequest: (listener) => subscribe<[string]>(IpcChannel.docSaveRequest, listener),
    answerSaveRequest: (requestId, saved) => ipcRenderer.send(IpcChannel.docSaveAnswer, requestId, saved),
  },
  file: {
    newDocument: () => ipcRenderer.send(IpcChannel.fileNew),
    openDialog: () => ipcRenderer.invoke(IpcChannel.fileOpenDialog),
    openRecent: (path) => ipcRenderer.invoke(IpcChannel.fileOpenRecent, path),
    openDropped: (files) => {
      const paths = files.map((file) => webUtils.getPathForFile(file)).filter((path) => path !== '');
      return ipcRenderer.invoke(IpcChannel.fileOpenPaths, paths);
    },
    recent: () => ipcRenderer.invoke(IpcChannel.fileRecent),
    closeWindow: () => ipcRenderer.send(IpcChannel.fileClose),
    pickImage: () => ipcRenderer.invoke(IpcChannel.filePickImage),
  },
  clipboard: {
    read: () => ipcRenderer.invoke(IpcChannel.clipboardRead),
  },
  menu: {
    onCommand: (listener) => subscribe<[MenuCommand]>(IpcChannel.menuCommand, listener),
  },
  print: {
    prepare: (bytes) => ipcRenderer.invoke(IpcChannel.printPrepare, bytes),
    print: (jobId) => ipcRenderer.invoke(IpcChannel.printPrint, jobId),
    savePdf: (jobId) => ipcRenderer.invoke(IpcChannel.printSavePdf, jobId),
    dispose: (jobId) => ipcRenderer.send(IpcChannel.printDispose, jobId),
    sourceBytes: () => ipcRenderer.invoke(IpcChannel.printSourceBytes),
    rendered: (result) => ipcRenderer.send(IpcChannel.printRendered, result),
  },
  settings: {
    get: () => ipcRenderer.invoke(IpcChannel.settingsGet),
    update: (patch) => ipcRenderer.invoke(IpcChannel.settingsUpdate, patch),
    onChange: (listener) => subscribe<[Settings]>(IpcChannel.settingsChanged, listener),
  },
  spell: {
    isMisspelled: (word) => typeof word === 'string' && word.length <= 64 && webFrame.isWordMisspelled(word),
    suggestions: (word) =>
      typeof word === 'string' && word.length <= 64 ? webFrame.getWordSuggestions(word).slice(0, 8) : [],
    addToDictionary: (word) => ipcRenderer.send(IpcChannel.spellAddWord, word),
    availableLanguages: () => ipcRenderer.invoke(IpcChannel.spellLanguages),
  },
  recovery: {
    snapshot: (bytes) => ipcRenderer.invoke(IpcChannel.recoverySnapshot, bytes),
  },
  fonts: {
    families: () => ipcRenderer.invoke(IpcChannel.fontFamilies),
    resolve: (families) => ipcRenderer.invoke(IpcChannel.fontResolve, [...families]),
  },
};

contextBridge.exposeInMainWorld('openword', api);

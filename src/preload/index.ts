// Puente mínimo y tipado entre el renderer (sin Node) y main. Nada de ipcRenderer crudo.
import { contextBridge, ipcRenderer, webFrame, webUtils, type IpcRendererEvent } from 'electron';
import {
  IpcChannel,
  type InvokeArgs,
  type InvokeChannel,
  type InvokeResult,
  type OpenWordApi,
  type PushChannel,
  type PushChannels,
  type SendChannel,
  type SendChannels,
} from '@shared/ipc-contract';

// Los tipos salen del contrato; main valida cada argumento al recibirlo.
const invoke = <C extends InvokeChannel>(channel: C, ...args: InvokeArgs<C>) =>
  ipcRenderer.invoke(channel, ...args) as Promise<InvokeResult<C>>;

const send = <C extends SendChannel>(channel: C, ...args: SendChannels[C]) =>
  ipcRenderer.send(channel, ...args);

function subscribe<C extends PushChannel>(
  channel: C,
  listener: (...args: PushChannels[C]) => void,
): () => void {
  const wrapped = (_event: IpcRendererEvent, ...args: unknown[]) => listener(...(args as PushChannels[C]));
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

const api: OpenWordApi = {
  app: {
    info: () => invoke(IpcChannel.appInfo),
  },
  window: {
    setTitleBarTheme: (dark) => send(IpcChannel.windowTitleBarTheme, dark === true),
  },
  doc: {
    current: () => invoke(IpcChannel.docCurrent),
    onReplaced: (listener) => subscribe(IpcChannel.docReplaced, listener),
    setState: (state) => send(IpcChannel.docSetState, { dirty: state.dirty, untouched: state.untouched }),
    save: (bytes) => invoke(IpcChannel.docSave, bytes),
    saveAs: (bytes) => invoke(IpcChannel.docSaveAs, bytes),
    onSaveRequest: (listener) => subscribe(IpcChannel.docSaveRequest, listener),
    answerSaveRequest: (requestId, saved) => send(IpcChannel.docSaveAnswer, requestId, saved),
  },
  file: {
    newDocument: () => send(IpcChannel.fileNew),
    openDialog: () => invoke(IpcChannel.fileOpenDialog),
    openRecent: (path) => invoke(IpcChannel.fileOpenRecent, path),
    openDropped: (files) => {
      const paths = files.map((file) => webUtils.getPathForFile(file)).filter((path) => path !== '');
      return invoke(IpcChannel.fileOpenPaths, paths);
    },
    recent: () => invoke(IpcChannel.fileRecent),
    closeWindow: () => send(IpcChannel.fileClose),
    pickImage: () => invoke(IpcChannel.filePickImage),
  },
  clipboard: {
    read: () => invoke(IpcChannel.clipboardRead),
  },
  menu: {
    onCommand: (listener) => subscribe(IpcChannel.menuCommand, listener),
  },
  print: {
    prepare: (bytes) => invoke(IpcChannel.printPrepare, bytes),
    print: (jobId) => invoke(IpcChannel.printPrint, jobId),
    savePdf: (jobId) => invoke(IpcChannel.printSavePdf, jobId),
    dispose: (jobId) => send(IpcChannel.printDispose, jobId),
    sourceBytes: () => invoke(IpcChannel.printSourceBytes),
    rendered: (result) => send(IpcChannel.printRendered, result),
  },
  settings: {
    get: () => invoke(IpcChannel.settingsGet),
    update: (patch) => invoke(IpcChannel.settingsUpdate, patch),
    onChange: (listener) => subscribe(IpcChannel.settingsChanged, listener),
  },
  spell: {
    isMisspelled: (word) => typeof word === 'string' && word.length <= 64 && webFrame.isWordMisspelled(word),
    suggestions: (word) =>
      typeof word === 'string' && word.length <= 64 ? webFrame.getWordSuggestions(word).slice(0, 8) : [],
    addToDictionary: (word) => send(IpcChannel.spellAddWord, word),
    availableLanguages: () => invoke(IpcChannel.spellLanguages),
  },
  recovery: {
    snapshot: (bytes) => invoke(IpcChannel.recoverySnapshot, bytes),
  },
  fonts: {
    families: () => invoke(IpcChannel.fontFamilies),
    resolve: (families) => invoke(IpcChannel.fontResolve, [...families]),
  },
};

contextBridge.exposeInMainWorld('openword', api);

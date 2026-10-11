import { contextBridge, ipcRenderer, webFrame } from 'electron';

const api = {
  initialDocument: () => ipcRenderer.invoke('doc:initial'),
  open: () => ipcRenderer.invoke('doc:open'),
  saveAs: (bytes: Uint8Array, name: string) => ipcRenderer.invoke('doc:saveAs', bytes, name),
  exportPdf: (bytes: Uint8Array, outPath?: string) => ipcRenderer.invoke('doc:pdf', bytes, outPath),
  fontFamilies: (): Promise<string[]> => ipcRenderer.invoke('fonts:families'),
  resolveFonts: (families: string[]) => ipcRenderer.invoke('fonts:resolve', families),
  isWordMisspelled: (word: string) => webFrame.isWordMisspelled(word),
  wordSuggestions: (word: string) => webFrame.getWordSuggestions(word),
  // impresión
  printBytes: (): Promise<Uint8Array> => ipcRenderer.invoke('print:bytes'),
  printReady: (info: unknown) => ipcRenderer.send('print:ready', info),
  // auto-prueba
  selftest: {
    report: (key: string, value: unknown) => ipcRenderer.send('selftest:report', key, value),
    finish: () => ipcRenderer.invoke('selftest:finish'),
    outDir: (): Promise<string> => ipcRenderer.invoke('selftest:outDir'),
    type: (text: string) => ipcRenderer.invoke('selftest:type', text),
    writeFile: (name: string, bytes: Uint8Array) => ipcRenderer.invoke('selftest:writeFile', name, bytes),
    screenshot: (name: string) => ipcRenderer.invoke('selftest:screenshot', name),
  },
};

export type SpikeApi = typeof api;
contextBridge.exposeInMainWorld('openword', api);

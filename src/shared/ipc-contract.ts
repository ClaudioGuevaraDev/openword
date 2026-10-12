// Contrato entre el proceso main y el renderer. El preload expone `window.openword`
// con exactamente esta forma; main registra un handler por canal.
import type { Paper } from './package-patch';
import type { Settings, SettingsPatch } from './settings';

export type UiLanguage = 'es' | 'en';
export type { Paper } from './package-patch';

export interface AppInfo {
  readonly version: string;
  /** Igual que `process.platform` (el renderer no tiene los tipos de Node). */
  readonly platform: string;
  readonly uiLanguage: UiLanguage;
  /** Región del SO (por ejemplo "MX", "ES", "US"): decide papel Carta/A4 y unidades de la regla. */
  readonly region: string | null;
  readonly paper: Paper;
  /** Solo pruebas (OPENWORD_AUTORECOVER_MS): intervalo de recuperación en milisegundos. */
  readonly autoRecoverIntervalMs?: number;
}

/** Avisos que la ventana muestra en una barra sobre el documento. */
export type DocumentNotice = 'macros' | 'template' | 'converted' | 'recovered' | 'converting';

/** Lo que una ventana debe mostrar. `bytes: null` significa documento nuevo en blanco. */
export interface LoadedDocument {
  readonly docId: string;
  /** Nombre visible: "Documento1" o "informe.docx". */
  readonly displayName: string;
  readonly bytes: Uint8Array | null;
  readonly notices: readonly DocumentNotice[];
}

export type SaveResult =
  | { readonly status: 'saved'; readonly displayName: string }
  | { readonly status: 'canceled' }
  | { readonly status: 'error'; readonly message: string };

export interface RecentFile {
  readonly path: string;
  readonly name: string;
  readonly folder: string;
  readonly openedAt: number;
}

export interface ResolvedFontFace {
  readonly family: string;
  readonly weight: number;
  readonly style: 'normal' | 'italic';
  readonly faceIndex: number;
  readonly bytes: Uint8Array;
}

export type Unsubscribe = () => void;

/** Comandos que llegan desde el menú nativo (macOS). */
export type MenuCommand = 'undo' | 'redo';

/** Resultado de preparar la impresión: el PDF para la vista previa y el trabajo vivo para imprimir. */
export interface PrintJob {
  readonly jobId: string;
  readonly pdf: Uint8Array;
  readonly pages: number;
}

/** Lo que la ventana de impresión informa al terminar de pintar (o por qué no pudo). */
export type PrintRenderResult =
  | {
      readonly ok: true;
      readonly pages: number;
      /** Tamaños de página distintos, en px CSS ("816x1056"). */
      readonly sizes: readonly string[];
      readonly measurer: string;
    }
  | { readonly ok: false; readonly error: string };

/** Resultado del diálogo de impresión del sistema. */
export type PrintOutcome =
  | { readonly status: 'printed' }
  | { readonly status: 'canceled' }
  | { readonly status: 'error'; readonly message: string };

export interface DocState {
  readonly dirty: boolean;
  readonly untouched: boolean;
}

export interface PickedImage {
  readonly name: string;
  readonly bytes: Uint8Array;
}

export interface ClipboardContent {
  readonly text: string;
  readonly html: string;
}

export interface OpenWordApi {
  readonly app: {
    info(): Promise<AppInfo>;
  };
  readonly window: {
    /** Colores de los botones nativos de ventana (minimizar, maximizar, cerrar) según el tema. */
    setTitleBarTheme(dark: boolean): void;
  };
  readonly doc: {
    /** Documento de esta ventana (al cargar la página). */
    current(): Promise<LoadedDocument>;
    /** Main reemplaza el documento de una ventana en blanco sin tocar. */
    onReplaced(listener: (doc: LoadedDocument) => void): Unsubscribe;
    /** El renderer informa si hay cambios sin guardar y si la ventana sigue "sin tocar". */
    setState(state: DocState): void;
    save(bytes: Uint8Array): Promise<SaveResult>;
    saveAs(bytes: Uint8Array): Promise<SaveResult>;
    /** Main pide guardar (al cerrar). El renderer responde con `answerSaveRequest`. */
    onSaveRequest(listener: (requestId: string) => void): Unsubscribe;
    answerSaveRequest(requestId: string, saved: boolean): void;
  };
  readonly file: {
    newDocument(): void;
    openDialog(): Promise<void>;
    openRecent(path: string): Promise<void>;
    /** Archivos soltados sobre la ventana (el preload obtiene sus rutas). */
    openDropped(files: readonly File[]): Promise<void>;
    recent(): Promise<readonly RecentFile[]>;
    closeWindow(): void;
    /** Diálogo para elegir una imagen a insertar (null si se cancela). */
    pickImage(): Promise<PickedImage | null>;
  };
  readonly clipboard: {
    /** Lee el portapapeles del sistema (para el botón Pegar de la cinta). */
    read(): Promise<ClipboardContent>;
  };
  readonly menu: {
    onCommand(listener: (command: MenuCommand) => void): Unsubscribe;
  };
  readonly print: {
    /** Pinta el documento en una ventana oculta y devuelve el PDF (vista previa). */
    prepare(bytes: Uint8Array): Promise<PrintJob>;
    /** Abre el diálogo de impresión del sistema para un trabajo preparado. */
    print(jobId: string): Promise<PrintOutcome>;
    /** Guarda el PDF de un trabajo preparado (diálogo Guardar). */
    savePdf(jobId: string): Promise<SaveResult>;
    dispose(jobId: string): void;
    /** Solo para la ventana de impresión: bytes a pintar y aviso de que terminó. */
    sourceBytes(): Promise<Uint8Array>;
    rendered(result: PrintRenderResult): void;
  };
  readonly settings: {
    get(): Promise<Settings>;
    update(patch: SettingsPatch): Promise<Settings>;
    onChange(listener: (settings: Settings) => void): Unsubscribe;
  };
  readonly spell: {
    /** Consulta síncrona al corrector de Chromium (idiomas configurados en la sesión). */
    isMisspelled(word: string): boolean;
    suggestions(word: string): readonly string[];
    addToDictionary(word: string): void;
    availableLanguages(): Promise<readonly string[]>;
  };
  readonly recovery: {
    /** Copia de recuperación del documento de esta ventana (se borra al guardar o cerrar). */
    snapshot(bytes: Uint8Array): Promise<void>;
  };
  readonly fonts: {
    families(): Promise<readonly string[]>;
    resolve(families: readonly string[]): Promise<readonly ResolvedFontFace[]>;
  };
}

// ----- canales -----
// Un único mapa por dirección: el preload, los handlers de main y los envíos de main se
// tipan a partir de aquí, así un canal no puede tener una forma distinta en cada lado.

/** renderer → main con respuesta (`ipcRenderer.invoke` / `ipcMain.handle`). */
export interface InvokeChannels {
  'app:info': { args: []; result: AppInfo };
  'doc:current': { args: []; result: LoadedDocument };
  'doc:save': { args: [bytes: Uint8Array]; result: SaveResult };
  'doc:save-as': { args: [bytes: Uint8Array]; result: SaveResult };
  'file:open-dialog': { args: []; result: void };
  'file:open-recent': { args: [path: string]; result: void };
  'file:open-paths': { args: [paths: readonly string[]]; result: void };
  'file:recent': { args: []; result: readonly RecentFile[] };
  'file:pick-image': { args: []; result: PickedImage | null };
  'clipboard:read': { args: []; result: ClipboardContent };
  'print:prepare': { args: [bytes: Uint8Array]; result: PrintJob };
  'print:print': { args: [jobId: string]; result: PrintOutcome };
  'print:save-pdf': { args: [jobId: string]; result: SaveResult };
  'print:source-bytes': { args: []; result: Uint8Array };
  'settings:get': { args: []; result: Settings };
  'settings:update': { args: [patch: SettingsPatch]; result: Settings };
  'spell:languages': { args: []; result: readonly string[] };
  'recovery:snapshot': { args: [bytes: Uint8Array]; result: void };
  'fonts:families': { args: []; result: readonly string[] };
  'fonts:resolve': { args: [families: readonly string[]]; result: readonly ResolvedFontFace[] };
}

/** renderer → main sin respuesta (`ipcRenderer.send` / `ipcMain.on`). */
export interface SendChannels {
  'window:title-bar-theme': [dark: boolean];
  'doc:set-state': [state: DocState];
  'doc:save-answer': [requestId: string, saved: boolean];
  'file:new': [];
  'file:close': [];
  'print:dispose': [jobId: string];
  'print:rendered': [result: PrintRenderResult];
  'spell:add-word': [word: string];
}

/** main → renderer (`webContents.send` / `ipcRenderer.on`). */
export interface PushChannels {
  'doc:replaced': [doc: LoadedDocument];
  'doc:save-request': [requestId: string];
  'settings:changed': [settings: Settings];
  'menu:command': [command: MenuCommand];
}

export type InvokeChannel = keyof InvokeChannels;
export type SendChannel = keyof SendChannels;
export type PushChannel = keyof PushChannels;
export type InvokeArgs<C extends InvokeChannel> = InvokeChannels[C]['args'];
export type InvokeResult<C extends InvokeChannel> = InvokeChannels[C]['result'];

export const IpcChannel = {
  appInfo: 'app:info',
  windowTitleBarTheme: 'window:title-bar-theme',
  docCurrent: 'doc:current',
  docReplaced: 'doc:replaced',
  docSetState: 'doc:set-state',
  docSave: 'doc:save',
  docSaveAs: 'doc:save-as',
  docSaveRequest: 'doc:save-request',
  docSaveAnswer: 'doc:save-answer',
  fileNew: 'file:new',
  fileOpenDialog: 'file:open-dialog',
  fileOpenRecent: 'file:open-recent',
  fileOpenPaths: 'file:open-paths',
  fileRecent: 'file:recent',
  fileClose: 'file:close',
  filePickImage: 'file:pick-image',
  clipboardRead: 'clipboard:read',
  menuCommand: 'menu:command',
  printPrepare: 'print:prepare',
  printPrint: 'print:print',
  printSavePdf: 'print:save-pdf',
  printDispose: 'print:dispose',
  printSourceBytes: 'print:source-bytes',
  printRendered: 'print:rendered',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  settingsChanged: 'settings:changed',
  spellAddWord: 'spell:add-word',
  spellLanguages: 'spell:languages',
  recoverySnapshot: 'recovery:snapshot',
  fontFamilies: 'fonts:families',
  fontResolve: 'fonts:resolve',
} as const satisfies Record<string, InvokeChannel | SendChannel | PushChannel>;

// Todo canal de los mapas tiene nombre en IpcChannel (el `satisfies` cubre el sentido inverso).
type Assert<T extends true> = T;
type UnnamedChannel = Exclude<
  InvokeChannel | SendChannel | PushChannel,
  (typeof IpcChannel)[keyof typeof IpcChannel]
>;
export type EveryChannelNamed = Assert<[UnnamedChannel] extends [never] ? true : false>;

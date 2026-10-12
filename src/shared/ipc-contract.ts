// Contrato entre el proceso main y el renderer. El preload expone `window.openword`
// con exactamente esta forma; main registra un handler por canal.
import type { Settings, SettingsPatch } from './settings';

export type UiLanguage = 'es' | 'en';
export type Paper = 'letter' | 'a4';

export interface AppInfo {
  readonly version: string;
  readonly platform:
    | 'aix'
    | 'android'
    | 'darwin'
    | 'freebsd'
    | 'haiku'
    | 'linux'
    | 'openbsd'
    | 'sunos'
    | 'win32'
    | 'cygwin'
    | 'netbsd';
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

/** Lo que la ventana de impresión informa al terminar de pintar. */
export interface PrintRenderInfo {
  readonly pages: number;
  /** Tamaños de página distintos, en px CSS ("816x1056"). */
  readonly sizes: readonly string[];
  readonly measurer: string;
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
    setState(state: { readonly dirty: boolean; readonly untouched: boolean }): void;
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
    pickImage(): Promise<{ readonly name: string; readonly bytes: Uint8Array } | null>;
  };
  readonly clipboard: {
    /** Lee el portapapeles del sistema (para el botón Pegar de la cinta). */
    read(): Promise<{ readonly text: string; readonly html: string }>;
  };
  readonly menu: {
    onCommand(listener: (command: MenuCommand) => void): Unsubscribe;
  };
  readonly print: {
    /** Pinta el documento en una ventana oculta y devuelve el PDF (vista previa). */
    prepare(bytes: Uint8Array): Promise<PrintJob>;
    /** Abre el diálogo de impresión del sistema para un trabajo preparado. */
    print(jobId: string): Promise<{ readonly ok: boolean; readonly error?: string }>;
    /** Guarda el PDF de un trabajo preparado (diálogo Guardar). */
    savePdf(jobId: string): Promise<SaveResult>;
    dispose(jobId: string): void;
    /** Solo para la ventana de impresión: bytes a pintar y aviso de que terminó. */
    sourceBytes(): Promise<Uint8Array>;
    rendered(result: PrintRenderInfo | { readonly error: string }): void;
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
} as const;

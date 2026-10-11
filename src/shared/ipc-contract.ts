// Contrato entre el proceso main y el renderer. El preload expone `window.openword`
// con exactamente esta forma; main registra un handler por canal.

export type UiLanguage = 'es' | 'en';

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
}

export interface OpenWordApi {
  readonly app: {
    info(): Promise<AppInfo>;
  };
}

export const IpcChannel = {
  appInfo: 'app:info',
} as const;

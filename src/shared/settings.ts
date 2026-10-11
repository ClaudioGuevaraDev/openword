// Preferencias de la aplicación (Archivo › Opciones). Se guardan en userData/settings.json.

export interface Settings {
  /** "auto": según el idioma del sistema. */
  readonly uiLanguage: 'auto' | 'es' | 'en';
  readonly spellcheck: {
    readonly enabled: boolean;
    /** Códigos de diccionario (p. ej. "es", "en-US"). */
    readonly languages: readonly string[];
    /** Omitir palabras en MAYÚSCULAS (como Word por defecto). */
    readonly ignoreUppercase: boolean;
    /** Omitir palabras que contienen números. */
    readonly ignoreWithNumbers: boolean;
  };
  /** Minutos entre copias de recuperación automática (0 = desactivada). */
  readonly autoRecoverMinutes: number;
}

export const DEFAULT_SETTINGS: Settings = {
  uiLanguage: 'auto',
  spellcheck: { enabled: true, languages: ['es', 'en-US'], ignoreUppercase: true, ignoreWithNumbers: true },
  autoRecoverMinutes: 2,
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};
export type SettingsPatch = DeepPartial<Settings>;

/** Combina y valida (valores fuera de rango vuelven al predeterminado). */
export function mergeSettings(base: Settings, patch: unknown): Settings {
  const p = (patch && typeof patch === 'object' ? patch : {}) as Record<string, unknown>;
  const spell = (p['spellcheck'] && typeof p['spellcheck'] === 'object' ? p['spellcheck'] : {}) as Record<
    string,
    unknown
  >;
  const lang = p['uiLanguage'];
  const minutes = p['autoRecoverMinutes'];
  const languages = spell['languages'];
  return {
    uiLanguage: lang === 'auto' || lang === 'es' || lang === 'en' ? lang : base.uiLanguage,
    spellcheck: {
      enabled: typeof spell['enabled'] === 'boolean' ? spell['enabled'] : base.spellcheck.enabled,
      languages:
        Array.isArray(languages) &&
        languages.every((l) => typeof l === 'string' && /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})?$/.test(l))
          ? [...new Set(languages as string[])].slice(0, 8)
          : base.spellcheck.languages,
      ignoreUppercase:
        typeof spell['ignoreUppercase'] === 'boolean'
          ? spell['ignoreUppercase']
          : base.spellcheck.ignoreUppercase,
      ignoreWithNumbers:
        typeof spell['ignoreWithNumbers'] === 'boolean'
          ? spell['ignoreWithNumbers']
          : base.spellcheck.ignoreWithNumbers,
    },
    autoRecoverMinutes:
      typeof minutes === 'number' && Number.isInteger(minutes) && minutes >= 0 && minutes <= 120
        ? minutes
        : base.autoRecoverMinutes,
  };
}

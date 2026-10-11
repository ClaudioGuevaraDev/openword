// Tabla de atajos de aplicación (pura, sin DOM: se prueba con Vitest).

export interface KeyLike {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

export type Platform = 'darwin' | 'other';

export type AppAction = 'new' | 'open' | 'save' | 'saveAs' | 'close' | 'backstageBack';

/** Decide qué acción corresponde a una pulsación (función pura para poder probarla). */
export function matchShortcut(e: KeyLike, platform: Platform, backstageOpen: boolean): AppAction | null {
  if (e.key === 'F12' && !e.ctrlKey && !e.metaKey && !e.altKey) return 'saveAs';
  if (e.key === 'Escape' && backstageOpen) return 'backstageBack';
  const mod = platform === 'darwin' ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  if (!mod || e.altKey) return null;
  const key = e.key.toLowerCase();
  if (key === 's') return e.shiftKey ? 'saveAs' : 'save';
  if (e.shiftKey) return null;
  if (key === 'n') return 'new';
  if (key === 'o') return 'open';
  // En macOS ⌘W lo maneja el menú Ventana (que dispara el mismo flujo de cierre).
  if (key === 'w' && platform !== 'darwin') return 'close';
  return null;
}

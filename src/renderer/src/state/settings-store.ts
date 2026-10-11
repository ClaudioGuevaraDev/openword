import { create } from 'zustand';
import { DEFAULT_SETTINGS, type Settings } from '@shared/settings';

interface SettingsState {
  readonly settings: Settings;
  set(settings: Settings): void;
}

/** Copia local de las Opciones (la fuente de verdad está en main). */
export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  set: (settings) => set({ settings }),
}));

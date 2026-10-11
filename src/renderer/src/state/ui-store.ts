import { create } from 'zustand';
import type { UiLanguage } from '@shared/ipc-contract';
import type { MeasureUnit } from '@shared/units';

export type ThemePreference = 'system' | 'light' | 'dark';
export type NavigationTab = 'headings' | 'find';
export type BackstageSection = 'home' | 'print' | 'export' | 'options';

const THEME_KEY = 'openword.theme';
const RULER_KEY = 'openword.rulers';

function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento: la preferencia dura solo esta sesión.
  }
}

export type RibbonTab =
  'file' | 'home' | 'insert' | 'layout' | 'references' | 'view' | 'table' | 'picture' | 'headerFooter';

interface UiState {
  readonly activeTab: RibbonTab;
  readonly language: UiLanguage;
  readonly platform: 'darwin' | 'other';
  readonly unit: MeasureUnit;
  readonly paragraphDialogOpen: boolean;
  readonly pageSetupDialogOpen: boolean;
  readonly navigationOpen: boolean;
  readonly navigationTab: NavigationTab;
  readonly replaceDialogOpen: boolean;
  readonly showRulers: boolean;
  readonly theme: ThemePreference;
  readonly backstageSection: BackstageSection;
  setActiveTab(tab: RibbonTab): void;
  setBackstageSection(section: BackstageSection): void;
  setNavigation(open: boolean, tab?: NavigationTab): void;
  setNavigationTab(tab: NavigationTab): void;
  setReplaceDialogOpen(open: boolean): void;
  setShowRulers(show: boolean): void;
  setTheme(theme: ThemePreference): void;
  setEnvironment(language: UiLanguage, platform: 'darwin' | 'other', unit: MeasureUnit): void;
  openPageSetupDialog(): void;
  closePageSetupDialog(): void;
  openParagraphDialog(): void;
  closeParagraphDialog(): void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'home',
  language: 'es',
  platform: 'other',
  unit: 'cm',
  paragraphDialogOpen: false,
  pageSetupDialogOpen: false,
  navigationOpen: false,
  navigationTab: 'headings',
  replaceDialogOpen: false,
  showRulers: readPref(RULER_KEY, ['on', 'off'], 'on') === 'on',
  theme: readPref(THEME_KEY, ['system', 'light', 'dark'], 'system'),
  backstageSection: 'home',
  // Al salir de la vista Archivo se vuelve a su sección inicial.
  setActiveTab: (activeTab) =>
    set((s) => ({ activeTab, backstageSection: activeTab === 'file' ? s.backstageSection : 'home' })),
  setBackstageSection: (backstageSection) => set({ backstageSection }),
  setNavigation: (navigationOpen, tab) =>
    set((s) => ({ navigationOpen, navigationTab: tab ?? s.navigationTab })),
  setNavigationTab: (navigationTab) => set({ navigationTab }),
  setReplaceDialogOpen: (replaceDialogOpen) => set({ replaceDialogOpen }),
  setShowRulers: (showRulers) => {
    writePref(RULER_KEY, showRulers ? 'on' : 'off');
    set({ showRulers });
  },
  setTheme: (theme) => {
    writePref(THEME_KEY, theme);
    set({ theme });
  },
  setEnvironment: (language, platform, unit) => set({ language, platform, unit }),
  openPageSetupDialog: () => set({ pageSetupDialogOpen: true }),
  closePageSetupDialog: () => set({ pageSetupDialogOpen: false }),
  openParagraphDialog: () => set({ paragraphDialogOpen: true }),
  closeParagraphDialog: () => set({ paragraphDialogOpen: false }),
}));

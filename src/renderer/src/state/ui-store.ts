import { create } from 'zustand';
import type { UiLanguage } from '@shared/ipc-contract';

export type RibbonTab = 'file' | 'home' | 'insert' | 'layout' | 'references' | 'view';

interface UiState {
  readonly activeTab: RibbonTab;
  readonly language: UiLanguage;
  readonly platform: 'darwin' | 'other';
  readonly paragraphDialogOpen: boolean;
  setActiveTab(tab: RibbonTab): void;
  setEnvironment(language: UiLanguage, platform: 'darwin' | 'other'): void;
  openParagraphDialog(): void;
  closeParagraphDialog(): void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'home',
  language: 'es',
  platform: 'other',
  paragraphDialogOpen: false,
  setActiveTab: (activeTab) => set({ activeTab }),
  setEnvironment: (language, platform) => set({ language, platform }),
  openParagraphDialog: () => set({ paragraphDialogOpen: true }),
  closeParagraphDialog: () => set({ paragraphDialogOpen: false }),
}));

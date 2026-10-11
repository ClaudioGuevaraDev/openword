import { create } from 'zustand';
import type { UiLanguage } from '@shared/ipc-contract';
import type { MeasureUnit } from '@shared/units';

export type RibbonTab =
  'file' | 'home' | 'insert' | 'layout' | 'references' | 'view' | 'table' | 'picture' | 'headerFooter';

interface UiState {
  readonly activeTab: RibbonTab;
  readonly language: UiLanguage;
  readonly platform: 'darwin' | 'other';
  readonly unit: MeasureUnit;
  readonly paragraphDialogOpen: boolean;
  readonly pageSetupDialogOpen: boolean;
  setActiveTab(tab: RibbonTab): void;
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
  setActiveTab: (activeTab) => set({ activeTab }),
  setEnvironment: (language, platform, unit) => set({ language, platform, unit }),
  openPageSetupDialog: () => set({ pageSetupDialogOpen: true }),
  closePageSetupDialog: () => set({ pageSetupDialogOpen: false }),
  openParagraphDialog: () => set({ paragraphDialogOpen: true }),
  closeParagraphDialog: () => set({ paragraphDialogOpen: false }),
}));

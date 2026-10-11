import { create } from 'zustand';

export type RibbonTab = 'file' | 'home' | 'insert' | 'layout' | 'references' | 'view';

interface UiState {
  readonly activeTab: RibbonTab;
  setActiveTab(tab: RibbonTab): void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'home',
  setActiveTab: (activeTab) => set({ activeTab }),
}));

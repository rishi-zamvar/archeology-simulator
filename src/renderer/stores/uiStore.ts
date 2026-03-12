/**
 * Zustand store for UI state.
 *
 * Manages which side panels are open and which sub-panel is active.
 * All components that need to read or toggle panel state import from here.
 */

import { create } from 'zustand';

export type ActivePanel = 'inventory' | 'port' | 'log' | null;

interface UIState {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  activePanel: ActivePanel;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setActivePanel: (panel: ActivePanel) => void;
}

export const useUIStore = create<UIState>((set) => ({
  leftPanelOpen: false,
  rightPanelOpen: false,
  activePanel: null,
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setActivePanel: (panel) => set({ activePanel: panel }),
}));

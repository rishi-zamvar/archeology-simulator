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
  selectedPortId: string | null;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setActivePanel: (panel: ActivePanel) => void;
  setSelectedPort: (portId: string | null) => void;
  openLeftPanel: () => void;
  openRightPanel: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  leftPanelOpen: false,
  rightPanelOpen: false,
  activePanel: null,
  selectedPortId: null,
  toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setSelectedPort: (portId) => set({ selectedPortId: portId }),
  openLeftPanel: () => set({ leftPanelOpen: true }),
  openRightPanel: () => set({ rightPanelOpen: true }),
}));

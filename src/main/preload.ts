/**
 * Preload script — the security-critical contextBridge surface.
 *
 * This script runs in a privileged context with access to Node.js APIs,
 * but exposes ONLY a narrow, typed API to the renderer. The renderer
 * NEVER gets access to ipcRenderer directly.
 *
 * Security properties enforced here:
 * - contextIsolation: true  (set in main/index.ts BrowserWindow)
 * - nodeIntegration: false  (set in main/index.ts BrowserWindow)
 * - sandbox: true           (set in main/index.ts BrowserWindow)
 * - Only whitelisted IPC channels are accessible from renderer
 */

import type { IPCBridge } from '../shared/ipc-types';

// Conditional import so unit tests can import this module outside Electron.
// In the Electron runtime contextBridge and ipcRenderer are always available.
let contextBridge: Electron.ContextBridge | undefined;
let ipcRenderer: Electron.IpcRenderer | undefined;

try {
  // Justification: conditional require for Electron APIs allows this module to be tested outside Electron context
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const electron = require('electron') as typeof import('electron');
  contextBridge = electron.contextBridge;
  ipcRenderer = electron.ipcRenderer;
} catch {
  // Running outside Electron (e.g. vitest) — skip bridge setup.
  // The test only verifies that ipcRenderer is NOT re-exported.
}

const api: IPCBridge = {
  game: {
    // Phase 1: core FSM channels
    load: () => ipcRenderer!.invoke('game:load'),
    save: (state) => ipcRenderer!.invoke('game:save', state),
    action: (action) => ipcRenderer!.invoke('game:action', action),
    // Phase 2: port and market data channels
    getPorts: () => ipcRenderer!.invoke('game:getPorts'),
    getPortDetails: (portId) => ipcRenderer!.invoke('game:getPortDetails', portId),
    getMarketPrices: (portId) => ipcRenderer!.invoke('game:getMarketPrices', portId),
    getReachablePorts: (fromPortId, currentTurn) => ipcRenderer!.invoke('game:getReachablePorts', fromPortId, currentTurn),
    getPlayerInventory: () => ipcRenderer!.invoke('game:getPlayerInventory'),
    // Phase 2 Plan 3: trade channels
    buyGood: (portId, goodId, qty) => ipcRenderer!.invoke('game:buyGood', portId, goodId, qty),
    sellGood: (portId, goodId, qty) => ipcRenderer!.invoke('game:sellGood', portId, goodId, qty),
    getTransactionHistory: (limit) => ipcRenderer!.invoke('game:getTransactionHistory', limit),
    // Phase 2 Plan 4: voyage event channels
    getPendingEvent: () => ipcRenderer!.invoke('game:getPendingEvent'),
    resolveEvent: (eventId, choiceId) => ipcRenderer!.invoke('game:resolveEvent', eventId, choiceId),
    // Phase 4 Plan 2: curated offline images
    getCuratedImages: (query: { goodId?: string; portId?: string }) =>
      ipcRenderer!.invoke('game:get-curated-images', query),
    // Phase 11: per-turn sailing advancement
    advanceSailingTurn: () => ipcRenderer!.invoke('game:advanceSailingTurn'),
    // Phase 9 Plan 3: seasonal weather — wait for spring
    waitForSpring: () => ipcRenderer!.invoke('game:waitForSpring'),
    // Phase 12: title screen
    hasSave: () => ipcRenderer!.invoke('game:hasSave'),
    newGame: () => ipcRenderer!.invoke('game:newGame'),
    // Phase 16: Port lore
    getPortLore: (portId: string) => ipcRenderer!.invoke('game:getPortLore', portId),
    // Phase 18: Reputation
    getPortReputation: (portId: string) => ipcRenderer!.invoke('game:getPortReputation', portId),
    // Scan resources/images/ for available image files
    scanResourceImages: () =>
      ipcRenderer!.invoke('game:scan-resource-images'),
  },
  // Phase 14: Dialogue Engine
  dialogue: {
    getNodes: (npcId: string) => ipcRenderer!.invoke('dialogue:getNodes', npcId),
    advanceNode: (npcId: string, nodeId: string, choiceIndex: number) => ipcRenderer!.invoke('dialogue:advanceNode', npcId, nodeId, choiceIndex),
    getAvailableNpcs: (portId: string) => ipcRenderer!.invoke('dialogue:getAvailableNpcs', portId),
  },
  // Phase 15: Quest System
  quest: {
    getActive: () => ipcRenderer!.invoke('quest:getActive'),
    getAll: () => ipcRenderer!.invoke('quest:getAll'),
  },
  // Phase 10: Captain's Journal
  journal: {
    getEntries: (limit?: number) => ipcRenderer!.invoke('journal:getEntries', limit),
    addNote: (title: string, text: string) => ipcRenderer!.invoke('journal:addNote', title, text),
  },
  subscribe: (event, callback) => {
    const handler = (_: Electron.IpcRendererEvent, data: unknown) =>
      callback(data);
    ipcRenderer!.on(`subscribe:${event}`, handler);
    // Return cleanup function — CRITICAL to prevent memory leaks
    return () => ipcRenderer!.removeListener(`subscribe:${event}`, handler);
  },
};

// Expose only the typed api surface — never expose ipcRenderer itself
if (contextBridge) {
  contextBridge.exposeInMainWorld('api', api);
}

// Augment Window type so renderer TypeScript knows about window.api
declare global {
  interface Window {
    api: IPCBridge;
  }
}

// No named export of ipcRenderer — this is the security invariant
// verified by tests/scaffold.test.ts

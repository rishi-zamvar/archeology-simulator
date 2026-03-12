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
    load: () => ipcRenderer!.invoke('game:load'),
    save: (state) => ipcRenderer!.invoke('game:save', state),
    action: (action) => ipcRenderer!.invoke('game:action', action),
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

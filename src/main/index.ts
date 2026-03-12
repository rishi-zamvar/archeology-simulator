/**
 * Electron main process entry point.
 *
 * Responsibilities:
 * - Create the BrowserWindow with security settings
 * - Load renderer (Vite dev server in dev, built HTML in production)
 * - Register IPC handlers for game:load, game:save, game:action
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import type { GameState, GameAction, GameResult } from '../shared/ipc-types';

// Initial empty game state returned when no save exists
const INITIAL_STATE: GameState = {
  type: 'idle',
  currentTurn: 0,
};

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Archeology Simulator',
    webPreferences: {
      // Preload runs in a privileged context; exposes only window.api
      preload: path.join(__dirname, 'preload.js'),
      // Security: renderer cannot access Node.js APIs directly
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env['NODE_ENV'] === 'development' || process.env['VITE_DEV_SERVER_URL']) {
    const devUrl = process.env['VITE_DEV_SERVER_URL'] ?? 'http://localhost:5173';
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return win;
}

// --- IPC Handlers ---

/**
 * game:load — Return saved game state (stub returns initial state until
 * Phase 1 Plan 02 wires up the SQLite persistence layer).
 */
ipcMain.handle('game:load', async (): Promise<GameState> => {
  return INITIAL_STATE;
});

/**
 * game:save — Persist game state (stub until SQLite layer is ready).
 */
ipcMain.handle('game:save', async (_event, state: GameState): Promise<GameResult> => {
  if (!state || typeof state !== 'object' || !('type' in state)) {
    return { success: false, state: INITIAL_STATE, error: 'Invalid state shape' };
  }
  return { success: true, state };
});

/**
 * game:action — Apply a game action and return updated state
 * (stub until game engine is implemented in Plan 04+).
 */
ipcMain.handle('game:action', async (_event, action: GameAction): Promise<GameResult> => {
  if (!action || typeof action.type !== 'string') {
    return { success: false, state: INITIAL_STATE, error: 'Invalid action' };
  }
  // Stub: echo back initial state for now
  return { success: true, state: INITIAL_STATE };
});

// --- App lifecycle ---

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // macOS: re-create window when dock icon clicked and no windows open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS it's conventional to keep the app running until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * IPC handlers for game:action.
 *
 * registerGameIPCHandlers(db) wires the game:action channel.
 * Each action: loads current state, applies FSM transition, auto-saves,
 * broadcasts 'subscribe:game:updated' to all windows.
 */

import { ipcMain, BrowserWindow } from 'electron';
import type Database from 'better-sqlite3';
import { loadGameState, saveGameStateAtomic } from '../db/queries';
import { performAction } from '../../game/engine';
import type { GameAction, GameResult, GameState } from '../../game/types';

const INITIAL_STATE: GameState = { type: 'idle', currentTurn: 0 };

export function registerGameIPCHandlers(db: Database.Database): void {
  /**
   * game:action — apply action to current state, auto-save, broadcast update.
   */
  ipcMain.handle('game:action', async (_event, action: GameAction): Promise<GameResult> => {
    if (!action || typeof action.type !== 'string') {
      return { success: false, state: INITIAL_STATE, error: 'Invalid action' };
    }

    const current = loadGameState(db) ?? INITIAL_STATE;
    const result = performAction(current, action);

    if (result.success) {
      try {
        saveGameStateAtomic(db, result.state);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, state: current, error: `Save failed: ${message}` };
      }

      // Broadcast updated state to all renderer windows.
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send('subscribe:game:updated', result.state);
        }
      }
    }

    return result;
  });
}

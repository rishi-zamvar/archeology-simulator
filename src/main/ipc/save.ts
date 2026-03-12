/**
 * IPC handlers for game:load and game:save.
 *
 * registerSaveIPCHandlers(db) wires the two save/load IPC channels.
 * The handlers validate state shape before writing to avoid persisting
 * corrupted data.
 */

import { ipcMain } from 'electron';
import type Database from 'better-sqlite3';
import { saveGameStateAtomic, loadGameState } from '../db/queries';
import type { GameState, GameResult } from '../../game/types';

const INITIAL_STATE: GameState = { type: 'idle', currentTurn: 0 };

/**
 * Type guard — ensures the value has the minimum shape of a GameState.
 */
function isValidGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (!['idle', 'trading', 'sailing', 'encountered'].includes(v['type'] as string)) return false;
  if (typeof v['currentTurn'] !== 'number') return false;
  return true;
}

export function registerSaveIPCHandlers(db: Database.Database): void {
  /**
   * game:load — Return the saved state, or initial idle state if none exists.
   */
  ipcMain.handle('game:load', async (): Promise<GameState> => {
    const saved = loadGameState(db);
    return saved ?? INITIAL_STATE;
  });

  /**
   * game:save — Validate and persist state. Returns { success: boolean }.
   */
  ipcMain.handle('game:save', async (_event, state: unknown): Promise<GameResult> => {
    if (!isValidGameState(state)) {
      return { success: false, state: INITIAL_STATE, error: 'Invalid state shape' };
    }

    try {
      saveGameStateAtomic(db, state);
      return { success: true, state };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, state, error: message };
    }
  });
}

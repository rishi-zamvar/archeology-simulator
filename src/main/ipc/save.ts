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

// New games start the tutorial from the beginning (same as game.ts INITIAL_STATE).
const INITIAL_STATE: GameState = { type: 'idle', currentTurn: 0, tutorialPhase: { type: 'map_intro' } };

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

/**
 * Backfill tutorialPhase on a loaded save that predates the tutorial system.
 * Existing saves have no tutorialPhase field → default to 'completed' so
 * returning players are not forced through the tutorial again.
 */
function withTutorialDefault(state: GameState): GameState {
  if (state.tutorialPhase !== undefined) return state;
  return { ...state, tutorialPhase: { type: 'completed' } };
}

export function registerSaveIPCHandlers(db: Database.Database): void {
  /**
   * game:load — Return the saved state, or initial idle state if none exists.
   * Backfills tutorialPhase on old saves that predate the tutorial system.
   */
  ipcMain.handle('game:load', async (): Promise<GameState> => {
    const saved = loadGameState(db);
    if (!saved) return INITIAL_STATE;
    return withTutorialDefault(saved);
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

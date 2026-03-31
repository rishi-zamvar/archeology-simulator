/**
 * IPC handlers for game:load and game:save.
 *
 * registerSaveIPCHandlers(db) wires the two save/load IPC channels.
 * The handlers validate state shape before writing to avoid persisting
 * corrupted data.
 */

import type Database from 'better-sqlite3';
import { saveGameStateAtomic, loadGameState } from '../db/queries';
import type { GameState } from '../../game/types';
import { wrapHandler } from '../lib/ipc-wrapper';
import { createLogger } from '../lib/logger';

const log = createLogger('SaveIPC');

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
  wrapHandler<GameState>(
    'game:load',
    async () => {
      log.info('Loading game state');
      return withTutorialDefault(loadGameState(db) ?? INITIAL_STATE);
    },
  );

  /**
   * game:save — Validate and persist state. Returns the saved GameState.
   */
  wrapHandler<GameState, [unknown]>(
    'game:save',
    async (state) => {
      saveGameStateAtomic(db, state as GameState);
      log.info('Game state saved');
      return state as GameState;
    },
    (state) => {
      if (!isValidGameState(state)) return 'Invalid state shape';
      return null;
    },
  );

  /**
   * game:hasSave — check if a save exists without loading the full state.
   */
  wrapHandler<boolean>(
    'game:hasSave',
    async () => {
      const row = db.prepare('SELECT 1 FROM game_state WHERE id = 1').get();
      return row !== undefined;
    },
  );

  /**
   * game:newGame — reset all game data and return fresh initial state.
   */
  wrapHandler<GameState>(
    'game:newGame',
    async () => {
      const reset = db.transaction(() => {
        db.prepare('DELETE FROM game_state').run();
        db.prepare('DELETE FROM transaction_history').run();
        db.prepare('DELETE FROM journal_entries').run();
        db.prepare('DELETE FROM player_inventory').run();
        // Re-insert fresh state
        saveGameStateAtomic(db, INITIAL_STATE);
      });
      reset();
      return INITIAL_STATE;
    },
  );
}

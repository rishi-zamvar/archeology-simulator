/**
 * IPC handlers for game:load and game:save.
 *
 * registerSaveIPCHandlers(db) wires the two save/load IPC channels.
 * The handlers validate state shape before writing to avoid persisting
 * corrupted data.
 */

import type Database from 'better-sqlite3';
import { saveGameStateAtomic, loadGameState, seedStartingPorts, setPortAccessLevel, getAllPortAccess } from '../db/queries';
import { PLAYER_DATA_TABLES } from '../db/schema';
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
      const state = loadGameState(db);

      // Backward compatibility: v1.3 saves have game_state but no port_access rows.
      // Treat all 25 existing ports as unlocked so returning players can access everything.
      if (state) {
        const portAccessRows = getAllPortAccess(db);
        const hasAnyPortAccess = portAccessRows.some(p => p.status !== 'unknown');
        if (!hasAnyPortAccess) {
          log.info('Legacy save detected — unlocking all ports for backward compatibility');
          const allPorts = db.prepare('SELECT id FROM ports').all() as Array<{ id: string }>;
          const insertLegacy = db.transaction(() => {
            for (const port of allPorts) {
              setPortAccessLevel(db, port.id, 'unlocked', 'legacy_save');
            }
          });
          insertLegacy();
        }
      }

      return withTutorialDefault(state ?? INITIAL_STATE);
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
   * game:newGame — reset all player-data tables and return fresh initial state.
   * Iterates PLAYER_DATA_TABLES so future phases adding new tables only need
   * to update the array in schema.ts.
   */
  wrapHandler<GameState>(
    'game:newGame',
    async () => {
      const reset = db.transaction(() => {
        for (const table of PLAYER_DATA_TABLES) {
          db.prepare(`DELETE FROM ${table}`).run();
        }
        // Re-insert fresh state
        saveGameStateAtomic(db, INITIAL_STATE);
        // Seed starting ports: Piraeus (athens) unlocked, Corinth unlocked, Miletus discovered
        seedStartingPorts(db);
        // Seed merchants_odyssey meta-quest as active from the start
        db.prepare(`
          INSERT INTO quest_progress (quest_id, status, current_objective, started_at)
          VALUES ('merchants_odyssey', 'active', 0, datetime('now'))
          ON CONFLICT(quest_id) DO NOTHING
        `).run();
      });
      reset();
      return INITIAL_STATE;
    },
  );

  /**
   * db:schemaVersion — return the current migration version for debugging.
   */
  wrapHandler<{ version: number }>(
    'db:schemaVersion',
    async () => {
      const row = db.prepare('SELECT version FROM schema_version').get() as { version: number };
      return row;
    },
  );
}

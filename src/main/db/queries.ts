/**
 * Database query functions — atomic save and load of game state.
 *
 * saveGameStateAtomic() writes to game_state (upsert) and saves_history
 * in a single better-sqlite3 transaction. If either statement fails,
 * both roll back — guaranteeing ACID consistency.
 *
 * loadGameState() returns the parsed GameState from the single game_state
 * row, or null if no save exists yet.
 */

import type Database from 'better-sqlite3';
import type { GameState } from '../../game/types';

/**
 * Persist game state atomically.
 * Writes to both game_state (single-row upsert) and saves_history (append).
 * Throws if state cannot be serialized or DB write fails.
 */
export function saveGameStateAtomic(db: Database.Database, state: GameState): void {
  const stateJson = JSON.stringify(state);

  const atomicSave = db.transaction(() => {
    // Upsert into game_state — always id=1, so only one row ever exists.
    db.prepare(`
      INSERT INTO game_state (id, state_json, saved_at)
      VALUES (1, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        state_json = excluded.state_json,
        saved_at   = excluded.saved_at
    `).run(stateJson);

    // Append to saves_history for audit trail.
    db.prepare(`
      INSERT INTO saves_history (state_json, saved_at)
      VALUES (?, datetime('now'))
    `).run(stateJson);
  });

  atomicSave();
}

/**
 * Load the most recent saved game state.
 * Returns null if no save exists yet (first launch).
 */
export function loadGameState(db: Database.Database): GameState | null {
  const row = db.prepare('SELECT state_json FROM game_state WHERE id = 1').get() as
    | { state_json: string }
    | undefined;

  if (!row) {
    return null;
  }

  return JSON.parse(row.state_json) as GameState;
}

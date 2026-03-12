/**
 * Save/Load tests — TDD RED phase
 *
 * Tests ACID atomicity, round-trip fidelity, and concurrent writes
 * for the SQLite persistence layer.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import type { GameState } from '../../src/game/types';

let db: Database;

describe('saveGameStateAtomic() and loadGameState()', () => {
  beforeEach(async () => {
    const { initializeDatabase } = await import('../../src/main/db/schema');
    db = initializeDatabase(':memory:');
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('returns null when no save exists', async () => {
    const { loadGameState } = await import('../../src/main/db/queries');
    const result = loadGameState(db);
    expect(result).toBeNull();
  });

  it('round-trips an idle state correctly', async () => {
    const { saveGameStateAtomic, loadGameState } = await import('../../src/main/db/queries');
    const state: GameState = { type: 'idle', currentTurn: 7 };
    saveGameStateAtomic(db, state);
    const loaded = loadGameState(db);
    expect(loaded).toEqual(state);
  });

  it('round-trips a trading state with selectedPort', async () => {
    const { saveGameStateAtomic, loadGameState } = await import('../../src/main/db/queries');
    const state: GameState = { type: 'trading', currentTurn: 3, selectedPort: 'Alexandria' };
    saveGameStateAtomic(db, state);
    const loaded = loadGameState(db);
    expect(loaded).toEqual(state);
  });

  it('round-trips a sailing state with destination and eta', async () => {
    const { saveGameStateAtomic, loadGameState } = await import('../../src/main/db/queries');
    const state: GameState = { type: 'sailing', currentTurn: 2, destination: 'Rome', eta: 3 };
    saveGameStateAtomic(db, state);
    const loaded = loadGameState(db);
    expect(loaded).toEqual(state);
  });

  it('second save overwrites the first — loadGameState returns latest', async () => {
    const { saveGameStateAtomic, loadGameState } = await import('../../src/main/db/queries');
    const state1: GameState = { type: 'idle', currentTurn: 1 };
    const state2: GameState = { type: 'idle', currentTurn: 99 };
    saveGameStateAtomic(db, state1);
    saveGameStateAtomic(db, state2);
    const loaded = loadGameState(db);
    expect(loaded).toEqual(state2);
  });

  it('saves_history grows on each save', async () => {
    const { saveGameStateAtomic } = await import('../../src/main/db/queries');
    const state1: GameState = { type: 'idle', currentTurn: 1 };
    const state2: GameState = { type: 'idle', currentTurn: 2 };
    saveGameStateAtomic(db, state1);
    saveGameStateAtomic(db, state2);
    const count = db.prepare('SELECT COUNT(*) as c FROM saves_history').get() as { c: number };
    expect(count.c).toBe(2);
  });

  it('game_state table always has exactly one row after saves', async () => {
    const { saveGameStateAtomic } = await import('../../src/main/db/queries');
    for (let i = 0; i < 3; i++) {
      saveGameStateAtomic(db, { type: 'idle', currentTurn: i });
    }
    const count = db.prepare('SELECT COUNT(*) as c FROM game_state').get() as { c: number };
    expect(count.c).toBe(1);
  });

  it('two rapid back-to-back saves do not cause lock errors', async () => {
    const { saveGameStateAtomic } = await import('../../src/main/db/queries');
    expect(() => {
      saveGameStateAtomic(db, { type: 'idle', currentTurn: 1 });
      saveGameStateAtomic(db, { type: 'idle', currentTurn: 2 });
    }).not.toThrow();
  });
});

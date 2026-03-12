/**
 * Schema tests — TDD RED phase
 *
 * Tests that initializeDatabase() correctly creates tables in WAL mode
 * and is idempotent (safe to call multiple times).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';

let db: Database;

describe('initializeDatabase()', () => {
  beforeEach(async () => {
    const { initializeDatabase } = await import('../../src/main/db/schema');
    db = initializeDatabase(':memory:');
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('returns an open database instance', () => {
    expect(db).toBeDefined();
    expect(db.open).toBe(true);
  });

  it('creates game_state table', () => {
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='game_state'"
    ).get();
    expect(row).toBeDefined();
  });

  it('creates saves_history table', () => {
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='saves_history'"
    ).get();
    expect(row).toBeDefined();
  });

  it('enables WAL journal mode', () => {
    const row = db.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
    expect(row.journal_mode).toBe('wal');
  });

  it('is idempotent — calling twice does not throw', () => {
    const { initializeDatabase } = require('../../src/main/db/schema');
    expect(() => {
      const db2 = initializeDatabase(':memory:');
      db2.close();
    }).not.toThrow();
  });

  it('game_state table has id and state_json columns', () => {
    const columns = db
      .prepare("PRAGMA table_info(game_state)")
      .all() as Array<{ name: string }>;
    const names = columns.map((c) => c.name);
    expect(names).toContain('id');
    expect(names).toContain('state_json');
  });

  it('saves_history table has id, state_json, and saved_at columns', () => {
    const columns = db
      .prepare("PRAGMA table_info(saves_history)")
      .all() as Array<{ name: string }>;
    const names = columns.map((c) => c.name);
    expect(names).toContain('id');
    expect(names).toContain('state_json');
    expect(names).toContain('saved_at');
  });
});

/**
 * Migration system tests — verifies fresh installs, v1.3 upgrades,
 * rollback on failure, and correct column structures for all new tables.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';

let db: Database;

describe('Migration system', () => {
  beforeEach(async () => {
    const { initializeDatabase } = await import('../../src/main/db/schema');
    db = initializeDatabase(':memory:');
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('fresh database gets all migrations applied', () => {
    const row = db.prepare('SELECT version FROM schema_version').get() as {
      version: number;
    };
    expect(row.version).toBe(9);
  });

  it('schema_version table has version and migrated_at columns', () => {
    const columns = db
      .prepare('PRAGMA table_info(schema_version)')
      .all() as Array<{ name: string }>;
    const names = columns.map((c) => c.name);
    expect(names).toContain('version');
    expect(names).toContain('migrated_at');
  });

  it('v1.3 database upgrades cleanly', async () => {
    // Close the auto-created db
    db.close();

    // Manually create a v1.3 database (all 10 original tables, with cultural_description)
    const DatabaseCtor = (await import('better-sqlite3')).default;
    const legacyDb = new DatabaseCtor(':memory:');
    legacyDb.pragma('journal_mode = WAL');

    legacyDb.exec(`
      CREATE TABLE game_state (id INTEGER PRIMARY KEY DEFAULT 1, state_json TEXT NOT NULL, saved_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE saves_history (id INTEGER PRIMARY KEY AUTOINCREMENT, state_json TEXT NOT NULL, saved_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE ports (id TEXT PRIMARY KEY, ancient_name TEXT NOT NULL, modern_name TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL, region TEXT NOT NULL, description TEXT NOT NULL, pleiades_id TEXT, cultural_description TEXT);
      CREATE TABLE goods (id TEXT PRIMARY KEY, name TEXT NOT NULL, base_price INTEGER NOT NULL, description TEXT NOT NULL);
      CREATE TABLE port_inventory (port_id TEXT NOT NULL, good_id TEXT NOT NULL, supply INTEGER NOT NULL DEFAULT 5, demand INTEGER NOT NULL DEFAULT 5, PRIMARY KEY (port_id, good_id));
      CREATE TABLE player_inventory (id INTEGER PRIMARY KEY DEFAULT 1, gold INTEGER NOT NULL DEFAULT 500, cargo_capacity INTEGER NOT NULL DEFAULT 50, cargo_json TEXT NOT NULL DEFAULT '[]');
      CREATE TABLE transaction_history (id INTEGER PRIMARY KEY AUTOINCREMENT, turn INTEGER NOT NULL, port_id TEXT NOT NULL, good_id TEXT NOT NULL, action TEXT NOT NULL, quantity INTEGER NOT NULL, price_per_unit INTEGER NOT NULL, total_value INTEGER NOT NULL, recorded_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE artifact_cache (id TEXT PRIMARY KEY, good_id TEXT NOT NULL, museum_id TEXT NOT NULL, image_url TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', cache_timestamp TEXT NOT NULL);
      CREATE TABLE curated_images (id TEXT PRIMARY KEY, good_id TEXT, port_id TEXT, file_path TEXT NOT NULL, attribution TEXT NOT NULL, source_url TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE journal_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, turn INTEGER NOT NULL, entry_type TEXT NOT NULL, title TEXT NOT NULL, body_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now')));
    `);

    // Run migrations on the legacy database
    const { runMigrations } = await import('../../src/main/db/schema');
    expect(() => runMigrations(legacyDb)).not.toThrow();

    const row = legacyDb.prepare('SELECT version FROM schema_version').get() as {
      version: number;
    };
    expect(row.version).toBe(9);

    // Verify new tables exist
    const tables = legacyDb
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('quest_progress','npc_dialogue_state','reputation','port_lore','port_access')"
      )
      .all() as Array<{ name: string }>;
    expect(tables).toHaveLength(5);

    legacyDb.close();
  });

  it('failed migration rolls back cleanly', async () => {
    // Close the auto-created db
    db.close();

    const DatabaseCtor = (await import('better-sqlite3')).default;
    const testDb = new DatabaseCtor(':memory:');
    testDb.pragma('journal_mode = WAL');

    // Apply migrations normally first
    const { runMigrations } = await import('../../src/main/db/schema');
    runMigrations(testDb);

    // Verify we're at version 8
    let row = testDb.prepare('SELECT version FROM schema_version').get() as {
      version: number;
    };
    expect(row.version).toBe(9);

    // Now simulate a future migration that fails by manually setting version
    // back and creating a table that would conflict with migration v3 (quest_progress)
    // This verifies that if a migration throws, the version stays put.
    testDb.prepare('UPDATE schema_version SET version = 2').run();

    // Drop quest_progress so migration v3 can run, but create a conflicting
    // table for npc_dialogue_state (migration v4) so it fails
    testDb.exec('DROP TABLE quest_progress');
    testDb.exec('DROP TABLE npc_dialogue_state');
    testDb.exec('DROP TABLE reputation');
    testDb.exec('DROP TABLE port_lore');
    testDb.exec('DROP TABLE port_access');

    // Create a deliberately conflicting npc_dialogue_state (wrong schema)
    // that will cause migration v4 to fail with "table already exists"
    testDb.exec('CREATE TABLE npc_dialogue_state (id INTEGER PRIMARY KEY)');

    // Running migrations should fail at v4
    expect(() => runMigrations(testDb)).toThrow();

    // Version should be 3 (v3 succeeded, v4 rolled back)
    row = testDb.prepare('SELECT version FROM schema_version').get() as {
      version: number;
    };
    expect(row.version).toBe(3);

    testDb.close();
  });

  describe('new tables have correct columns', () => {
    it('quest_progress has correct columns', () => {
      const columns = db
        .prepare('PRAGMA table_info(quest_progress)')
        .all() as Array<{ name: string; type: string }>;
      const names = columns.map((c) => c.name);
      expect(names).toEqual([
        'quest_id',
        'status',
        'current_objective',
        'started_at',
        'completed_at',
      ]);
    });

    it('npc_dialogue_state has correct columns', () => {
      const columns = db
        .prepare('PRAGMA table_info(npc_dialogue_state)')
        .all() as Array<{ name: string; type: string }>;
      const names = columns.map((c) => c.name);
      expect(names).toEqual([
        'npc_id',
        'last_node_id',
        'times_spoken',
        'last_spoken_turn',
      ]);
    });

    it('reputation has correct columns', () => {
      const columns = db
        .prepare('PRAGMA table_info(reputation)')
        .all() as Array<{ name: string; type: string }>;
      const names = columns.map((c) => c.name);
      expect(names).toEqual(['region', 'score']);
    });

    it('port_lore has correct columns', () => {
      const columns = db
        .prepare('PRAGMA table_info(port_lore)')
        .all() as Array<{ name: string; type: string }>;
      const names = columns.map((c) => c.name);
      expect(names).toEqual([
        'port_id',
        'history',
        'culture',
        'trade_specialization',
        'notable_facts_json',
        'historical_period',
        'primary_sources_json',
      ]);
    });

    it('port_access has correct columns', () => {
      const columns = db
        .prepare('PRAGMA table_info(port_access)')
        .all() as Array<{ name: string; type: string }>;
      const names = columns.map((c) => c.name);
      expect(names).toEqual([
        'port_id',
        'discovered',
        'discovered_turn',
        'unlock_method',
        'status',
      ]);
    });
  });

  describe('PLAYER_DATA_TABLES', () => {
    it('contains all 9 player-data tables', async () => {
      const { PLAYER_DATA_TABLES } = await import('../../src/main/db/schema');
      expect(PLAYER_DATA_TABLES).toHaveLength(9);
      expect(PLAYER_DATA_TABLES).toContain('game_state');
      expect(PLAYER_DATA_TABLES).toContain('saves_history');
      expect(PLAYER_DATA_TABLES).toContain('transaction_history');
      expect(PLAYER_DATA_TABLES).toContain('journal_entries');
      expect(PLAYER_DATA_TABLES).toContain('player_inventory');
      expect(PLAYER_DATA_TABLES).toContain('quest_progress');
      expect(PLAYER_DATA_TABLES).toContain('npc_dialogue_state');
      expect(PLAYER_DATA_TABLES).toContain('reputation');
      expect(PLAYER_DATA_TABLES).toContain('port_access');
    });

    it('does NOT contain reference or infrastructure tables', async () => {
      const { PLAYER_DATA_TABLES } = await import('../../src/main/db/schema');
      const arr = [...PLAYER_DATA_TABLES];
      expect(arr).not.toContain('port_lore');
      expect(arr).not.toContain('ports');
      expect(arr).not.toContain('goods');
      expect(arr).not.toContain('port_inventory');
      expect(arr).not.toContain('artifact_cache');
      expect(arr).not.toContain('curated_images');
      expect(arr).not.toContain('schema_version');
    });
  });
});

/**
 * Port access query tests — verifies three-tier access model (unknown/discovered/unlocked),
 * no-downgrade semantics, new-game seeding, and auto-discover on visit.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';

let db: Database;

describe('Port access queries', () => {
  beforeEach(async () => {
    const { initializeDatabase } = await import('../../src/main/db/schema');
    db = initializeDatabase(':memory:');

    // Seed a few ports so getAllPortAccess has rows to join against
    const { seedPorts } = await import('../../src/main/db/queries');
    seedPorts(db);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('test_givenNewDb_whenGetPortAccessLevel_thenReturnsUnknown', async () => {
    const { getPortAccessLevel } = await import('../../src/main/db/queries');
    expect(getPortAccessLevel(db, 'athens')).toBe('unknown');
    expect(getPortAccessLevel(db, 'nonexistent_port')).toBe('unknown');
  });

  it('test_givenSeededPorts_whenGetAllPortAccess_thenPiraeusUnlockedNeighborsAndTyreDiscovered', async () => {
    const { seedStartingPorts, getAllPortAccess } = await import('../../src/main/db/queries');
    seedStartingPorts(db);

    const all = getAllPortAccess(db);

    const athens = all.find(p => p.portId === 'athens');
    const corinth = all.find(p => p.portId === 'corinth');
    const sparta = all.find(p => p.portId === 'sparta');
    const miletos = all.find(p => p.portId === 'miletos');
    const tyre = all.find(p => p.portId === 'tyre');
    const carthage = all.find(p => p.portId === 'carthage');

    expect(athens?.status).toBe('unlocked');
    expect(athens?.unlockMethod).toBe('starting_port');
    expect(corinth?.status).toBe('discovered');
    expect(sparta?.status).toBe('discovered');
    expect(miletos?.status).toBe('discovered');
    expect(tyre?.status).toBe('discovered');
    expect(tyre?.unlockMethod).toBe('quest_destination');
    expect(carthage?.status).toBe('unknown');

    // Exactly 5 non-unknown ports (athens + corinth + sparta + miletos + tyre)
    const nonUnknown = all.filter(p => p.status !== 'unknown');
    expect(nonUnknown).toHaveLength(5);
  });

  it('test_givenUnknownPort_whenAutoDiscover_thenStatusBecomesDiscovered', async () => {
    const { autoDiscoverPort, getPortAccessLevel } = await import('../../src/main/db/queries');

    const upgraded = autoDiscoverPort(db, 'carthage', 5);
    expect(upgraded).toBe(true);
    expect(getPortAccessLevel(db, 'carthage')).toBe('discovered');
  });

  it('test_givenDiscoveredPort_whenAutoDiscover_thenNoDowngrade', async () => {
    const { autoDiscoverPort, seedStartingPorts, getPortAccessLevel } = await import('../../src/main/db/queries');
    seedStartingPorts(db);

    // miletos is 'discovered' — auto-discover should not change it
    const upgraded = autoDiscoverPort(db, 'miletos', 10);
    expect(upgraded).toBe(false);
    expect(getPortAccessLevel(db, 'miletos')).toBe('discovered');
  });

  it('test_givenUnknownPort_whenSetUnlocked_thenStatusBecomesUnlocked', async () => {
    const { setPortAccessLevel, getPortAccessLevel } = await import('../../src/main/db/queries');

    setPortAccessLevel(db, 'tyre', 'unlocked', 'quest_reward');
    expect(getPortAccessLevel(db, 'tyre')).toBe('unlocked');
  });

  it('test_givenUnlockedPort_whenSetDiscovered_thenNoDowngrade', async () => {
    const { setPortAccessLevel, getPortAccessLevel, seedStartingPorts } = await import('../../src/main/db/queries');
    seedStartingPorts(db);

    // athens is 'unlocked' — setting to 'discovered' should NOT downgrade
    setPortAccessLevel(db, 'athens', 'discovered', 'should_not_apply');
    expect(getPortAccessLevel(db, 'athens')).toBe('unlocked');
  });

  it('test_givenAutoDiscoveredPort_whenSetUnlocked_thenUpgrades', async () => {
    const { autoDiscoverPort, setPortAccessLevel, getPortAccessLevel } = await import('../../src/main/db/queries');

    autoDiscoverPort(db, 'rhodes', 3);
    expect(getPortAccessLevel(db, 'rhodes')).toBe('discovered');

    setPortAccessLevel(db, 'rhodes', 'unlocked', 'quest_reward');
    expect(getPortAccessLevel(db, 'rhodes')).toBe('unlocked');
  });

  it('test_givenMigrationV9_whenExistingDiscoveredRows_thenBackfilledToUnlocked', async () => {
    // Close the auto-created db and simulate a pre-v9 database
    db.close();

    const DatabaseCtor = (await import('better-sqlite3')).default;
    const legacyDb = new DatabaseCtor(':memory:');
    legacyDb.pragma('journal_mode = WAL');

    // Create minimal schema up to v8
    legacyDb.exec(`
      CREATE TABLE schema_version (version INTEGER NOT NULL DEFAULT 0, migrated_at TEXT);
      INSERT INTO schema_version (version) VALUES (8);
      CREATE TABLE game_state (id INTEGER PRIMARY KEY DEFAULT 1, state_json TEXT NOT NULL, saved_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE saves_history (id INTEGER PRIMARY KEY AUTOINCREMENT, state_json TEXT NOT NULL, saved_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE ports (id TEXT PRIMARY KEY, ancient_name TEXT NOT NULL, modern_name TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL, region TEXT NOT NULL, description TEXT NOT NULL, pleiades_id TEXT, cultural_description TEXT, ambient_description TEXT);
      CREATE TABLE goods (id TEXT PRIMARY KEY, name TEXT NOT NULL, base_price INTEGER NOT NULL, description TEXT NOT NULL);
      CREATE TABLE port_inventory (port_id TEXT NOT NULL, good_id TEXT NOT NULL, supply INTEGER NOT NULL DEFAULT 5, demand INTEGER NOT NULL DEFAULT 5, PRIMARY KEY (port_id, good_id));
      CREATE TABLE player_inventory (id INTEGER PRIMARY KEY DEFAULT 1, gold INTEGER NOT NULL DEFAULT 500, cargo_capacity INTEGER NOT NULL DEFAULT 50, cargo_json TEXT NOT NULL DEFAULT '[]');
      CREATE TABLE transaction_history (id INTEGER PRIMARY KEY AUTOINCREMENT, turn INTEGER NOT NULL, port_id TEXT NOT NULL, good_id TEXT NOT NULL, action TEXT NOT NULL, quantity INTEGER NOT NULL, price_per_unit INTEGER NOT NULL, total_value INTEGER NOT NULL, recorded_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE artifact_cache (id TEXT PRIMARY KEY, good_id TEXT NOT NULL, museum_id TEXT NOT NULL, image_url TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', cache_timestamp TEXT NOT NULL);
      CREATE TABLE curated_images (id TEXT PRIMARY KEY, good_id TEXT, port_id TEXT, file_path TEXT NOT NULL, attribution TEXT NOT NULL, source_url TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE journal_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, turn INTEGER NOT NULL, entry_type TEXT NOT NULL, title TEXT NOT NULL, body_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE quest_progress (quest_id TEXT PRIMARY KEY, status TEXT NOT NULL, current_objective INTEGER NOT NULL DEFAULT 0, started_at TEXT, completed_at TEXT);
      CREATE TABLE npc_dialogue_state (npc_id TEXT PRIMARY KEY, last_node_id TEXT, times_spoken INTEGER NOT NULL DEFAULT 0, last_spoken_turn INTEGER);
      CREATE TABLE reputation (region TEXT PRIMARY KEY, score INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE port_lore (port_id TEXT PRIMARY KEY, history TEXT, culture TEXT, trade_specialization TEXT, notable_facts_json TEXT, historical_period TEXT, primary_sources_json TEXT);
      CREATE TABLE port_access (port_id TEXT PRIMARY KEY, discovered INTEGER NOT NULL DEFAULT 0, discovered_turn INTEGER, unlock_method TEXT);
    `);

    // Insert some pre-v9 port_access rows (discovered=1 should become unlocked)
    legacyDb.exec(`
      INSERT INTO port_access (port_id, discovered, unlock_method) VALUES ('athens', 1, 'starting_port');
      INSERT INTO port_access (port_id, discovered, unlock_method) VALUES ('carthage', 0, NULL);
    `);

    // Run v9 migration
    const { runMigrations } = await import('../../src/main/db/schema');
    runMigrations(legacyDb);

    // Verify backfill
    const athensRow = legacyDb.prepare('SELECT status FROM port_access WHERE port_id = ?').get('athens') as { status: string };
    expect(athensRow.status).toBe('unlocked');

    const carthageRow = legacyDb.prepare('SELECT status FROM port_access WHERE port_id = ?').get('carthage') as { status: string };
    expect(carthageRow.status).toBe('unknown');

    const version = legacyDb.prepare('SELECT version FROM schema_version').get() as { version: number };
    expect(version.version).toBe(10);

    legacyDb.close();
    // Reassign db so afterEach doesn't try to close a closed db
    const { initializeDatabase } = await import('../../src/main/db/schema');
    db = initializeDatabase(':memory:');
  });
});

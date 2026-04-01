/**
 * Database schema initialization with version-tracked migration system.
 *
 * initializeDatabase(dbPath) opens (or creates) a better-sqlite3 database
 * at the given path, enables WAL journal mode for concurrent read performance,
 * and runs all pending migrations.
 *
 * Accepts a path parameter so tests can pass ':memory:' without touching
 * the filesystem.
 */

import Database from 'better-sqlite3';
import { createLogger } from '../lib/logger';

const log = createLogger('Migrations');

type Migration = (db: Database.Database) => void;

/**
 * Ordered array of migrations. Each function receives the db and runs
 * DDL statements. Migrations are applied inside individual transactions.
 */
const MIGRATIONS: Migration[] = [
  // v1 (index 0): Baseline — all 10 original tables + indexes.
  // Uses IF NOT EXISTS for idempotency on v1.3 upgrade path.
  (db) => {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS game_state (
        id          INTEGER PRIMARY KEY DEFAULT 1,
        state_json  TEXT    NOT NULL,
        saved_at    TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS saves_history (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        state_json  TEXT    NOT NULL,
        saved_at    TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS ports (
        id                   TEXT PRIMARY KEY,
        ancient_name         TEXT NOT NULL,
        modern_name          TEXT NOT NULL,
        lat                  REAL NOT NULL,
        lng                  REAL NOT NULL,
        region               TEXT NOT NULL,
        description          TEXT NOT NULL,
        pleiades_id          TEXT,
        cultural_description TEXT
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS goods (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        base_price  INTEGER NOT NULL,
        description TEXT NOT NULL
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS port_inventory (
        port_id     TEXT NOT NULL REFERENCES ports(id),
        good_id     TEXT NOT NULL REFERENCES goods(id),
        supply      INTEGER NOT NULL DEFAULT 5,
        demand      INTEGER NOT NULL DEFAULT 5,
        PRIMARY KEY (port_id, good_id)
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS player_inventory (
        id              INTEGER PRIMARY KEY DEFAULT 1,
        gold            INTEGER NOT NULL DEFAULT 500,
        cargo_capacity  INTEGER NOT NULL DEFAULT 50,
        cargo_json      TEXT NOT NULL DEFAULT '[]'
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS transaction_history (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        turn          INTEGER NOT NULL,
        port_id       TEXT NOT NULL,
        good_id       TEXT NOT NULL,
        action        TEXT NOT NULL CHECK(action IN ('buy','sell')),
        quantity      INTEGER NOT NULL,
        price_per_unit INTEGER NOT NULL,
        total_value   INTEGER NOT NULL,
        recorded_at   TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS artifact_cache (
        id                TEXT PRIMARY KEY,
        good_id           TEXT NOT NULL,
        museum_id         TEXT NOT NULL,
        image_url         TEXT NOT NULL,
        title             TEXT NOT NULL,
        description       TEXT NOT NULL DEFAULT '',
        cache_timestamp   TEXT NOT NULL
      )
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_artifact_cache_good_id ON artifact_cache (good_id)
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS curated_images (
        id          TEXT PRIMARY KEY,
        good_id     TEXT REFERENCES goods(id),
        port_id     TEXT REFERENCES ports(id),
        file_path   TEXT NOT NULL,
        attribution TEXT NOT NULL,
        source_url  TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        CHECK ((good_id IS NOT NULL) OR (port_id IS NOT NULL))
      )
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_curated_images_good_id ON curated_images (good_id)
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_curated_images_port_id ON curated_images (port_id)
    `).run();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        turn        INTEGER NOT NULL,
        entry_type  TEXT NOT NULL CHECK(entry_type IN ('trade','voyage_event','arrival','departure','note')),
        title       TEXT NOT NULL,
        body_json   TEXT NOT NULL DEFAULT '{}',
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_journal_entries_turn ON journal_entries (turn)
    `).run();
  },

  // v2 (index 1): Add cultural_description column to ports.
  // Wrapped in try/catch because v1.3 databases already have this column
  // (it was part of the ports CREATE TABLE). This is the ONE migration
  // where catch-and-ignore is acceptable.
  (db) => {
    try {
      db.prepare('ALTER TABLE ports ADD COLUMN cultural_description TEXT').run();
    } catch {
      // Column already exists — safe to ignore
    }
  },

  // v3 (index 2): Quest progress tracking
  (db) => {
    db.prepare(`
      CREATE TABLE quest_progress (
        quest_id          TEXT PRIMARY KEY,
        status            TEXT NOT NULL,
        current_objective INTEGER NOT NULL DEFAULT 0,
        started_at        TEXT,
        completed_at      TEXT
      )
    `).run();
  },

  // v4 (index 3): NPC dialogue state
  (db) => {
    db.prepare(`
      CREATE TABLE npc_dialogue_state (
        npc_id           TEXT PRIMARY KEY,
        last_node_id     TEXT,
        times_spoken     INTEGER NOT NULL DEFAULT 0,
        last_spoken_turn INTEGER
      )
    `).run();
  },

  // v5 (index 4): Reputation per region
  (db) => {
    db.prepare(`
      CREATE TABLE reputation (
        region TEXT PRIMARY KEY,
        score  INTEGER NOT NULL DEFAULT 0
      )
    `).run();
  },

  // v6 (index 5): Port lore (reference data)
  (db) => {
    db.prepare(`
      CREATE TABLE port_lore (
        port_id              TEXT PRIMARY KEY,
        history              TEXT,
        culture              TEXT,
        trade_specialization TEXT,
        notable_facts_json   TEXT,
        historical_period    TEXT,
        primary_sources_json TEXT
      )
    `).run();
  },

  // v7 (index 6): Port access / discovery tracking
  (db) => {
    db.prepare(`
      CREATE TABLE port_access (
        port_id        TEXT PRIMARY KEY,
        discovered     INTEGER NOT NULL DEFAULT 0,
        discovered_turn INTEGER,
        unlock_method  TEXT
      )
    `).run();
  },

  // v8 (index 7): Ambient descriptions for ports
  (db) => {
    db.prepare(`ALTER TABLE ports ADD COLUMN ambient_description TEXT`).run();
  },

  // v9 (index 8): Add status column to port_access for three-tier access model
  (db) => {
    db.prepare("ALTER TABLE port_access ADD COLUMN status TEXT NOT NULL DEFAULT 'unknown'").run();
    // Backfill: any row with discovered=1 gets status='unlocked' (v1.3 upgrade path — all existing ports are fully unlocked)
    db.prepare("UPDATE port_access SET status = 'unlocked' WHERE discovered = 1").run();
  },
];

/**
 * Player-data tables that should be cleared on "New Game".
 * port_lore is reference data and is NOT included.
 * schema_version is infrastructure and is NOT included.
 */
export const PLAYER_DATA_TABLES = [
  'game_state',
  'saves_history',
  'transaction_history',
  'journal_entries',
  'player_inventory',
  'quest_progress',
  'npc_dialogue_state',
  'reputation',
  'port_access',
] as const;

/**
 * Run all pending migrations from current version to latest.
 *
 * Each migration runs in its own transaction. On failure, the failing
 * transaction auto-rolls back and the error propagates. The database
 * remains at the last successfully-applied version.
 */
export function runMigrations(db: Database.Database): void {
  // Ensure schema_version table exists
  db.prepare(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version     INTEGER NOT NULL DEFAULT 0,
      migrated_at TEXT
    )
  `).run();

  // Read current version
  const row = db.prepare('SELECT version FROM schema_version').get() as
    | { version: number }
    | undefined;

  let currentVersion: number;
  if (row === undefined) {
    db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();
    currentVersion = 0;
  } else {
    currentVersion = row.version;
  }

  // Apply pending migrations
  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    const applyMigration = db.transaction(() => {
      MIGRATIONS[i](db);
      db.prepare(
        "UPDATE schema_version SET version = ?, migrated_at = datetime('now')"
      ).run(i + 1);
    });

    applyMigration();
    log.info('Migration applied', { from: i, to: i + 1 });
  }
}

/**
 * Open (or create) the game database at dbPath, enable WAL mode,
 * and apply all pending migrations.
 */
export function initializeDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance and crash safety.
  db.pragma('journal_mode = WAL');

  runMigrations(db);

  return db;
}

/**
 * Database schema initialization.
 *
 * initializeDatabase(dbPath) opens (or creates) a better-sqlite3 database
 * at the given path, enables WAL journal mode for concurrent read performance,
 * and creates the game tables (idempotent — IF NOT EXISTS).
 *
 * Accepts a path parameter so tests can pass ':memory:' without touching
 * the filesystem.
 */

import Database from 'better-sqlite3';

export function initializeDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance and crash safety.
  // WAL mode persists across connections on the same database file.
  db.pragma('journal_mode = WAL');

  // Create tables in a single transaction for atomicity.
  db.transaction(() => {
    // game_state: always contains exactly one row — the current save.
    // Upsert pattern (id=1) ensures single-row invariant.
    db.prepare(`
      CREATE TABLE IF NOT EXISTS game_state (
        id          INTEGER PRIMARY KEY DEFAULT 1,
        state_json  TEXT    NOT NULL,
        saved_at    TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `).run();

    // saves_history: append-only log of every save for auditing / undo.
    db.prepare(`
      CREATE TABLE IF NOT EXISTS saves_history (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        state_json  TEXT    NOT NULL,
        saved_at    TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `).run();

    // ports: 25 historical Mediterranean ports (seeded via seedPorts in queries.ts)
    db.prepare(`
      CREATE TABLE IF NOT EXISTS ports (
        id          TEXT PRIMARY KEY,
        ancient_name TEXT NOT NULL,
        modern_name TEXT NOT NULL,
        lat         REAL NOT NULL,
        lng         REAL NOT NULL,
        region      TEXT NOT NULL,
        description TEXT NOT NULL,
        pleiades_id TEXT
      )
    `).run();

    // goods: tradeable commodities
    db.prepare(`
      CREATE TABLE IF NOT EXISTS goods (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        base_price  INTEGER NOT NULL,
        description TEXT NOT NULL
      )
    `).run();

    // port_inventory: supply/demand for each good at each port
    db.prepare(`
      CREATE TABLE IF NOT EXISTS port_inventory (
        port_id     TEXT NOT NULL REFERENCES ports(id),
        good_id     TEXT NOT NULL REFERENCES goods(id),
        supply      INTEGER NOT NULL DEFAULT 5,
        demand      INTEGER NOT NULL DEFAULT 5,
        PRIMARY KEY (port_id, good_id)
      )
    `).run();

    // player_inventory: single-row record of player's gold and cargo
    db.prepare(`
      CREATE TABLE IF NOT EXISTS player_inventory (
        id              INTEGER PRIMARY KEY DEFAULT 1,
        gold            INTEGER NOT NULL DEFAULT 500,
        cargo_capacity  INTEGER NOT NULL DEFAULT 50,
        cargo_json      TEXT NOT NULL DEFAULT '[]'
      )
    `).run();

    // transaction_history: audit log of all buy/sell events
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
  })();

  return db;
}

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
  })();

  return db;
}

# Phase 13: Infrastructure & Migration System - Research

**Researched:** 2026-03-31
**Domain:** SQLite schema migration, better-sqlite3, Electron persistence
**Confidence:** HIGH

## Summary

This phase replaces the ad-hoc `CREATE TABLE IF NOT EXISTS` pattern in `schema.ts` with a version-tracked migration system, adds five new tables for v2.0 systems (quests, NPCs, reputation, port access, port lore), and consolidates the new-game reset logic into a single `PLAYER_DATA_TABLES` constant.

The technical domain is well-understood. better-sqlite3's synchronous, transactional API makes versioned migrations straightforward -- no async complexity, no ORM overhead. The existing codebase already uses `db.transaction()` throughout, so the migration runner follows an established pattern. The main risk is not technical but organizational: ensuring the migration ordering is correct, that existing v1.3 databases upgrade cleanly, and that the PLAYER_DATA_TABLES list stays in sync as future phases add tables.

**Primary recommendation:** Implement a simple array-of-functions migration runner in `schema.ts` with a `schema_version` table. Each migration is a function receiving `db` and wrapped in its own transaction. No external migration library needed -- the pattern is ~40 lines of infrastructure code.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Add `schema_version` table with single integer column tracking current DB version
- Migration functions ordered in an array: each runs only once, in sequence
- Each migration wrapped in a transaction -- fails loudly on errors (no silent try/catch)
- `schema_version` is never reset (survives new-game)
- Existing v1.3 schema becomes migration v1 (baseline)
- The existing ALTER TABLE cultural_description becomes migration v2
- New tables via migrations v3-v7: quest_progress, npc_dialogue_state, reputation, port_lore, port_access
- Exact column definitions specified in CONTEXT.md
- PLAYER_DATA_TABLES constant listing all tables that reset on new game
- Current player-data: game_state, saves_history, transaction_history, journal_entries, player_inventory
- New additions: quest_progress, npc_dialogue_state, reputation, port_access
- Reference tables NEVER reset: ports, goods, port_inventory, artifact_cache, curated_images, port_lore, schema_version
- game:newGame handler iterates PLAYER_DATA_TABLES instead of hardcoded DELETE statements
- v1.3 databases: schema_version doesn't exist -> create at version 0 -> run all migrations
- Fresh installs: schema_version starts at 0 -> all migrations run in order

### Claude's Discretion
- Whether to extract migration functions into separate files or keep in schema.ts
- Exact error handling strategy for migration failures (retry vs abort)
- Whether to add a schema_version IPC handler for debugging

### Deferred Ideas (OUT OF SCOPE)
None -- infrastructure phase.
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | ^12.6.2 (latest: 12.8.0) | SQLite database driver | Already in use. Synchronous API makes transactions and migrations trivial. |
| vitest | ^2.1.9 | Test runner | Already configured in vitest.config.ts. |

### Supporting
No new libraries needed. The migration system is pure application code using better-sqlite3's existing API.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled migration runner | knex migrations, drizzle-kit | Overkill for 7 migrations with a synchronous driver. Adds ORM dependency the project doesn't use. |
| Integer version tracking | Timestamp-based migrations | Integer is simpler and matches the sequential nature of these schema changes. |

## Architecture Patterns

### Recommended Project Structure
```
src/main/db/
  schema.ts          # initializeDatabase() + migration runner + migration definitions
  queries.ts         # existing query functions (unchanged)
src/main/ipc/
  save.ts            # game:newGame uses PLAYER_DATA_TABLES
src/shared/
  game-types.ts      # new type interfaces for quest/NPC/reputation/port tables
```

**Recommendation (Claude's discretion):** Keep all migrations in `schema.ts`. With only 7 migrations, extracting to separate files adds directory noise without meaningful benefit. If future milestones add 10+ more migrations, reconsider then.

### Pattern 1: Version-Tracked Migration Runner
**What:** A `schema_version` table holds a single integer. On startup, read the current version. Run each migration function whose index exceeds the current version. Update the version after each successful migration.
**When to use:** Every app startup, before seeding or IPC registration.

```typescript
// Migration runner pattern for better-sqlite3
type Migration = (db: Database.Database) => void;

const MIGRATIONS: Migration[] = [
  // v1: baseline -- existing 10 tables (CREATE TABLE IF NOT EXISTS)
  (db) => { /* all existing CREATE TABLE IF NOT EXISTS statements */ },
  // v2: add cultural_description column to ports
  (db) => {
    try { db.prepare('ALTER TABLE ports ADD COLUMN cultural_description TEXT').run(); }
    catch { /* column already exists */ }
  },
  // v3-v7: new tables for v2.0 systems
  (db) => { db.prepare(`CREATE TABLE quest_progress (...)`).run(); },
  // ... etc
];

function runMigrations(db: Database.Database): void {
  // Ensure schema_version table exists
  db.prepare(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL DEFAULT 0
    )
  `).run();

  // Initialize if empty
  const row = db.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined;
  let currentVersion = row?.version ?? 0;
  if (!row) {
    db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();
  }

  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    const migrate = db.transaction(() => {
      MIGRATIONS[i](db);
      db.prepare('UPDATE schema_version SET version = ?').run(i + 1);
    });
    migrate();
    log.info('Migration applied', { from: i, to: i + 1 });
  }
}
```

### Pattern 2: PLAYER_DATA_TABLES Constant
**What:** A single exported array of table names that get DELETEd on new game. The newGame handler iterates this list instead of hardcoded statements.
**When to use:** In `game:newGame` IPC handler and anywhere else that needs to know which tables are player-scoped.

```typescript
// Exported from schema.ts or a constants file
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

// In save.ts game:newGame handler
const reset = db.transaction(() => {
  for (const table of PLAYER_DATA_TABLES) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
  saveGameStateAtomic(db, INITIAL_STATE);
});
```

### Anti-Patterns to Avoid
- **Silent try/catch around migrations:** If a migration fails, the database is in an unknown state. Let it throw. The transaction will roll back the partial migration, and the app should surface the error.
- **Running CREATE TABLE IF NOT EXISTS after migration system is in place:** All schema changes go through migrations. The only `CREATE TABLE IF NOT EXISTS` that remains is for `schema_version` itself (bootstrapping).
- **Resetting schema_version on new game:** The schema version tracks database structure, not player progress. It must survive resets.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration ordering | Custom dependency graph | Simple integer-indexed array | Migrations are linear and sequential; no branching needed |
| Schema diffing | Automatic schema comparison | Explicit migration functions | 7 migrations don't justify auto-diff tooling |

**Key insight:** The migration system IS the hand-rolled solution here, but it's the right one. At 7 migrations with a synchronous driver, any migration library would be heavier than the problem.

## Common Pitfalls

### Pitfall 1: Baseline Migration Must Be Idempotent
**What goes wrong:** Migration v1 (baseline) runs CREATE TABLE statements on a fresh database AND on an existing v1.3 database being upgraded. If it uses plain CREATE TABLE (no IF NOT EXISTS), it crashes on existing databases.
**Why it happens:** v1.3 databases already have all 10 tables but no schema_version table, so the runner thinks version is 0 and tries to run v1.
**How to avoid:** Migration v1 must use `CREATE TABLE IF NOT EXISTS` for all existing tables. This is the ONE migration where IF NOT EXISTS is correct.
**Warning signs:** App crashes on launch for users who played v1.3.

### Pitfall 2: ALTER TABLE Not Idempotent in SQLite
**What goes wrong:** `ALTER TABLE ports ADD COLUMN cultural_description TEXT` throws if the column already exists (v1.3 databases already have it from the old try/catch pattern).
**Why it happens:** SQLite does not support `ADD COLUMN IF NOT EXISTS`.
**How to avoid:** Migration v2 must wrap the ALTER TABLE in try/catch for the "duplicate column" error specifically. This is the ONE migration where catching is acceptable.
**Warning signs:** Error message containing "duplicate column name".

### Pitfall 3: DELETE FROM vs DROP TABLE for New Game Reset
**What goes wrong:** Using DROP TABLE instead of DELETE FROM would require re-running migrations.
**Why it happens:** Confusing "reset player data" with "reset schema".
**How to avoid:** PLAYER_DATA_TABLES reset uses DELETE FROM (clears rows, preserves schema). Never DROP.
**Warning signs:** Foreign key errors or "no such table" after new game.

### Pitfall 4: Missing saves_history in Current Reset
**What goes wrong:** The current `game:newGame` handler does NOT delete `saves_history`. The CONTEXT.md lists it as player data. This is a bug fix opportunity.
**Why it happens:** saves_history was originally append-only audit log. With new-game functionality, old saves from a previous playthrough should be cleared.
**How to avoid:** Include saves_history in PLAYER_DATA_TABLES as specified in CONTEXT.md.
**Warning signs:** saves_history growing across multiple playthroughs.

### Pitfall 5: Transaction Wrapping per Migration
**What goes wrong:** Wrapping ALL migrations in one transaction means a failure in migration v5 rolls back v3 and v4 too, even though they succeeded.
**Why it happens:** Trying to be "safer" with one big transaction.
**How to avoid:** Each migration gets its own transaction. Update schema_version inside that transaction. If v5 fails, v3-v4 are committed and the runner will retry from v5 next launch.
**Warning signs:** Repeated migration failures that should have been partially applied.

### Pitfall 6: Foreign Key on port_lore and port_access
**What goes wrong:** Creating port_lore and port_access with FK references to ports before ports table has data causes no immediate error (SQLite doesn't enforce FKs by default). But if PRAGMA foreign_keys is later enabled, inserts could fail.
**Why it happens:** SQLite FK enforcement is opt-in.
**How to avoid:** The codebase does not currently enable `PRAGMA foreign_keys`. The FK declarations are documentation-only. Keep this consistent -- do not enable FK pragma without auditing all insert orders.
**Warning signs:** "FOREIGN KEY constraint failed" errors after enabling FK pragma.

## Code Examples

### Migration v1: Baseline (existing schema)
```typescript
// All existing CREATE TABLE IF NOT EXISTS statements from current schema.ts
// Moved verbatim into migrations[0]. IF NOT EXISTS is correct here because
// v1.3 databases already have these tables.
(db) => {
  db.prepare(`CREATE TABLE IF NOT EXISTS game_state (...)`).run();
  db.prepare(`CREATE TABLE IF NOT EXISTS saves_history (...)`).run();
  // ... all 10 existing tables
}
```

### Migration v2: Add cultural_description
```typescript
(db) => {
  try {
    db.prepare('ALTER TABLE ports ADD COLUMN cultural_description TEXT').run();
  } catch {
    // Column already exists on v1.3 databases -- safe to ignore
  }
}
```

### Migration v3: quest_progress table
```typescript
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
}
```

### New Game Reset Pattern
```typescript
const reset = db.transaction(() => {
  for (const table of PLAYER_DATA_TABLES) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
  saveGameStateAtomic(db, INITIAL_STATE);
});
reset();
```

### Schema Version IPC (optional debugging aid)
```typescript
wrapHandler<{ version: number }>(
  'db:schemaVersion',
  async () => {
    const row = db.prepare('SELECT version FROM schema_version').get() as { version: number };
    return row;
  },
);
```

## New Type Definitions Needed

Types to add to `game-types.ts` for the five new tables:

```typescript
// Quest system
export type QuestStatus = 'available' | 'active' | 'completed' | 'failed';

export interface QuestProgress {
  questId: string;
  status: QuestStatus;
  currentObjective: number;
  startedAt?: string;
  completedAt?: string;
}

// NPC dialogue
export interface NpcDialogueState {
  npcId: string;
  lastNodeId?: string;
  timesSpoken: number;
  lastSpokenTurn?: number;
}

// Reputation
export interface Reputation {
  region: string;
  score: number;
}

// Port lore (reference data -- not player data)
export interface PortLore {
  portId: string;
  history: string;
  culture: string;
  tradeSpecialization: string;
  notableFacts: string[];   // stored as JSON
  historicalPeriod: string;
  primarySources: string[]; // stored as JSON
}

// Port access (player data)
export interface PortAccess {
  portId: string;
  discovered: boolean;
  discoveredTurn?: number;
  unlockMethod?: string;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CREATE TABLE IF NOT EXISTS on every launch | Version-tracked migrations (this phase) | Phase 13 | Enables safe schema evolution for v2.0+ |
| Hardcoded DELETE list in newGame | PLAYER_DATA_TABLES constant | Phase 13 | Prevents missed tables as new ones are added |
| ALTER TABLE in try/catch | Migration v2 (one-time, tracked) | Phase 13 | Column addition runs once, not on every launch |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 2.1.9 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map

This phase has no formal requirement IDs but supports all v2.0 requirements. Key behaviors to validate:

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| Fresh DB gets all migrations applied | unit | `npx vitest run tests/migrations.test.ts -t "fresh"` | No -- Wave 0 |
| v1.3 DB upgrades without errors | unit | `npx vitest run tests/migrations.test.ts -t "upgrade"` | No -- Wave 0 |
| schema_version tracks correctly | unit | `npx vitest run tests/migrations.test.ts -t "version"` | No -- Wave 0 |
| Failed migration rolls back cleanly | unit | `npx vitest run tests/migrations.test.ts -t "rollback"` | No -- Wave 0 |
| PLAYER_DATA_TABLES covers all player tables | unit | `npx vitest run tests/migrations.test.ts -t "player-data"` | No -- Wave 0 |
| New game reset clears all player-data tables | unit | `npx vitest run tests/migrations.test.ts -t "new-game"` | No -- Wave 0 |
| New tables have correct columns | unit | `npx vitest run tests/migrations.test.ts -t "columns"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/migrations.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps
- [ ] `tests/migrations.test.ts` -- all migration and reset tests (uses `:memory:` databases)
- [ ] Vitest config already includes `tests/**/*.test.ts` pattern -- no config change needed

## Open Questions

1. **Should saves_history really be cleared on new game?**
   - What we know: CONTEXT.md explicitly lists it as player-data. Current code does NOT delete it.
   - What's unclear: This is a product decision already made in CONTEXT.md, but worth flagging that it changes behavior.
   - Recommendation: Follow CONTEXT.md -- include in PLAYER_DATA_TABLES.

2. **Error handling on migration failure: retry vs abort?**
   - What we know: Claude's discretion per CONTEXT.md. better-sqlite3 transactions auto-rollback on throw.
   - Recommendation: Abort (let the error propagate). The app should show an error dialog rather than silently retrying. A failed migration likely means a code bug, not a transient issue. The transaction rollback preserves the pre-migration state, so the DB is not corrupted. On next launch, the same migration will be attempted again.

3. **Schema version IPC handler for debugging?**
   - What we know: Claude's discretion per CONTEXT.md.
   - Recommendation: Add it. It's ~5 lines and useful for debugging save-upgrade issues. Wire it as `db:schemaVersion`.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies -- this phase is purely code/config changes using existing better-sqlite3).

## Sources

### Primary (HIGH confidence)
- Project source code: `src/main/db/schema.ts`, `src/main/ipc/save.ts`, `src/main/index.ts`, `src/shared/game-types.ts` -- direct inspection of current patterns
- CONTEXT.md -- locked decisions for table schemas and migration design
- npm registry: better-sqlite3 latest is 12.8.0 (project uses ^12.6.2, compatible)

### Secondary (MEDIUM confidence)
- better-sqlite3 transaction API -- verified from project usage patterns (db.transaction() used extensively in queries.ts and save.ts)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, using existing better-sqlite3
- Architecture: HIGH -- migration runner is a well-understood pattern, all decisions locked in CONTEXT.md
- Pitfalls: HIGH -- identified from direct code inspection (saves_history gap, ALTER TABLE idempotency, per-migration transactions)

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable infrastructure pattern, no fast-moving dependencies)

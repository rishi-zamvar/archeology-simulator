# Phase 13: Infrastructure & Migration System - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the ad-hoc CREATE TABLE IF NOT EXISTS pattern with a proper version-tracked migration system. Create new SQLite tables for v2.0 systems (quests, NPCs, reputation, port access, port lore). Ensure v1.3 saves upgrade cleanly and new-game reset covers all player-data tables.

</domain>

<decisions>
## Implementation Decisions

### Migration System Design
- Add `schema_version` table with single integer column tracking current DB version
- Migration functions ordered in an array: each runs only once, in sequence
- Each migration wrapped in a transaction — fails loudly on errors (no silent try/catch)
- `schema_version` is never reset (survives new-game)
- Existing v1.3 schema becomes migration v1 (baseline)
- The existing ALTER TABLE cultural_description becomes migration v2

### New Tables (via migrations v3-v7)
- `quest_progress` — quest_id TEXT PK, status TEXT, current_objective INTEGER, started_at TEXT, completed_at TEXT
- `npc_dialogue_state` — npc_id TEXT PK, last_node_id TEXT, times_spoken INTEGER, last_spoken_turn INTEGER
- `reputation` — region TEXT PK, score INTEGER DEFAULT 0
- `port_lore` — port_id TEXT PK FK→ports, history TEXT, culture TEXT, trade_specialization TEXT, notable_facts_json TEXT, historical_period TEXT, primary_sources_json TEXT
- `port_access` — port_id TEXT PK FK→ports, discovered INTEGER DEFAULT 0, discovered_turn INTEGER, unlock_method TEXT

### Player-Data Reset
- Create PLAYER_DATA_TABLES constant array listing all tables that reset on new game
- Current: game_state, saves_history, transaction_history, journal_entries, player_inventory
- New additions: quest_progress, npc_dialogue_state, reputation, port_access
- Reference tables NEVER reset: ports, goods, port_inventory, artifact_cache, curated_images, port_lore, schema_version
- game:newGame handler iterates PLAYER_DATA_TABLES instead of hardcoded DELETE statements

### Upgrade Path
- v1.3 databases: schema_version table doesn't exist → create it at version 0 → run all migrations
- Fresh installs: schema_version starts at 0 → all migrations run in order
- v2.0+ databases: only run migrations after current version

### Claude's Discretion
- Whether to extract migration functions into separate files or keep in schema.ts
- Exact error handling strategy for migration failures (retry vs abort)
- Whether to add a schema_version IPC handler for debugging

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- schema.ts: initializeDatabase() with 10 CREATE TABLE IF NOT EXISTS statements
- queries.ts: seedPorts(), seedGoods(), seedPortInventory(), seedCuratedImages() — all INSERT OR IGNORE
- save.ts: game:newGame handler with hardcoded 4-table DELETE

### Established Patterns
- db.transaction() for atomic operations
- INSERT OR IGNORE for idempotent seeding
- Single-row upsert for game_state (id=1)
- better-sqlite3 synchronous API throughout

### Integration Points
- src/main/db/schema.ts — refactor initializeDatabase() to use migration runner
- src/main/ipc/save.ts — replace hardcoded DELETE list with PLAYER_DATA_TABLES
- src/main/index.ts — startup sequence calls initializeDatabase() then seeds
- src/shared/game-types.ts — add types for new table records

### Current Tables (10)
Reference: ports, goods, port_inventory, artifact_cache, curated_images
Player-data: game_state, saves_history, player_inventory, transaction_history, journal_entries

</code_context>

<specifics>
## Specific Ideas

- The migration runner should log which migrations run (using existing structured logging)
- Consider adding a `migrated_at` timestamp column to schema_version for debugging
- PLAYER_DATA_TABLES should be exported so other modules can reference it

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>

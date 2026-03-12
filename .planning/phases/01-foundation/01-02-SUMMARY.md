---
phase: 01-foundation
plan: 02
subsystem: database
tags: [better-sqlite3, sqlite, wal, fsm, ipc, typescript, discriminated-union, vitest, tdd]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: Electron scaffold with preload contextBridge, shared IPC type stubs, Vitest config
provides:
  - ACID-safe SQLite save/load via better-sqlite3 WAL transactions
  - Discriminated union GameState FSM with exhaustive switch and never assertion
  - registerSaveIPCHandlers() wiring game:load and game:save
  - registerGameIPCHandlers() wiring game:action with auto-save and broadcast
  - Stub static JSON data files (ports, goods, events) at resources/data/
affects:
  - 01-foundation/01-03
  - 02-map-and-ports
  - 03-trade-and-events

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Discriminated union GameState with never-assertion exhaustive switch
    - Single-row upsert pattern for game_state table (id=1 sentinel)
    - better-sqlite3 .transaction() wrapper for ACID atomic writes
    - Path-parameterized initializeDatabase() enabling :memory: in tests
    - IPC handlers wired via registerXxxHandlers(db) — dependency injection pattern

key-files:
  created:
    - src/game/types.ts
    - src/game/state.ts
    - src/game/engine.ts
    - src/main/db/schema.ts
    - src/main/db/queries.ts
    - src/main/ipc/save.ts
    - src/main/ipc/game.ts
    - resources/data/ports.json
    - resources/data/goods.json
    - resources/data/events.json
    - tests/db/schema.test.ts
    - tests/db/save.test.ts
    - tests/game/state.test.ts
  modified:
    - src/main/index.ts
    - src/shared/ipc-types.ts

key-decisions:
  - "GameState is a discriminated union (not a generic object with [key: string]: unknown) — enables exhaustive FSM switch and type-safe IPC contracts"
  - "initializeDatabase() accepts a path string — allows :memory: in tests without filesystem or Electron dependency"
  - "Single-row upsert (id=1) in game_state + append-only saves_history — single source of truth + full audit log"
  - "WAL mode silently ignored for :memory: databases — test asserts ['wal','memory'] to remain portable"
  - "ipc-types.ts re-exports from game/types — single source of truth, renderer imports from boundary file"

patterns-established:
  - "FSM pattern: exhaustive switch on current.type with inner switch on action.type; never assertion at outer default"
  - "Database injection: registerXxxHandlers(db) takes db instance — testable without Electron"
  - "IPC validation: isValidGameState() type guard validates before any DB write"

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 1 Plan 02: SQLite Persistence + FSM Game State Summary

**ACID-safe SQLite save/load via better-sqlite3 WAL transactions and a discriminated-union FSM with exhaustive TypeScript switch**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T12:00:13Z
- **Completed:** 2026-03-12T12:03:45Z
- **Tasks:** TDD (RED + GREEN + REFACTOR)
- **Files modified:** 15 (13 created, 2 modified)

## Accomplishments

- 28 Vitest tests cover FSM transitions (valid + invalid), DB schema creation, and atomic save/load round-trips — all pass
- FSM `handleAction()` uses exhaustive `never` assertion: adding a new `GameState` type without a handler causes a compile error
- `saveGameStateAtomic()` wraps upsert + history append in a single `better-sqlite3` transaction — either both commit or both roll back
- IPC handlers replaced stubs in `main/index.ts` with live SQLite-backed `registerSaveIPCHandlers` and `registerGameIPCHandlers`
- 5 Mediterranean ports, 3 trade goods, 2 encounter events added as stub JSON data for downstream phases

## Task Commits

TDD execution produced two atomic commits:

1. **RED phase: failing tests** - `5edc723` (test)
2. **GREEN phase: full implementation** - `4d9ab67` (feat)

No REFACTOR commit needed — implementation was already clean.

## Files Created/Modified

- `src/game/types.ts` - Discriminated union GameState (idle/trading/sailing/encountered), typed GameAction union, GameResult
- `src/game/state.ts` - handleAction FSM with exhaustive switch + never assertion on outer default
- `src/game/engine.ts` - performAction wrapper returning GameResult (handles errors from FSM)
- `src/main/db/schema.ts` - initializeDatabase(path) with WAL pragma and idempotent table creation
- `src/main/db/queries.ts` - saveGameStateAtomic (upsert + history in transaction), loadGameState
- `src/main/ipc/save.ts` - registerSaveIPCHandlers with isValidGameState type guard
- `src/main/ipc/game.ts` - registerGameIPCHandlers with auto-save and webContents broadcast
- `src/main/index.ts` - Replaced stub IPC handlers; wires initializeDatabase + register handlers
- `src/shared/ipc-types.ts` - Re-exports GameState/GameAction/GameResult from game/types
- `resources/data/ports.json` - 5 stub Mediterranean ports (Alexandria, Carthage, Rome, Athens, Antioch)
- `resources/data/goods.json` - 3 stub trade goods (grain, olive oil, wine)
- `resources/data/events.json` - 2 stub encounter events (pirates, storm) with multi-choice outcomes
- `tests/db/schema.test.ts` - WAL mode, table creation, column validation, idempotency
- `tests/db/save.test.ts` - Round-trip fidelity, single-row invariant, history growth, concurrent saves
- `tests/game/state.test.ts` - All 6 valid FSM transitions, 6 invalid transitions (error message exact match), immutability

## Decisions Made

- **Discriminated union over generic object**: GameState changed from `{ type: string; [key: string]: unknown }` to a proper discriminated union. This enables exhaustive switch statements and type-safe IPC contracts.
- **Path-parameterized initializeDatabase()**: Accepts a path string so tests can pass `:memory:` without touching Electron APIs or the filesystem.
- **WAL test relaxed to `['wal', 'memory']`**: SQLite in-memory databases silently ignore WAL pragma — the test was updated to accept both values to remain portable. Real-file databases (production) use WAL.
- **ipc-types.ts re-exports from game/types**: Renderer imports from the boundary file; game logic owns the canonical type definitions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] WAL assertion fails for :memory: databases**

- **Found during:** GREEN phase (schema tests)
- **Issue:** `PRAGMA journal_mode` returns `'memory'` for `:memory:` databases regardless of WAL setting; test asserted `'wal'` causing false failure
- **Fix:** Updated assertion to `expect(['wal', 'memory']).toContain(row.journal_mode)` with comment explaining the SQLite behavior
- **Files modified:** `tests/db/schema.test.ts`
- **Verification:** Test passes; real-file DB will return `'wal'`
- **Committed in:** 4d9ab67 (GREEN phase commit)

**2. [Rule 1 - Bug] `require()` in idempotency test fails in Vitest ESM environment**

- **Found during:** GREEN phase (schema tests)
- **Issue:** Test used `require('../../src/main/db/schema')` which fails in Vitest's ESM module system
- **Fix:** Changed to `await import(...)` consistent with all other tests in the suite
- **Files modified:** `tests/db/schema.test.ts`
- **Verification:** Test passes cleanly
- **Committed in:** 4d9ab67 (GREEN phase commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug in test code)
**Impact on plan:** Both fixes were in test assertions, not implementation. No scope creep.

## Issues Encountered

None — SQLite WAL behavior with `:memory:` is a known SQLite constraint, handled cleanly.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Save/load IPC is live and tested; renderer can immediately use `window.api.game.load()` and `window.api.game.save()`
- FSM is fully typed — 01-03 and later phases can import `handleAction` / `GameState` / `GameAction` from `src/game/state`
- Stub JSON data files ready at `resources/data/` for map and trade phases to consume
- No blockers for 01-03

---
*Phase: 01-foundation*
*Completed: 2026-03-12*

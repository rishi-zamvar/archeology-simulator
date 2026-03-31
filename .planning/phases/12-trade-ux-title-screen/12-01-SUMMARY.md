---
phase: 12-trade-ux-title-screen
plan: 01
subsystem: ui
tags: [react, trade, profit-loss, ux]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: CargoItem type, buyGood query, TradePanel component
provides:
  - "CargoItem.boughtAtTurn field for purchase turn tracking"
  - "P&L indicators (green/red) per cargo row in TradePanel"
  - "Purchase provenance display per batch in TradePanel"
  - "Dynamic total P&L preview tied to quantity stepper"
affects: [trade, cargo-hold, journal]

# Tech tracking
tech-stack:
  added: []
  patterns: [weighted-average-cost P&L calculation, IIFE for inline computed JSX blocks]

key-files:
  created: []
  modified:
    - src/shared/game-types.ts
    - src/main/db/queries.ts
    - src/main/ipc/game.ts
    - src/renderer/components/TradePanel.tsx

key-decisions:
  - "boughtAtTurn is optional (undefined for old saves) -- UI handles gracefully with null check"
  - "P&L uses weighted average cost across all batches of same good, not per-batch comparison"
  - "Salvaged event cargo also gets boughtAtTurn populated from game state currentTurn"

patterns-established:
  - "IIFE pattern in JSX for complex computed rendering blocks with multiple derived values"

requirements-completed: [TRD-01, TRD-02, TRD-03]

# Metrics
duration: 2min
completed: 2026-03-31
---

# Phase 12 Plan 01: Trade P&L Indicators Summary

**Green/red profit-loss indicators per cargo row with weighted-average cost, dynamic total preview, and purchase provenance in TradePanel**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-31T22:38:33Z
- **Completed:** 2026-03-31T22:40:54Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Per-unit P&L indicator (green for profit, red for loss, neutral for break-even) on each carried good row
- Total P&L preview that updates reactively as quantity stepper changes
- Purchase provenance per batch showing port name, purchase price, and turn number
- boughtAtTurn field added to CargoItem and populated in both buyGood and event cargo creation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add boughtAtTurn to CargoItem and populate in buyGood** - `da9d1be` (feat)
2. **Task 2: Add P&L indicators and purchase provenance to TradePanel** - `fe105f5` (feat)

## Files Created/Modified
- `src/shared/game-types.ts` - Added boughtAtTurn?: number to CargoItem interface
- `src/main/db/queries.ts` - Populate boughtAtTurn in buyGood cargo push
- `src/main/ipc/game.ts` - Populate boughtAtTurn in salvaged event cargo creation
- `src/renderer/components/TradePanel.tsx` - P&L indicators, total preview, and provenance display

## Decisions Made
- boughtAtTurn is optional (not required) to maintain backward compatibility with old saves
- Used weighted average cost across all batches of the same good for P&L calculation
- Loaded game state inside resolveEvent transaction to get turn number for salvaged cargo

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added boughtAtTurn to salvaged event cargo in game.ts**
- **Found during:** Task 1
- **Issue:** Plan mentioned event cargo at "line 448" in queries.ts but it was actually in src/main/ipc/game.ts resolveEvent handler
- **Fix:** Added boughtAtTurn to the salvaged cargo push in game.ts, loading currentTurn from game state within the transaction scope
- **Files modified:** src/main/ipc/game.ts
- **Verification:** npx tsc --noEmit passes with zero errors
- **Committed in:** da9d1be (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for completeness -- event-gained cargo now also tracks purchase turn. No scope creep.

## Issues Encountered
- 15 pre-existing test failures from better-sqlite3 native module loading (ERR_DLOPEN_FAILED) -- not caused by this plan's changes, unrelated to the code modified

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Trade P&L indicators complete, ready for Plan 02 (title screen)
- CargoHold.tsx could optionally display boughtAtTurn in future but not required for this plan

---
*Phase: 12-trade-ux-title-screen*
*Completed: 2026-03-31*

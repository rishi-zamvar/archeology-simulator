---
phase: 18-reputation-trade-integration
plan: 01
subsystem: game-logic
tags: [reputation, trade, pricing, pure-functions, vitest]

requires:
  - phase: 13-infrastructure-migration
    provides: reputation table (region TEXT PK, score INTEGER)
provides:
  - Pure reputation module with tier calculation, price modifiers, trade gain
  - Reputation-aware pricing in buyGood, sellGood, getMarketPrices
  - getPortReputation query for UI use
affects: [18-02-PLAN, 19-progressive-port-unlocking, 20-journal-integration]

tech-stack:
  added: []
  patterns: [pure-module-with-db-integration, reputation-modifier-pattern]

key-files:
  created:
    - src/game/reputation.ts
    - src/game/reputation.test.ts
  modified:
    - src/main/db/queries.ts

key-decisions:
  - "Reputation module is pure (no DB) -- importable from both main and renderer"
  - "Trade gain formula: min(3, max(1, floor(totalValue/250))) ensures every trade awards 1-3 rep"
  - "getMarketPrices shows buy-discounted prices so TradePanel reflects reputation savings"

patterns-established:
  - "Reputation never gates actions -- only modifies prices (REP-03 compliance)"
  - "Price floor at 1g prevents free goods at high reputation"

requirements-completed: [REP-01, REP-02, REP-03]

duration: 5min
completed: 2026-04-01
---

# Phase 18 Plan 01: Reputation Logic & Trade Integration Summary

**Pure reputation module with 4-tier system (Stranger to Proxenos) and reputation-aware pricing integrated into all trade functions**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-01T18:37:31Z
- **Completed:** 2026-04-01T18:42:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Pure reputation module with tier calculation, price modifiers (0-20%), and trade gain formula
- All trade functions (buy/sell/market prices) apply reputation-based pricing
- Every trade awards 1-3 reputation points, ensuring recovery from any state (REP-03)
- 21 unit tests covering all tier boundaries, modifiers, and edge cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Create reputation logic module with tests (TDD)**
   - `d4c76ea` (test) - Failing tests for reputation logic
   - `c1c18b3` (feat) - Implement pure reputation module, all 21 tests pass
2. **Task 2: Integrate reputation into queries.ts trade functions** - `74dedce` (feat)

## Files Created/Modified
- `src/game/reputation.ts` - Pure reputation logic: tiers, price modifiers, trade gain, price application
- `src/game/reputation.test.ts` - 21 unit tests for all reputation functions
- `src/main/db/queries.ts` - Added getPortReputation, reputation-aware calcCurrentPrice/buyGood/sellGood/getMarketPrices

## Decisions Made
- Reputation module kept pure (no DB imports) for portability between main/renderer processes
- getMarketPrices applies buy-side discount so TradePanel shows accurate reputation prices
- Trade gain formula uses floor(totalValue/250) capped at 3, minimum 1 -- balances progression speed

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None -- no external service configuration required.

## Next Phase Readiness
- Reputation logic and query integration complete
- Plan 18-02 can wire IPC handlers, preload bridge, and UI display (PortInfoPanel, TradePanel)
- getPortReputation exported and ready for IPC handler consumption

---
*Phase: 18-reputation-trade-integration*
*Completed: 2026-04-01*

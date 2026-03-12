---
phase: 02-core-loop
plan: 01
subsystem: database
tags: [better-sqlite3, haversine, supply-demand, ipc, electron, contextBridge]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: initializeDatabase, saveGameStateAtomic, loadGameState, IPCBridge interface, game FSM types

provides:
  - 25 historical Mediterranean ports seeded in SQLite with Pleiades coordinates and descriptions
  - 8 tradeable goods seeded with base prices
  - Port inventory with region-based supply/demand patterns
  - voyage.ts: haversineDistanceKm, calculateVoyageDuration, getReachablePorts
  - economy.ts: calculateMarketPrice (supply/demand ±50% cap), advancePortEconomy
  - 5 new IPC channels: getPorts, getPortDetails, getMarketPrices, getReachablePorts, getPlayerInventory
  - IPCBridge extended with typed signatures for all new channels
  - DB schema: ports, goods, port_inventory, player_inventory, transaction_history tables

affects:
  - 02-02-map (needs getAllPorts IPC, Port type with lat/lng for Leaflet markers)
  - 02-03-trade (needs getMarketPrices, getPlayerInventory, updatePlayerInventory IPC)
  - 02-04-events (needs VoyageEvent type from game-types.ts)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - INSERT OR IGNORE seed pattern — idempotent on every app launch, safe for dev hot-reloads
    - Haversine great-circle distance for Mediterranean geography (4 knots avg speed, 1 turn = 1 day)
    - Supply/demand price elasticity formula — basePrice × (1 + delta × 0.02), ±50% cap
    - Region-based port inventory defaults encoding historical trade specialization

key-files:
  created:
    - src/game/voyage.ts
    - src/game/economy.ts
  modified:
    - src/shared/game-types.ts
    - src/game/types.ts
    - src/game/engine.ts
    - src/main/db/schema.ts
    - src/main/db/queries.ts
    - src/main/ipc/game.ts
    - src/main/preload.ts
    - src/shared/ipc-types.ts
    - src/main/index.ts

key-decisions:
  - "Port region typed as union ('greece' | 'levant' | 'egypt' | 'italy' | 'iberia' | 'north_africa') for type-safe region filtering in map/trade UI"
  - "departurePortId and route on SailingState are optional — preserves backward compat with existing FSM tests"
  - "getMarketPrices calculates currentPrice inline in SQL query layer (not via economy.ts) to avoid N+1 on initial load; economy.ts advancePortEconomy is for turn-advance loop"
  - "seedPorts/seedGoods/seedPortInventory called in index.ts on every launch — INSERT OR IGNORE means zero cost after first run"
  - "massalia region set to 'italy' not 'iberia' — Massalia is in modern France (Marseille), closer to Italy trade sphere than Iberian"

patterns-established:
  - "Seed functions: INSERT OR IGNORE with a transaction wrapper for batch performance"
  - "Query functions return camelCase Port/MarketGood objects (mapping from snake_case DB columns)"
  - "IPC handler files: import query functions at top, one ipcMain.handle block per channel"

# Metrics
duration: 5min
completed: 2026-03-12
---

# Phase 2 Plan 01: Port Data, Voyage, and Economy Foundation Summary

**25-port Mediterranean DB seed with haversine voyage calculations, supply/demand economy module, and 5 new IPC channels typed end-to-end via contextBridge**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-12T12:28:38Z
- **Completed:** 2026-03-12T12:33:26Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Seeded 25 historically accurate Mediterranean ports (Athens to Cadiz) with Pleiades coordinates and student-readable descriptions
- Built voyage engine using haversine great-circle distance at 4-knot ancient merchant speed (1 turn = 1 day)
- Economy module: supply/demand price elasticity formula (±50% cap), region-based inventory defaults encode historical trade patterns
- 5 new IPC channels fully wired from main process to renderer via typed IPCBridge — Plans 02-02 and 02-03 can build against these immediately
- All 36 Phase 1 tests still pass, zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Port/goods types, DB schema, and 25-port seed data** - `0c92711` (feat)
2. **Task 2: Voyage engine, economy module, IPC expansion, IPCBridge update** - `039b46c` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/shared/game-types.ts` - Expanded with Port, Good, MarketGood, CargoItem, PlayerInventory, TransactionRecord, VoyageRoute, VoyageEvent, VoyageEventType, VoyageEventChoice
- `src/game/types.ts` - SailingState gets optional departurePortId/route; EncounteredState gets optional event
- `src/game/voyage.ts` - haversineDistanceKm, calculateVoyageDuration, getReachablePorts (new file)
- `src/game/economy.ts` - calculateMarketPrice, advancePortEconomy (new file)
- `src/game/engine.ts` - Re-exports voyage and economy utilities
- `src/main/db/schema.ts` - 5 new tables: ports, goods, port_inventory, player_inventory, transaction_history
- `src/main/db/queries.ts` - seedPorts, seedGoods, seedPortInventory, getAllPorts, getPortById, getMarketPrices, getPlayerInventory, updatePlayerInventory
- `src/main/ipc/game.ts` - 5 new IPC channels added alongside existing game:action
- `src/main/preload.ts` - contextBridge entries for all 5 new channels
- `src/shared/ipc-types.ts` - IPCBridge extended with getPorts, getPortDetails, getMarketPrices, getReachablePorts, getPlayerInventory
- `src/main/index.ts` - Calls seedPorts, seedGoods, seedPortInventory after initializeDatabase

## Decisions Made

- **Port region as union type** — typed as `'greece' | 'levant' | 'egypt' | 'italy' | 'iberia' | 'north_africa'` for type-safe region filtering in map/trade UI
- **Optional fields on SailingState** — `departurePortId` and `route` are optional, preserving backward compat with the existing 36 tests and serialized game states
- **Price calculation inline in queries layer** — `getMarketPrices` calculates `currentPrice` in the query function (not via `advancePortEconomy`) to avoid per-row overhead on bulk loads; `economy.ts` is the turn-advance loop
- **INSERT OR IGNORE seed pattern** — all seed functions use INSERT OR IGNORE wrapped in a transaction; called on every app launch with negligible cost after the first run
- **massalia region = 'italy'** — Marseille (ancient Massalia) was a Greek colony in what is now France; its trade sphere was closer to Italian/Tyrrhenian than Iberian

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **02-02 (Map):** `window.api.game.getPorts()` returns Port[] with lat/lng for Leaflet markers. `window.api.game.getReachablePorts(portId)` returns routes for trade-range circles.
- **02-03 (Trade):** `window.api.game.getMarketPrices(portId)` returns MarketGood[] with currentPrice. `window.api.game.getPlayerInventory()` returns gold/cargo state.
- **Concern:** Leaflet performance at 25+ port markers + animated ship icon should be profiled early in 02-02 (noted in STATE.md).

---
*Phase: 02-core-loop*
*Completed: 2026-03-12*

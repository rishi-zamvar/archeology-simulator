---
phase: 02-core-loop
plan: "03"
subsystem: trade
tags: [better-sqlite3, react, zustand, electron-ipc, acid-transactions, trade-system]

# Dependency graph
requires:
  - phase: 02-01
    provides: player_inventory table, transaction_history table, getMarketPrices/getPlayerInventory queries, IPC channel pattern
provides:
  - ACID buyGood/sellGood DB transactions with validation and price formula
  - game:buyGood, game:sellGood, game:getTransactionHistory IPC channels
  - TradePanel: goods list with buy/sell buttons, quantity stepper, inline feedback
  - CargoHold: capacity bar, per-item stack with provenance
  - ProfitDisplay: running P&L vs 500 starting gold, last 10 transaction log
  - useTradeState hook: unified data fetch + game:updated subscription
affects: [02-04, phase-3-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ACID trade transactions using better-sqlite3 .transaction() wrapper
    - FIFO cargo stack removal across heterogeneous price stacks
    - Supply/demand price mutation on trade (buy decrements supply, sell decrements demand)
    - Inline feedback with 3s auto-dismiss via setTimeout
    - useTradeState game:updated subscription for live UI refresh after trades

key-files:
  created:
    - src/renderer/components/TradePanel.tsx
    - src/renderer/components/CargoHold.tsx
    - src/renderer/components/ProfitDisplay.tsx
    - src/renderer/hooks/useTradeState.ts
  modified:
    - src/main/db/queries.ts
    - src/main/ipc/game.ts
    - src/main/preload.ts
    - src/shared/ipc-types.ts
    - src/renderer/components/Shell.tsx

key-decisions:
  - "Buy stacks by port+price — buying the same good at the same port and price merges into one CargoItem stack"
  - "FIFO sell across stacks — oldest stacks drained first when selling"
  - "Buy decrements port supply by 1 (MIN 1); sell decrements demand by 1 (MIN 1) — keeps prices dynamic without hitting zero"
  - "broadcastGameUpdated helper in game.ts — calls loadGameState and fans out to all BrowserWindows after each trade"
  - "TransactionRecord exported from ipc-types boundary — renderer imports from single boundary file"
  - "portDisplayName derived from portId string in Shell — avoids extra IPC call just for display name"
  - "CargoHold and ProfitDisplay always rendered in left panel regardless of port selection — player inventory is always relevant"

patterns-established:
  - "Trade validation pattern: validate qty > 0, port has good, player has gold/space, then atomic update"
  - "IPC handler pattern: call db function, broadcast game:updated, return result to renderer"

# Metrics
duration: 4min
completed: 2026-03-12
---

# Phase 2 Plan 3: Trade System Summary

**ACID buy/sell transactions with supply/demand price dynamics, TradePanel/CargoHold/ProfitDisplay UI, and live IPC refresh via game:updated subscription**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-12T12:36:50Z
- **Completed:** 2026-03-12T12:40:57Z
- **Tasks:** 2
- **Files modified:** 9 (5 modified, 4 created)

## Accomplishments

- buyGood/sellGood ACID transactions: validate gold/cargo, merge FIFO stacks, record history, mutate supply/demand, return updated inventory
- Three new IPC channels (game:buyGood, game:sellGood, game:getTransactionHistory) wired end-to-end through preload contextBridge
- TradePanel renders port goods with fluctuating prices, quantity stepper, buy/sell buttons with real-time validation and 3-second inline feedback
- CargoHold shows current capacity bar with color gradient and per-item stack with bought-at provenance
- ProfitDisplay shows running P&L (gold delta from 500 starting) and color-coded last-10 transaction log
- useTradeState subscribes to game:updated for automatic live refresh after each trade
- Shell left panel: PortInfoPanel + CargoHold + ProfitDisplay; right panel: TradePanel when port selected

## Task Commits

Each task was committed atomically:

1. **Task 1: buyGood/sellGood DB transactions, IPC channels, IPCBridge types** - `d011f3e` (feat)
2. **Task 2: TradePanel, CargoHold, ProfitDisplay UI and Shell wiring** - `ea8413e` (feat)

## Files Created/Modified

- `src/main/db/queries.ts` - Added buyGood(), sellGood(), getTransactionHistory(), calcCurrentPrice() helper
- `src/main/ipc/game.ts` - Added game:buyGood, game:sellGood, game:getTransactionHistory handlers + broadcastGameUpdated()
- `src/main/preload.ts` - contextBridge entries for 3 new channels
- `src/shared/ipc-types.ts` - Added buyGood/sellGood/getTransactionHistory to IPCBridge, exported TransactionRecord
- `src/renderer/hooks/useTradeState.ts` - New: fetches marketGoods/inventory/transactions, subscribes to game:updated
- `src/renderer/components/TradePanel.tsx` - New: goods list, quantity stepper, buy/sell, feedback
- `src/renderer/components/CargoHold.tsx` - New: capacity bar, cargo stack list with provenance
- `src/renderer/components/ProfitDisplay.tsx` - New: P&L summary + transaction history
- `src/renderer/components/Shell.tsx` - Wired TradePanel (right), CargoHold+ProfitDisplay (left)

## Decisions Made

- **Buy stacks by port+price:** A purchase at the same port at the same price merges into a single CargoItem. Different ports or price points create separate stacks. This preserves profit calculation granularity.
- **FIFO sell across stacks:** sellGood drains oldest stacks first, removing the entire stack if qty >= stack size. Clean and predictable.
- **Supply/demand mutation on trade:** buy decrements port supply by 1 (MIN 1); sell decrements port demand by 1 (MIN 1). This means repeated buying at one port raises its price, creating realistic trade equilibrium pressure.
- **broadcastGameUpdated in game.ts:** Extracted to a helper called after each trade. Loads game state and fans to all windows. Keeps IPC handlers DRY.
- **CargoHold/ProfitDisplay always visible in left panel:** Player inventory is always contextually relevant, not just when a port is selected.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript typecheck and all 36 vitest tests passed on first run after each task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full trade loop functional: player can buy/sell goods at ports with price fluctuation, cargo tracking, and profit/loss display
- Price dynamics now compound: repeated trading at same port moves prices, creating genuine economic incentives
- Ready for Phase 2 Plan 4 (voyage events and turn advancement) which will advance supply/demand each turn via advancePortEconomy
- No blockers

---
*Phase: 02-core-loop*
*Completed: 2026-03-12*

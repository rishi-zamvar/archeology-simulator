---
phase: 27
plan: 1
subsystem: game-mechanics
tags: [ship, hull, crew, morale, gameplay]
dependency_graph:
  requires: [phase-13-migration-system]
  provides: [ship-hull-condition, crew-morale-system]
  affects: [trading, sailing, voyage-events, ui-status]
tech_stack:
  added: []
  patterns: [migration-v11, ship-crew-status-api]
key_files:
  created:
    - src/renderer/components/ShipStatus.tsx
  modified:
    - src/main/db/schema.ts
    - src/main/db/queries.ts
    - src/main/ipc/game.ts
    - src/main/preload.ts
    - src/shared/game-types.ts
    - src/shared/ipc-types.ts
    - src/renderer/hooks/useTradeState.ts
    - src/renderer/components/Shell.tsx
decisions:
  - Hull degradation applied at SET_SAIL time (not per-turn) for simplicity
  - Morale speed modifier applied on frontend before SET_SAIL action
  - Storm events cause -10 hull and -10 morale; pirate events cause -5 each
  - Trade cost modifier (disgruntled) applied via price adjustment, not separate fee
metrics:
  duration_seconds: 470
  completed: "2026-04-01T23:33:00Z"
  tasks: 1
  files_changed: 8
  files_created: 1
---

# Phase 27: Ship & Crew Summary

Ship hull condition (GAME-03) and crew morale (GAME-04) with DB migration, gameplay effects, and UI indicators.

## What Was Built

### Migration v11
- Added `hull_condition INTEGER NOT NULL DEFAULT 100` to player_inventory
- Added `crew_morale INTEGER NOT NULL DEFAULT 70` to player_inventory

### Hull Condition (GAME-03)
- Starts at 100, degrades 5-15 per voyage (based on distance + random factor)
- Storm events: additional -10 hull damage
- Pirate events: additional -5 hull damage
- Below 30: warning shown in UI, red hull bar
- Below 10: cannot sail -- must repair first (enforced on both frontend and backend)
- Repair at port: costs 10g per point of damage, restores to 100
- Repair button shown when at port and hull < 100

### Crew Morale (GAME-04)
- Starts at 70
- Gains: +5 per successful trade (buy or sell), +3 on port arrival
- Losses: -3 per month at sea, -8 for voyages of 2+ months, -10 on storm events, -5 on pirate events
- Tiers:
  - Enthusiastic (>80): 5% speed bonus (shorter voyage duration)
  - Steady (40-80): no modifiers
  - Disgruntled (<40): 10% speed penalty (longer voyages), 5% trade cost increase (buy prices up, sell prices down)

### UI Components
- ShipStatus component: hull condition bar, morale indicator with tier label, repair button
- Integrated into CargoDropUp panel (bottom-left, above cargo hold)
- Hull percentage shown on cargo toggle button
- Color-coded: green (healthy), amber (warning), red (critical)

### IPC Channels
- `game:getShipCrewStatus` -- returns ShipCrewStatus with all derived modifiers
- `game:repairHull` -- repairs hull to 100, deducts gold, broadcasts update

## Requirements Satisfied

- GAME-03: Ship wear -- hull degrades, warnings shown, repair at port
- GAME-04: Crew morale -- affected by trades, voyages, events; gameplay consequences

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| cd9c485 | feat(27): add ship hull condition and crew morale systems |

## Known Stubs

None -- all data sources wired, no placeholder values.

## Self-Check: PASSED

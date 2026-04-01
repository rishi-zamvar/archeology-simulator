---
phase: 28
plan: world-events-collectibles
subsystem: game-world
tags: [rumors, festivals, postcards, collectibles, world-events]
dependency-graph:
  requires: [queries, port-info-panel, logbook, discoveries-table]
  provides: [tavern-rumors, seasonal-festivals, postcard-collection]
  affects: [market-prices, port-info-panel, logbook-ui]
tech-stack:
  added: []
  patterns: [json-data-files, in-memory-caching, discovery-tracking]
key-files:
  created:
    - resources/data/rumors.json
    - resources/data/festivals.json
  modified:
    - src/renderer/components/PortInfoPanel.tsx
    - src/renderer/components/Logbook.tsx
    - src/main/db/queries.ts
    - src/main/ipc/game.ts
    - src/main/preload.ts
    - src/shared/ipc-types.ts
decisions:
  - Used existing discoveries table with category='postcard' for collectible tracking
  - Region-based rumors rotate deterministically by turn (2-3 per visit)
  - Festival price effects applied server-side to market prices via getMarketPrices IPC
metrics:
  duration: 12m
  completed: 2026-03-31
---

# Phase 28: World Events & Collectibles Summary

Tavern rumors with actionable trade hints, historically grounded port festivals affecting economy, and postcard collectibles unlocked on first port visit.

## What Was Built

### Tavern Rumors (GAME-01)
- Created `resources/data/rumors.json` with 48 region-specific NPC trade rumors across all 6 regions (8 per region)
- Each rumor contains actionable trade intelligence: which port, which good, and whether prices are high or low
- Rumors rotate deterministically based on `currentTurn` -- players see 2-3 fresh rumors each visit
- Styled as quoted italic text in a "Tavern Rumors" section of the PortInfoPanel
- Only shown for discovered/unlocked ports (not unknown)

### Seasonal Festivals (GAME-02)
- Created `resources/data/festivals.json` with 12 historically grounded festivals tied to specific ports and months
- Festivals include: Panathenaia (Athens), Opet (Memphis), Isthmian Games (Corinth), Melqart Festival (Tyre), City Dionysia (Athens), Thesmophoria (Syracuse), Navigium Isidis (Alexandria), Adonia (Byblos), Saturnalia (Ostia), Tanit Festival (Carthage), Karneia (Sparta), Halieia (Rhodes)
- When a festival is active (turn % 12 matches monthIndex), price modifiers are applied server-side to getMarketPrices
- Festival banner displayed in PortInfoPanel with name, description, and per-good price effect indicators
- Price effects range from -30% to +50% on relevant trade goods

### Historical Postcards (GAME-05)
- Postcards auto-collected on first port visit using existing discoveries table (category='postcard')
- New "Postcards" tab added to the Logbook component alongside Journal and Quests
- Shows collection progress: "X/25 Postcards Collected"
- Each postcard displays port name, ambient/cultural description, and turn discovered
- Styled with ancient Mediterranean aesthetic matching existing UI

## Architecture

- **Data layer**: JSON files loaded with in-memory caching (lazy load, never re-read)
- **Backend**: New query functions in queries.ts + IPC handlers in game.ts
- **API surface**: Three new IPC channels (getRumors, getActiveFestival, getPostcards) exposed via preload bridge
- **Festival integration**: Price effects applied transparently within existing getMarketPrices handler
- **Postcard tracking**: Reuses existing discoveries table with INSERT OR IGNORE for idempotency

## Deviations from Plan

None -- plan executed exactly as written. The prior session had already wired the backend (queries.ts, game.ts IPC, preload, ipc-types) so this session focused on the data files and renderer UI.

## Commits

| Hash | Description |
|------|-------------|
| a96a524 | feat(28): add world events, tavern rumors, and postcard collectibles |

## Self-Check: PASSED

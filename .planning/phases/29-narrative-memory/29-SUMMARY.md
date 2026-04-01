---
phase: 29
plan: 1
subsystem: narrative
tags: [dialogue, npc-memory, gossip, epilogue, conclusion-screen]
dependency_graph:
  requires: [dialogue-engine, quest-system, journal]
  provides: [npc-memory, port-gossip, ending-epilogue]
  affects: [dialogue.ts, game-types.ts, ConclusionScreen.tsx, ipc/game.ts]
tech_stack:
  added: []
  patterns: [traded_good-condition, not_visited_port-condition, stats-woven-prose]
key_files:
  created: []
  modified:
    - src/shared/game-types.ts
    - src/game/dialogue.ts
    - src/main/ipc/game.ts
    - src/shared/ipc-types.ts
    - src/renderer/components/ConclusionScreen.tsx
    - resources/data/dialogue/athens-nikias.json
    - resources/data/dialogue/tyre-aziru.json
    - resources/data/dialogue/carthage-elissa.json
    - resources/data/dialogue/memphis-taharqa.json
    - resources/data/dialogue/ostia-hanno.json
decisions:
  - Used traded_good condition type instead of generic memory to keep dialogue engine consistent
  - Gossip uses not_visited_port so it only shows for ports the player has not yet explored
  - Journey timeline limited to 30 narrative/quest/arrival/discovery entries for conciseness
  - Distance approximated at 150km per voyage departure (no exact route tracking)
metrics:
  duration: 4m
  completed: "2026-04-01T23:29:07Z"
---

# Phase 29: Narrative & Memory Summary

NPC memory with trade-reactive dialogue, cross-port gossip system, and narrated ending epilogue with journey timeline.

## What Was Built

### NAR-01: NPC Memory (traded_good condition)

Added a `traded_good` condition type to the dialogue engine that checks the player's recent transaction history. Each of the 5 NPCs now has memory-reactive greeting nodes that fire when the player has traded specific goods:

- **Nikias** (Athens): reacts to pottery and olive oil trades
- **Aziru** (Tyre): reacts to purple dye and wine trades
- **Elissa** (Carthage): reacts to grain and silver trades
- **Taharqa** (Memphis): reacts to grain and papyrus trades
- **Hanno** (Ostia): reacts to olive oil and pottery trades

The condition evaluates against `GameContext.recentTrades` (last 10 transactions), supporting optional `action` filter (buy/sell).

### NAR-02: Port Gossip (not_visited_port condition)

Added a `not_visited_port` condition type that checks if the player has NOT visited a specific port. Each NPC now has a gossip hub node with choices that only appear for ports the player hasn't visited yet:

- NPCs reference other NPCs by name (e.g., "Aziru the spice merchant seeks reliable captains")
- Gossip provides trade hints (e.g., "purple dye prices have risen")
- Gossip choices are automatically hidden once the player visits the referenced port
- Each NPC provides gossip about 2 other ports, creating a cross-referencing network

### NAR-03: Ending Epilogue

Enhanced ConclusionScreen.tsx with:

1. **Stats-woven prose epilogue** that weaves journey stats into narrative: ports visited, regions explored, most-traded good, distance sailed, quests completed, gold earned
2. **Historical context paragraph** that scales with exploration breadth (4+ regions, 2+ regions, or minimal exploration each get different prose)
3. **Scrollable Journey Timeline** showing up to 30 journal highlights with entry-type icons (anchor for arrivals, star for quests, etc.)

Extended `getJourneyStats` IPC to return `regionsVisited`, `mostTradedGood`, `totalDistanceKm`, and `journalHighlights`.

## Commits

| Hash | Message |
|------|---------|
| 6fa13f6 | feat(29): add NPC memory and port gossip to dialogue engine |
| 66adce7 | feat(29): enhance conclusion screen with narrated epilogue and journey timeline |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all features are fully wired to live data sources.

## Self-Check: PASSED

All 10 modified files verified on disk. Both commit hashes confirmed in git log.

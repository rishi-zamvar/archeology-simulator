---
phase: 12-trade-ux-title-screen
plan: 02
subsystem: ui/ipc
tags: [title-screen, ipc, game-entry]
dependency_graph:
  requires: [10-journal-entries]
  provides: [title-screen, hasSave-ipc, newGame-ipc]
  affects: [Shell.tsx, save.ts, ipc-types.ts, preload.ts]
tech_stack:
  added: []
  patterns: [screen-gating, ipc-handler]
key_files:
  created:
    - src/renderer/components/TitleScreen.tsx
  modified:
    - src/main/ipc/save.ts
    - src/shared/ipc-types.ts
    - src/main/preload.ts
    - src/renderer/components/Shell.tsx
decisions:
  - screen gating pattern: Shell uses useState('title'|'game') to gate rendering, useGameState loads in background
  - newGame clears all four tables: game_state, transaction_history, journal_entries, player_inventory
metrics:
  duration: ~4min
  completed: "2026-03-31T22:42:00Z"
---

# Phase 12 Plan 02: Title Screen Summary

Title screen with hasSave/newGame IPC channels and Shell.tsx screen gating for proper game entry flow.

## What Was Done

### Task 1: Add hasSave and newGame IPC channels
- Added `game:hasSave` handler -- lightweight SQL check (`SELECT 1 FROM game_state WHERE id = 1`)
- Added `game:newGame` handler -- transactionally deletes all 4 tables and re-inserts INITIAL_STATE
- Extended IPCBridge type with both new channels
- Wired both through preload contextBridge

### Task 2: Create TitleScreen component and gate Shell rendering
- Created TitleScreen.tsx with parchment theme (Cinzel headings, Lora body, sepia palette)
- Game title "Mare Nostrum", subtitle, description paragraph, and historical flavor quote
- Continue button styled #7a5c2b, only rendered when hasSave is true
- New Game button styled #2b5c4a, always visible
- Shell.tsx gates rendering with `screen` state -- title screen shown on launch
- hasSave checked via lightweight IPC on mount
- New Game calls newGame IPC before transitioning to game

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | acd0221 | hasSave and newGame IPC channels |
| 2 | 58efc5c | TitleScreen component and Shell gating |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None.

## Verification

- TypeScript: `npx tsc --noEmit` passes cleanly
- Tests: 4/6 test files pass; 2 files fail due to pre-existing better-sqlite3 native module version mismatch (unrelated to this plan)

## Self-Check: PASSED

---
phase: 02-core-loop
plan: "04"
subsystem: ui
tags: [voyage-events, modal, ipc, typescript, react, game-fsm]

# Dependency graph
requires:
  - phase: 02-01
    provides: FSM types (EncounteredState, ENCOUNTER action, RESOLVE action) and IPC scaffold
  - phase: 02-02
    provides: PlayerInventory type and getPlayerInventory query used by event resolution

provides:
  - 24-event hand-written database in src/game/events.ts (8 storm, 8 pirate, 8 calm)
  - rollVoyageEvent(turn) — 70% probability roll with weighted type selection
  - resolveEventChoice(event, choiceId, inventory) — deterministic/probabilistic EventOutcome
  - game:getPendingEvent IPC channel — returns in-flight VoyageEvent or null
  - game:resolveEvent IPC channel — applies outcome atomically and transitions FSM to idle
  - EventCard modal component — blocking overlay for voyage event decisions
  - Shell interrupt flow — watches gameState type, fetches pending event, renders EventCard

affects:
  - 03-polish (end-to-end game loop now complete: map → sail → event → trade → sail again)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "In-memory pendingVoyageEvent variable in IPC layer — cleared on each SET_SAIL and after resolution"
    - "SET_SAIL handler rolls event inline and immediately transitions FSM to encountered if event fires"
    - "EventCard manages its own dismissal timing (2-second result display) before calling onResolved"
    - "Shell useEffect on gameState.type drives EventCard visibility — avoids stale closure issues"

key-files:
  created:
    - src/game/events.ts
    - src/renderer/components/EventCard.tsx
  modified:
    - src/main/ipc/game.ts
    - src/shared/ipc-types.ts
    - src/main/preload.ts
    - src/renderer/components/Shell.tsx

key-decisions:
  - "pendingVoyageEvent is module-level in ipc/game.ts — single-player game, no per-session state needed"
  - "Event roll and FSM transition happen inline in SET_SAIL handler, not as a separate IPC call"
  - "EventCard does not close on backdrop click or Escape key — player must make a choice"
  - "Toast notification shown after EventCard dismissal for 3 seconds via setTimeout"

patterns-established:
  - "Event resolution: pure function in events.ts, applied atomically in IPC handler"
  - "FSM interrupt: sail → encountered on event roll; encountered → idle on resolve"

# Metrics
duration: 5min
completed: 2026-03-12
---

# Phase 2 Plan 4: Voyage Event System Summary

**24 hand-written historically grounded voyage events (storm/pirate/calm), weighted roll on every SET_SAIL, EventCard blocking modal with choice → consequence loop, and atomic inventory mutations via game:resolveEvent IPC**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-12T12:50:21Z
- **Completed:** 2026-03-12T12:55:09Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- 24 historically grounded events across 3 types: Etesian winds, Cilician corsairs, Cape Malea, dolphins at the bow, Illyrian sea wolves, waterspouts, floating cargo, star navigation, and more
- Full interrupt flow: SET_SAIL rolls event, FSM transitions sailing → encountered, EventCard modal appears, player chooses, outcome applied atomically to gold and cargo, FSM transitions encountered → idle
- EventCard is a blocking overlay (z-index 2000) — player cannot interact with map or panels during an encounter
- Toast notification shows event result for 3 seconds after modal dismissal

## Task Commits

1. **Task 1: Event database, roll/resolve logic, resolveEvent IPC channel** - `4a1c93e` (feat)
2. **Task 2: EventCard modal UI and Shell interrupt flow wiring** - `b738adb` (feat)

## Files Created/Modified

- `src/game/events.ts` — EVENT_DATABASE (24 events), rollVoyageEvent, resolveEventChoice, EventOutcome type
- `src/renderer/components/EventCard.tsx` — blocking modal with type badge, title, description, choice buttons, result display
- `src/main/ipc/game.ts` — event roll inline in SET_SAIL handler, game:getPendingEvent and game:resolveEvent handlers
- `src/shared/ipc-types.ts` — VoyageEvent re-export, getPendingEvent and resolveEvent added to IPCBridge.game
- `src/main/preload.ts` — getPendingEvent and resolveEvent channels wired
- `src/renderer/components/Shell.tsx` — pendingEvent state, encountered-state effect, EventCard and toast render

## Decisions Made

- **pendingVoyageEvent in module scope** — single-player game; no per-session state needed; cleared on each SET_SAIL to prevent stale events from prior voyages
- **Inline event roll in SET_SAIL handler** — avoids a second round-trip; if event fires, handler returns the encountered state directly rather than the sailing state, so renderer immediately sees the modal trigger
- **No backdrop/escape dismiss** — EventCard is intentionally a blocking choice; this matches the plan requirement that "EventCard is the only way to dismiss the encountered state"
- **2-second result display, then onResolved** — gives player time to read the consequence before the game continues

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The full Phase 2 core loop is now playable end-to-end: map click → port info → sail → voyage event interrupt → resolve → arrive → trade → sail again
- Phase 3 (Polish) can proceed: font bundling, Leaflet performance profiling, mobile/accessibility review, and any remaining UI polish
- The pendingVoyageEvent module variable would need migration to a database column if multiplayer or save/restore of mid-voyage state is added in future phases

---
*Phase: 02-core-loop*
*Completed: 2026-03-12*

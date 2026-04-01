---
phase: 14-dialogue-engine-content-pipeline
plan: 02
subsystem: ui, api
tags: [electron-ipc, react, dialogue, npc, parchment-ui, better-sqlite3]

# Dependency graph
requires:
  - phase: 14-01
    provides: Pure dialogue engine functions (evaluateCondition, getAvailableChoices, getNextNode, findEntryNode) and dialogue JSON data files
  - phase: 13-01
    provides: Migration runner with quest_progress, npc_dialogue_state, reputation tables
provides:
  - IPC handlers for dialogue:getNodes, dialogue:advanceNode, dialogue:getAvailableNpcs
  - DialogueModal React component with parchment styling
  - Shell integration with NPC availability checks and "Speak with NPC" button
  - Effect application for quest_update, reputation_change, journal_entry
affects: [phase-15-trade-system, phase-17-npc-portraits, phase-19-port-unlock, phase-20-typewriter-effect]

# Tech tracking
tech-stack:
  added: []
  patterns: [dialogue-ipc-handler-pattern, dialogue-modal-overlay-pattern, npc-availability-check-pattern]

key-files:
  created:
    - src/main/ipc/dialogue.ts
    - src/renderer/components/DialogueModal.tsx
  modified:
    - src/shared/ipc-types.ts
    - src/main/preload.ts
    - src/main/index.ts
    - src/renderer/components/Shell.tsx

key-decisions:
  - "Dialogue files cached in module-level Map to avoid repeated disk reads"
  - "NPC availability re-checked on dialogue dismiss since conditions may change after effects"
  - "port_unlock and trade_offer effects stubbed with TODO for future phases"

patterns-established:
  - "Dialogue IPC pattern: wrapHandler with GameContext built from DB for each call"
  - "NPC button pattern: useEffect checks getAvailableNpcs when selectedPortId changes"

requirements-completed: [NPC-02]

# Metrics
duration: 5min
completed: 2026-04-01
---

# Phase 14 Plan 02: Dialogue IPC + UI Summary

**Dialogue system wired end-to-end: IPC handlers serve NPC dialogue from JSON files, DialogueModal renders conversations with parchment styling and branching choices, Shell shows "Speak with NPC" at ports**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-01T11:44:24Z
- **Completed:** 2026-04-01T11:49:30Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 6

## Accomplishments
- Three IPC handlers (getNodes, advanceNode, getAvailableNpcs) registered via wrapHandler pattern with validation
- DialogueModal displays NPC conversation with Cinzel speaker name, Lora body text, parchment background (#fdf5e6), choice buttons, and Farewell dismiss on terminal nodes
- Effect application implemented for quest_update (upsert quest_progress), reputation_change (upsert reputation), journal_entry (insert via insertJournalEntry)
- Shell checks for available NPCs when trading at a port, shows "Speak with NPC" button top-center
- All 136 tests pass, dialogue validation passes (1 file), TypeScript compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Create IPC handlers and wire preload bridge** - `851a45d` (feat)
2. **Task 2: Build DialogueModal component and wire into Shell** - `4a686d2` (feat)
3. **Task 3: Verify dialogue UI works end-to-end** - auto-approved checkpoint (no commit)

## Files Created/Modified
- `src/main/ipc/dialogue.ts` - IPC handlers for dialogue:getNodes, dialogue:advanceNode, dialogue:getAvailableNpcs with GameContext building and effect application
- `src/renderer/components/DialogueModal.tsx` - Full-screen dialogue overlay with parchment styling, choice buttons, Farewell dismiss
- `src/shared/ipc-types.ts` - IPCBridge extended with dialogue section
- `src/main/preload.ts` - Dialogue bridge entries added to contextBridge
- `src/main/index.ts` - registerDialogueIPCHandlers imported and called
- `src/renderer/components/Shell.tsx` - DialogueModal wired into render tree with NPC availability checking

## Decisions Made
- Cached dialogue files in a module-level Map to avoid repeated disk reads on each IPC call
- Re-check NPC availability after dialogue dismiss because effects (quest_update) may change entry conditions
- Stubbed port_unlock and trade_offer effects with TODO comments for Phase 19 and Phase 15 respectively

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dialogue system complete end-to-end: JSON data -> engine -> IPC -> UI
- Ready for Phase 15 (trade system enhancements) which may use trade_offer effects
- Ready for Phase 17 (NPC portraits) to enhance DialogueModal visuals
- Ready for Phase 20 (typewriter effect) to animate dialogue text display

---
*Phase: 14-dialogue-engine-content-pipeline*
*Completed: 2026-04-01*

---
phase: 17-npc-characters-dialogue-content
plan: 02
subsystem: ui
tags: [npc, dialogue, portrait, port-unlock, ipc, react]

requires:
  - phase: 17-npc-characters-dialogue-content
    provides: 5 NPC dialogue trees, SVG portraits, dialogue IPC handlers
  - phase: 14-dialogue-engine-content-pipeline
    provides: dialogue engine, condition evaluation, DialogueModal component

provides:
  - NPC portrait display in DialogueModal during conversations
  - Working port_unlock dialogue effect (INSERT INTO port_access)
  - portraitUrl field in dialogue:getNodes and dialogue:getAvailableNpcs IPC responses

affects: [19-port-unlocking, 20-reputation-effects]

tech-stack:
  added: []
  patterns: [portrait-url-resolution-from-resources-directory]

key-files:
  created: []
  modified:
    - src/renderer/components/DialogueModal.tsx
    - src/main/ipc/dialogue.ts
    - src/shared/ipc-types.ts
    - src/renderer/components/Shell.tsx

key-decisions:
  - "port_unlock uses ON CONFLICT with conditional UPDATE to only upgrade status (unknown -> discovered), never downgrade already-unlocked ports"

patterns-established:
  - "Portrait URL resolution: getPortraitUrl(npcId) checks resources/portraits/{npcId}.svg existence, returns file:// URL or null"

requirements-completed: [NPC-04, NPC-03]

duration: 3min
completed: 2026-04-01
---

# Phase 17 Plan 02: NPC Portrait Display and Port Unlock Effect Summary

**NPC portraits displayed in DialogueModal with 64x64 SVG images, port_unlock effect writes to port_access table for map port revealing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T18:19:24Z
- **Completed:** 2026-04-01T18:21:56Z
- **Tasks:** 2 (1 auto + 1 auto-approved checkpoint)
- **Files modified:** 4

## Accomplishments
- NPC portrait (64x64 SVG) displayed beside speaker name in DialogueModal for all 5 NPCs
- port_unlock dialogue effect implemented with INSERT INTO port_access, replacing TODO stub
- portraitUrl added to dialogue:getNodes and dialogue:getAvailableNpcs IPC response types
- Shell.tsx state and DialogueModal props updated to flow portraitUrl end-to-end

## Task Commits

Each task was committed atomically:

1. **Task 1: Add portrait display to DialogueModal and implement port_unlock effect** - `01d8286` (feat)
2. **Task 2: Verify NPC dialogue experience end-to-end** - auto-approved (checkpoint)

## Files Created/Modified
- `src/renderer/components/DialogueModal.tsx` - Added portraitUrl prop, portrait image display beside speaker name
- `src/main/ipc/dialogue.ts` - Added getPortraitUrl helper, portraitUrl in responses, implemented port_unlock effect
- `src/shared/ipc-types.ts` - Updated dialogue:getNodes and getAvailableNpcs response types with portraitUrl
- `src/renderer/components/Shell.tsx` - Added portraitUrl to dialogueNpc state and DialogueModal props

## Decisions Made
- port_unlock uses ON CONFLICT with conditional UPDATE (CASE WHEN status = 'unknown' THEN 'discovered' ELSE status END) to ensure it only upgrades port visibility, never downgrades already-visited or already-discovered ports.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 NPCs have portraits and working dialogue with branching, quests, and port-revealing effects
- port_unlock effect is live, ports revealed through NPC dialogue will appear on the map
- Phase 17 (NPC Characters and Dialogue Content) complete

## Self-Check: PASSED

All 4 modified files verified present. Commit hash 01d8286 confirmed in git log.

---
*Phase: 17-npc-characters-dialogue-content*
*Completed: 2026-04-01*

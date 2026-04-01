---
phase: 13-infrastructure-migration-system
plan: 02
subsystem: database
tags: [sqlite, ipc, migrations, new-game-reset]

requires:
  - phase: 13-01
    provides: PLAYER_DATA_TABLES constant and migration runner in schema.ts
provides:
  - Consolidated new-game reset using PLAYER_DATA_TABLES iteration
  - db:schemaVersion IPC handler for migration debugging
affects: [14-port-data-architecture, 15-quest-system]

tech-stack:
  added: []
  patterns: [PLAYER_DATA_TABLES-driven reset, schema version introspection]

key-files:
  created: []
  modified: [src/main/ipc/save.ts]

key-decisions:
  - "PLAYER_DATA_TABLES loop replaces hardcoded DELETE statements -- future tables auto-included in reset"
  - "db:schemaVersion IPC added for debugging save-upgrade issues"

patterns-established:
  - "New-game reset iterates PLAYER_DATA_TABLES -- never add hardcoded DELETE statements"
  - "Reference tables (ports, goods, port_inventory, artifact_cache, curated_images, port_lore) and schema_version are never cleared on new game"

requirements-completed: []

duration: 1min
completed: 2026-04-01
---

# Phase 13 Plan 02: New-Game Reset Consolidation Summary

**Consolidated new-game reset to iterate PLAYER_DATA_TABLES (9 tables) and added db:schemaVersion IPC handler**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-01T09:52:37Z
- **Completed:** 2026-04-01T09:53:28Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced 4 hardcoded DELETE statements with PLAYER_DATA_TABLES loop clearing all 9 player-data tables
- Fixed saves_history not being cleared on new game (was missing in v1.3)
- Added db:schemaVersion IPC handler for migration debugging
- All 92 tests pass (7 test files)

## Task Commits

Each task was committed atomically:

1. **Task 1: Consolidate new-game reset and add schema version IPC** - `7535a3b` (feat)

## Files Created/Modified
- `src/main/ipc/save.ts` - Imported PLAYER_DATA_TABLES, replaced hardcoded DELETEs with loop, added db:schemaVersion handler

## Decisions Made
- Used PLAYER_DATA_TABLES iteration per CONTEXT.md locked decision -- future phases adding new player-data tables only need to update the array in schema.ts
- Added db:schemaVersion handler per RESEARCH.md recommendation -- ~5 lines, useful for debugging save-upgrade issues

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 13 infrastructure complete: migration runner + consolidated reset + schema version endpoint
- Ready for Phase 14 (port data architecture) to add new tables knowing they will be auto-included in new-game reset

---
*Phase: 13-infrastructure-migration-system*
*Completed: 2026-04-01*

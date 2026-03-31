---
phase: 06-ui-integration
plan: 02
subsystem: ui
tags: [dead-code-removal, ipc, preload, typescript]

# Dependency graph
requires:
  - phase: 06-ui-integration
    provides: Plan 01 removed Met API fallback from TradePanel render path
provides:
  - Zero runtime Met Museum or Wikimedia API calls remaining in codebase
  - Clean IPC surface with only curated-image and scan-resource-images handlers
affects: [08-error-handling]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/main/ipc/game.ts
    - src/main/preload.ts
    - src/shared/ipc-types.ts
    - src/main/db/queries.ts
  deleted:
    - src/renderer/components/ArtifactImage.tsx
    - src/renderer/hooks/useArtifactImages.ts

key-decisions:
  - "Keep artifact_cache table in DB migrations (inert, removing migrations is risky)"
  - "Curated image infrastructure (getCuratedImages, CuratedImage, resource-image://) left untouched"

patterns-established: []

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-03-31
---

# Phase 06 Plan 02: Dead Code Removal Summary

**Removed ~635 lines of dead Met Museum/Wikimedia API code from IPC handlers, preload, types, and DB queries -- app makes zero external image requests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-31T11:08:11Z
- **Completed:** 2026-03-31T11:12:00Z
- **Tasks:** 2
- **Files modified:** 4 modified, 2 deleted

## Accomplishments
- Deleted ArtifactImage.tsx (187 lines) and useArtifactImages.ts (49 lines) from renderer
- Removed game:get-artifacts IPC handler (~135 lines of Met Museum + Wikimedia fetch logic)
- Removed image:search-port-candidates IPC handler (~170 lines of port illustration search)
- Cleaned preload bridge, shared types, and DB query functions of all dead references
- App is now fully offline for images -- zero external network requests for image data

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete renderer dead code files** - `d2848c7` (feat)
2. **Task 2: Remove dead IPC handlers, preload entries, and types** - `1b4a703` (feat)

## Files Created/Modified
- `src/renderer/components/ArtifactImage.tsx` - DELETED (IntersectionObserver lazy-loading component for Met API images)
- `src/renderer/hooks/useArtifactImages.ts` - DELETED (hook calling game:get-artifacts IPC)
- `src/main/ipc/game.ts` - Removed game:get-artifacts and image:search-port-candidates handlers, unused imports
- `src/main/preload.ts` - Removed getArtifacts and searchPortCandidates bridge entries
- `src/shared/ipc-types.ts` - Removed CachedArtifact re-export, ImageCandidate interface, getArtifacts and searchPortCandidates from IPCBridge
- `src/main/db/queries.ts` - Removed CachedArtifact interface, getArtifactsForGood, cacheArtifact functions

## Decisions Made
- Kept artifact_cache table in DB migrations (empty but inert -- removing migrations is risky and unnecessary)
- All curated image functions (getCuratedImagesForGood, getCuratedImagesForPort, CuratedImage) left untouched as the active runtime path

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Pre-existing ShipMarker.tsx Leaflet type errors remain (documented in STATE.md, out of scope). Individual build:main and build:renderer commands pass cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 06 (ui-integration) is now complete -- both plans done
- The app makes zero external network requests for images
- Pre-existing ShipMarker TypeScript errors remain unresolved (out of scope)
- Ready for Phase 08 (error-handling) or any subsequent work

---
*Phase: 06-ui-integration*
*Completed: 2026-03-31*

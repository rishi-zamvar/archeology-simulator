---
phase: 08-surface-cleanup
plan: 01
subsystem: ui, typescript, lint
tags: [typescript, eslint, zustand, error-handling, leaflet, react]

# Dependency graph
requires:
  - phase: 07-ipc-foundation
    provides: IPCResponse<T> typed contract, wrapHandler pattern
provides:
  - Zero tsc errors (CLN-01)
  - Justified eslint-disable comments (CLN-02)
  - Visible error toast for IPC failures (ERR-03)
  - errorToast/showError/clearError in uiStore
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Duck-typed interfaces for untyped JS libraries (no extends)"
    - "Global error toast via Zustand store with auto-dismiss timer"
    - "Every eslint-disable has adjacent justification comment"

key-files:
  created: []
  modified:
    - src/renderer/components/ShipMarker.tsx
    - src/renderer/stores/uiStore.ts
    - src/renderer/components/Shell.tsx
    - src/main/db/queries.ts
    - src/main/preload.ts
    - src/renderer/components/TradePanel.tsx

key-decisions:
  - "MotionLayer uses standalone duck-typed interface instead of extending L.Layer"
  - "Error toast positioned top-right to avoid overlap with bottom-center eventToast"
  - "Ship animation and getPendingEvent catches log warnings but do not show toast (genuinely non-fatal)"

patterns-established:
  - "Duck-typed interface pattern: standalone interface with only called methods, cast at creation/usage sites"
  - "Error feedback pattern: uiStore.showError() for any IPC failure that should be visible"

requirements-completed: [ERR-03, CLN-01, CLN-02]

# Metrics
duration: 7min
completed: 2026-03-31
---

# Phase 8 Plan 1: Surface Cleanup Summary

**Duck-typed MotionLayer fix for zero tsc errors, eslint-disable justification audit, and global error toast for silent IPC failures**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-31T11:41:02Z
- **Completed:** 2026-03-31T11:48:22Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Resolved all 3 TypeScript errors (TS2430, TS2345 x2) in ShipMarker.tsx by replacing L.Layer inheritance with duck-typed standalone interface
- Added justification comments to all 5 eslint-disable sites across 4 files
- Added errorToast/showError/clearError to uiStore with 5-second auto-dismiss and timer reset
- Rendered error toast in Shell.tsx (top-right, red background, dismiss button)
- Wired SET_SAIL error handling, console.warn for non-fatal catches, and useTradeState error display

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix tsc errors in ShipMarker.tsx (CLN-01)** - `36cf58e` (fix)
2. **Task 2: Add justification comments to all eslint-disable sites (CLN-02)** - `137e3c5` (docs)
3. **Task 3: Wire visible error feedback for silent IPC failures (ERR-03)** - `09a7427` (feat)

## Files Created/Modified
- `src/renderer/components/ShipMarker.tsx` - Duck-typed MotionLayer interface, type assertions at removeLayer calls
- `src/renderer/stores/uiStore.ts` - errorToast state, showError/clearError actions with auto-dismiss timer
- `src/renderer/components/Shell.tsx` - Error toast rendering, fixed silent catch blocks, useTradeState error display
- `src/main/db/queries.ts` - Justification comment for require() eslint-disable
- `src/main/preload.ts` - Justification comment for conditional require eslint-disable
- `src/renderer/components/TradePanel.tsx` - Justification comments for 2 exhaustive-deps eslint-disables

## Decisions Made
- MotionLayer uses standalone duck-typed interface (not extending L.Layer) with `as unknown as L.Layer` casts at map.removeLayer() call sites -- avoids impossible type compatibility with 50+ L.Layer method overloads
- Error toast positioned top-right (fixed) to avoid overlap with bottom-center eventToast
- Ship animation and getPendingEvent catches kept as non-fatal (console.warn only) since they have existing justification and state syncs via subscription
- SET_SAIL catch shows user-visible error toast since navigation failure needs immediate feedback

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- v1.2 Coding Hygiene milestone is now complete (Phase 7 + Phase 8)
- Codebase compiles cleanly with zero tsc errors
- All lint suppressions documented
- IPC failures visible to users
- Ready for v1.1 Phase 5 (Image Sourcing) or any future milestone

---
*Phase: 08-surface-cleanup*
*Completed: 2026-03-31*

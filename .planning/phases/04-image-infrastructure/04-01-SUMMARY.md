---
phase: 04-image-infrastructure
plan: 01
subsystem: database
tags: [sqlite, better-sqlite3, schema, curated-images, seed]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: SQLite schema with goods and ports tables (FK targets)
provides:
  - curated_images table with CHECK constraint and two indexes in schema.ts
  - CuratedImage interface (camelCase fields) exported from queries.ts
  - seedCuratedImages — idempotent INSERT OR IGNORE loader for curated-images.json
  - getCuratedImagesForGood (LIMIT 5) and getCuratedImagesForPort (LIMIT 3)
  - resources/data/curated-images.json — empty valid JSON array seed manifest
affects:
  - 04-02 (ipc-types and IPC handlers will import CuratedImage from queries.ts)
  - 05-image-sourcing (writes to curated-images.json; seedCuratedImages consumes it)
  - 06-renderer (reads curated images via IPC for good/port detail panels)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "INSERT OR IGNORE seed pattern (safe to call on every app launch — already used by seedPorts/seedGoods)"
    - "Column aliases in SELECT (snake_case AS camelCase) so better-sqlite3 rows map directly to TypeScript interface"
    - "Inline require() for JSON seed manifest inside function body (eslint-disable comment per project convention)"

key-files:
  created:
    - resources/data/curated-images.json
  modified:
    - src/main/db/schema.ts
    - src/main/db/queries.ts

key-decisions:
  - "LIMIT 5 for good images, LIMIT 3 for port images — matches Phase 6 display budget (unchanged from plan)"
  - "CHECK constraint at DB level guarantees no orphaned rows regardless of application code"
  - "Empty manifest (not placeholder entries) so Phase 5 controls all real content"

patterns-established:
  - "Curated image query functions follow same column-alias SELECT pattern as getArtifactsForGood"
  - "Seed functions always wrapped in plain for-loop (not transaction) since manifest can be large"

# Metrics
duration: 8min
completed: 2026-03-16
---

# Phase 4 Plan 1: Image Infrastructure Summary

**SQLite curated_images table with CHECK constraint, two indexes, typed CuratedImage query layer, and empty seed manifest ready for Phase 5 image sourcing**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-16T12:45:58Z
- **Completed:** 2026-03-16T12:53:50Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- curated_images table added inside existing initializeDatabase transaction with `CHECK ((good_id IS NOT NULL) OR (port_id IS NOT NULL))` and REFERENCES to goods(id) and ports(id)
- Two indexes (idx_curated_images_good_id, idx_curated_images_port_id) for query performance
- CuratedImage TypeScript interface exported with camelCase fields matching SQL column aliases
- seedCuratedImages, getCuratedImagesForGood (LIMIT 5), getCuratedImagesForPort (LIMIT 3) all exported from queries.ts
- Empty resources/data/curated-images.json manifest created; Node.js can require() it without error

## Task Commits

All three tasks committed atomically in a single coherent commit:

1. **Tasks 1-3: schema + queries + manifest** - `bf886a8` (feat)

**Plan metadata:** (pending — this commit)

## Files Created/Modified
- `src/main/db/schema.ts` — curated_images table + 2 indexes appended inside existing transaction
- `src/main/db/queries.ts` — CuratedImage interface, seedCuratedImages, getCuratedImagesForGood, getCuratedImagesForPort appended
- `resources/data/curated-images.json` — empty seed manifest `[]`

## Decisions Made
- Kept LIMIT 5 / LIMIT 3 per plan spec — matches Phase 6 renderer display budget
- No new imports needed in queries.ts (Database already imported; require() available in main process)
- Pre-existing ShipMarker.tsx TypeScript errors confirmed pre-existing via git stash check — not introduced by this plan

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- `npx tsc --noEmit` reported 3 pre-existing errors in `src/renderer/components/ShipMarker.tsx` (MotionLayer interface mismatch). Confirmed pre-existing by running tsc on the stashed state — identical errors before our changes. No action required.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- curated_images schema and query layer are fully in place
- Phase 4 Plan 2 can now add IPC handlers and ipc-types.ts exports for CuratedImage
- Phase 5 (Image Sourcing) has a valid empty manifest to populate and seedCuratedImages ready to load it

---
*Phase: 04-image-infrastructure*
*Completed: 2026-03-16*

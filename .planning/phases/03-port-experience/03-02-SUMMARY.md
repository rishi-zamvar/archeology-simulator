---
phase: 03-port-experience
plan: "02"
subsystem: ui
tags: [met-museum-api, wikimedia-commons, sqlite-cache, intersection-observer, react, electron-ipc, better-sqlite3]

requires:
  - phase: 02-core-loop
    provides: TradePanel component, IPC bridge, better-sqlite3 schema/queries pattern

provides:
  - artifact_cache SQLite table with 24h TTL for museum images
  - getArtifactsForGood() / cacheArtifact() query functions
  - game:get-artifacts IPC channel with Met Museum → Wikimedia → placeholder fallback
  - ArtifactImage React component with IntersectionObserver lazy-loading
  - useArtifactImages hook (Promise.all per good, cancellation-safe)
  - TradePanel updated to show 1 artifact image per trade good

affects:
  - 03-03 (ambient audio — no coupling, but port experience now has visual + TBD audio)
  - Any future phase that displays trade goods or port content

tech-stack:
  added: []
  patterns:
    - "Met Museum public API (no auth): search then object detail, public domain filter"
    - "Wikimedia Commons allimages API as secondary image fallback"
    - "artifact_cache INSERT OR REPLACE with ISO timestamp TTL"
    - "IntersectionObserver lazy-load with rootMargin 50px and disconnect() cleanup"
    - "Promise.all with cancelled flag for stale setState prevention"

key-files:
  created:
    - src/renderer/components/ArtifactImage.tsx
    - src/renderer/hooks/useArtifactImages.ts
  modified:
    - src/main/db/schema.ts
    - src/main/db/queries.ts
    - src/main/ipc/game.ts
    - src/shared/ipc-types.ts
    - src/main/preload.ts
    - src/renderer/components/TradePanel.tsx

key-decisions:
  - "CachedArtifact interface exported from queries.ts and re-exported through ipc-types.ts boundary"
  - "IPC channel named 'game:get-artifacts' (kebab-case, consistent with existing channels)"
  - "Main process fetch: native Node 18 built-in, no node-fetch dependency needed"
  - "Max 3 concurrent Met object fetches via Promise.all on first 3 objectIDs"
  - "Placeholder sentinel: museumId === 'placeholder' triggers SVG amphora fallback in renderer"
  - "1 artifact shown per good in TradePanel for compact layout; hook returns up to 3 (future use)"
  - "ArtifactCaption exported separately so it can be composed independently of the image"

patterns-established:
  - "IntersectionObserver pattern: useRef sentinel + disconnect in cleanup — reusable for any lazy content"
  - "useEffect key pattern: sorted join of IDs prevents spurious re-fetches"

duration: 3min
completed: 2026-03-12
---

# Phase 03 Plan 02: Museum Artifact Images Summary

**Met Museum API + Wikimedia fallback wired end-to-end: artifact images cache in SQLite with 24h TTL and lazy-load via IntersectionObserver in the TradePanel.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T13:43:52Z
- **Completed:** 2026-03-12T13:46:56Z
- **Tasks:** 2/2
- **Files modified:** 7

## Accomplishments

- Artifact cache persists public-domain museum images in SQLite, eliminating repeat API calls across sessions
- Met Museum search + object detail + Wikimedia fallback + placeholder ensures every trade good always has something to render
- IntersectionObserver lazy-loading means images only fetch when the TradePanel rows scroll into view, keeping initial render fast

## Task Commits

1. **Task 1: Add artifact_cache schema, queries, and IPC channel** - `9e941d5` (feat)
2. **Task 2: ArtifactImage component, useArtifactImages hook, TradePanel integration** - `68f8231` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/main/db/schema.ts` — artifact_cache table + idx_artifact_cache_good_id index
- `src/main/db/queries.ts` — CachedArtifact interface, getArtifactsForGood(), cacheArtifact()
- `src/main/ipc/game.ts` — game:get-artifacts handler with full fallback chain
- `src/shared/ipc-types.ts` — CachedArtifact re-export + getArtifacts in IPCBridge
- `src/main/preload.ts` — getArtifacts wired to ipcRenderer.invoke
- `src/renderer/components/ArtifactImage.tsx` — lazy-loading thumbnail + ArtifactCaption export
- `src/renderer/hooks/useArtifactImages.ts` — Promise.all hook with cancellation
- `src/renderer/components/TradePanel.tsx` — artifact image row per trade good

## Decisions Made

- **CachedArtifact in ipc-types.ts boundary** — type re-exported from queries.ts so renderer imports from the boundary file, not main process internals
- **game:get-artifacts IPC channel name** — kebab-case, consistent with project convention
- **Placeholder via museumId sentinel** — main process returns a placeholder record rather than an empty array; renderer can always map over results without nil checks
- **1 artifact shown per good** — keeps the panel compact; hook fetches up to 3 so the data is available for future multi-image views
- **ArtifactCaption as named export** — composable separately from the image `<figure>` element

## Deviations from Plan

None — plan executed exactly as written.

# Roadmap: Archeology Simulator

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped 2026-03-16)
- 🚧 **v1.1 Integration & macOS Polish** - Phases 4-6 (in progress)
- 🚧 **v1.2 Coding Hygiene** - Phases 7-8 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-3) - SHIPPED 2026-03-16</summary>

### Phase 1: Foundation
**Goal**: Project scaffolded and runnable
**Plans**: 4 plans (complete)

### Phase 2: Core Gameplay
**Goal**: Full trade loop playable end-to-end
**Plans**: 5 plans (complete)

### Phase 3: Polish & Packaging
**Goal**: Game shippable with audio, tutorial, and Electron packaging
**Plans**: 4 plans (complete)

</details>

---

### 🚧 v1.1 Integration & macOS Polish (In Progress)

**Milestone Goal:** Replace all placeholder visuals (SVG port illustrations, live API artifact images) with verified, user-approved, public-domain historical images stored locally — making the app fully offline and visually authentic.

#### Phase 4: Image Infrastructure
**Goal**: The app has a schema and asset directory ready to serve curated images without any live API calls
**Depends on**: Phase 3 (v1.0 complete)
**Requirements**: INFRA-01, INFRA-02
**Success Criteria** (what must be TRUE):
  1. A `curated_images` table exists in SQLite with columns for file path, attribution, source URL, and port/good reference
  2. A `resources/images/` directory structure exists with subdirectories for ports and each trade good
  3. The Electron IPC bridge exposes a handler that reads curated image metadata from the database and returns it to the renderer
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Add curated_images table, CuratedImage interface, query functions, and empty seed manifest
- [x] 04-02-PLAN.md — Create resources/images/ directory tree, IPC handler, preload exposure, and startup validation

#### Phase 5: Image Sourcing & Curation
**Goal**: All 25 ports and 8 trade goods have user-approved historical images sourced from public domain archives or AI-generated, downloaded into the app's asset directory and recorded in curated-images.json
**Depends on**: Phase 4
**Requirements**: IMG-01, IMG-02, IMG-03
**Success Criteria** (what must be TRUE):
  1. Each of the 25 ports has exactly 1 historical illustration (painting, engraving, etching) or AI-generated fallback in resources/images/ports/
  2. Each of the 8 trade goods has 1-4 ancient art images (mosaics, frescoes, vase paintings, reliefs) in resources/images/{goodId}/
  3. Every image was presented to the user with source URL, attribution, and preview before being accepted
  4. curated-images.json contains valid entries for all images with correct portId/goodId, filePath, attribution, and sourceUrl
**Plans**: 4 plans

Plans:
- [ ] 05-01-PLAN.md — Search and curate historical illustrations for 8 Greek ports (interactive approval)
- [ ] 05-02-PLAN.md — Search and curate historical illustrations for 17 remaining ports across 5 regions (interactive approval)
- [ ] 05-03-PLAN.md — Search and curate ancient art images for 8 trade goods, 4 images each (interactive approval)
- [ ] 05-04-PLAN.md — Validate manifest completeness, file integrity, and ID correctness

#### Phase 6: UI Integration
**Goal**: Players see real historical art throughout the game — no SVG placeholders, no live API calls for images
**Depends on**: Phase 5
**Requirements**: INFRA-03
**Success Criteria** (what must be TRUE):
  1. Arriving at any of the 25 ports displays the curated historical illustration instead of the programmatic SVG
  2. Opening the market for any of the 8 trade goods displays the curated artifact photos instead of Met API results
  3. The app loads and displays all images with no network requests — fully offline
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Wire attribution into useResourceImages hook, add attribution display to PortScene and TradePanel, remove Met API fallback from TradePanel
- [x] 06-02-PLAN.md — Delete dead Met API code: ArtifactImage, useArtifactImages, IPC handlers, preload entries, types, DB queries

---

### 🚧 v1.2 Coding Hygiene (In Progress)

**Milestone Goal:** Eliminate ad-hoc error handling, duplicated path logic, and TypeScript/lint debt — leaving the codebase with a consistent IPC contract, structured logging, and zero TypeScript errors.

#### Phase 7: IPC Foundation
**Goal**: The main process has a single, consistent contract for all IPC communication — shared path resolution, typed response shape, structured logging, and uniform handler registration
**Depends on**: Phase 6 (v1.1 complete)
**Requirements**: ERR-01, ERR-02, ARCH-01, ARCH-02, DBG-01
**Success Criteria** (what must be TRUE):
  1. Every IPC handler returns `{ success: boolean, data?: T, error?: string }` — no handler returns a raw value or throws unhandled
  2. `resourcesBase` is computed once in a shared utility and imported where needed — the three duplicate computations are gone
  3. A log call in any main-process module produces output in the format `[module] level: message` — no ad-hoc `console.log` calls remain in main-process files
  4. Every IPC handler follows the pattern: validate input, execute in try/catch, return typed response — confirmed by reading each handler
**Plans**: 4 plans

Plans:
- [x] 07-01-PLAN.md — Create logger, paths utility, IPCResponse type, and wrapHandler HOF (foundation)
- [x] 07-02-PLAN.md — Migrate save.ts and 7 simple getter handlers in game.ts to wrapHandler
- [x] 07-03-PLAN.md — Migrate 8 complex stateful handlers in game.ts and clean up index.ts
- [x] 07-04-PLAN.md — Update IPCBridge return types and all renderer call sites to unwrap IPCResponse

#### Phase 8: Surface Cleanup
**Goal**: The renderer handles IPC failures gracefully, TypeScript compiles without errors, and no unjustified lint suppressions remain
**Depends on**: Phase 7
**Requirements**: ERR-03, CLN-01, CLN-02
**Success Criteria** (what must be TRUE):
  1. When any IPC call fails (e.g., database error), the player sees a visible error message rather than a silent failure or unhandled promise rejection
  2. `tsc --noEmit` completes with zero errors — the ShipMarker.tsx MotionLayer interface mismatch is resolved
  3. Every `eslint-disable` comment either has a written justification in a code comment explaining why it is necessary, or has been removed
**Plans**: 1 plan

Plans:
- [x] 08-01-PLAN.md — Fix ShipMarker tsc errors, add eslint-disable justifications, wire error toast for silent IPC failures

---

## Progress

**Execution Order:** 4 → 5 → 6 → 7 → 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 4/4 | Complete | 2026-03-16 |
| 2. Core Gameplay | v1.0 | 5/5 | Complete | 2026-03-16 |
| 3. Polish & Packaging | v1.0 | 4/4 | Complete | 2026-03-16 |
| 4. Image Infrastructure | v1.1 | 2/2 | Complete | 2026-03-16 |
| 5. Image Sourcing & Curation | v1.1 | 0/4 | Not started | - |
| 6. UI Integration | v1.1 | 2/2 | Complete | 2026-03-31 |
| 7. IPC Foundation | v1.2 | 4/4 | Complete | 2026-03-17 |
| 8. Surface Cleanup | v1.2 | 1/1 | Complete | 2026-03-31 |

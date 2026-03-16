# Roadmap: Archeology Simulator

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped 2026-03-16)
- 🚧 **v1.1 Integration & macOS Polish** - Phases 4-6 (in progress)

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
**Goal**: All 17-20 images are sourced from public domain archives, individually reviewed and approved by the user, then downloaded into the app's asset directory
**Depends on**: Phase 4
**Requirements**: IMG-01, IMG-02, IMG-03
**Success Criteria** (what must be TRUE):
  1. Each of the 5 ports has exactly 1 historical drawing or illustration identified from Wikimedia Commons, Met Open Access, British Museum, or Europeana — with a source URL the user can verify
  2. Each of the 3 trade goods has 4-5 archaeological artifact photos identified from the same sources
  3. Every candidate image is presented to the user one at a time with its source URL, attribution, and a preview before being accepted
  4. Only user-approved images are downloaded into resources/images/ and recorded in the curated_images table
**Plans**: TBD

Plans:
- [ ] 05-01: Source and present port illustration candidates (5 ports, 1 each) — checkpoint before download
- [ ] 05-02: Source and present trade good artifact candidates (3 goods, 4-5 each) — checkpoint before download
- [ ] 05-03: Download approved images and populate curated_images table

#### Phase 6: UI Integration
**Goal**: Players see real historical art throughout the game — no SVG placeholders, no live API calls for images
**Depends on**: Phase 5
**Requirements**: INFRA-03
**Success Criteria** (what must be TRUE):
  1. Arriving at any of the 5 ports displays the curated historical illustration instead of the programmatic SVG
  2. Opening the market for any of the 3 trade goods displays the curated artifact photos instead of Met API results
  3. The app loads and displays all images with no network requests — fully offline
**Plans**: TBD

Plans:
- [ ] 06-01: Swap port scene component to load from curated_images table
- [ ] 06-02: Swap trade good image component to load from curated_images table and remove Met API fallback path

---

## Progress

**Execution Order:** 4 → 5 → 6

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 4/4 | Complete | 2026-03-16 |
| 2. Core Gameplay | v1.0 | 5/5 | Complete | 2026-03-16 |
| 3. Polish & Packaging | v1.0 | 4/4 | Complete | 2026-03-16 |
| 4. Image Infrastructure | v1.1 | 2/2 | Complete | 2026-03-16 |
| 5. Image Sourcing & Curation | v1.1 | 0/3 | Not started | - |
| 6. UI Integration | v1.1 | 0/2 | Not started | - |

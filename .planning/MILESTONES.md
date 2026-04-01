# Project Milestones: Archeology Simulator

## v1.3 Gameplay Depth & Polish (Shipped: 2026-04-01)

**Phases completed:** 4 phases, 10 plans, 21 tasks

**Key accomplishments:**

- Pure weather functions with Athenian calendar season derivation, duration multipliers, storm weights, mare clausum flags, and seasonal descriptions -- 37 TDD tests green
- Seasonal event weights wired into SET_SAIL handler and duration multiplier into getReachablePorts IPC -- winter voyages now longer and stormier, summer voyages shorter and calmer
- Season header display with Athenian month names, mare clausum sailing warning modal, Wait for Spring IPC, and seasonal logbook weather descriptions
- SQLite journal_entries table with typed query functions, IPC handlers, and preload bridge for captain's journal
- Injected insertJournalEntry calls into buyGood/sellGood transactions and game:action/resolveEvent IPC handlers for automatic trade, event, departure, and arrival journaling
- Commit:
- Per-turn sailing IPC with advanceSailingTurn handler, RESUME_SAILING FSM transition, and animation utility functions
- Per-turn segmented ship animation with dashed route line, camera follow, and floating voyage progress overlay
- Green/red profit-loss indicators per cargo row with weighted-average cost, dynamic total preview, and purchase provenance in TradePanel

---

## v1.0 MVP (Shipped: 2026-03-12)

**Delivered:** Fully playable ancient Mediterranean trade simulator with illustrated port scenes, museum artifact integration, ambient audio, and guided tutorial.

**Phases completed:** 1-3 (13 plans total)

**Key accomplishments:**

- Electron + React + Vite desktop app with secure IPC bridge, SQLite persistence, and parchment UI
- Leaflet map with 5 Mediterranean ports, ship animation, and click-to-navigate flow
- Complete trade system: buy/sell with supply/demand pricing, cargo management, profit tracking
- 24 voyage events with decision cards interrupting transit
- Illustrated port scenes with 6 regional SVG variants and clickable Market/Harbor overlays
- Met Museum API artifact images with SQLite cache (24h TTL) displayed in trade panel
- Web Audio API synthesized ambient soundscape (no external files)
- Tutorial FSM guiding new players through first voyage (skippable)

**Stats:**

- 100 files created/modified
- 7,732 lines of TypeScript/TSX
- 3 phases, 13 plans
- 1 day from start to ship

**Git range:** `d8a8898` → `d55f77f`

**What's next:** Real image sourcing (archaeological artifact photos, historical port illustrations), integration polish, macOS packaging

---

## v1.1 Integration & macOS Polish (Shipped: 2026-03-31)

**Delivered:** 57 curated historical images (25 ports + 32 trade goods) replacing all SVG placeholders and live Met API calls. App is fully offline for all image content with attribution displays.

**Phases completed:** 4-6 (8 plans total)

**Key accomplishments:**

- curated_images table with seedCuratedImages() manifest system
- 25 port illustrations: 16 public domain historical art + 9 AI-generated in 18th-century engraving style
- 32 trade good images: AI-generated in ancient Mediterranean art styles (mosaics, frescoes, vase paintings, reliefs)
- resource-image:// custom Electron protocol for offline image serving
- Attribution overlays on PortScene and TradePanel components
- ~635 lines of dead Met API code removed (ArtifactImage, useArtifactImages, IPC handlers)

**Stats:**

- 3 phases, 8 plans
- 57 curated images in manifest
- Shipped same day as v1.2

**Git range:** `d55f77f` → `08d5c28`

---

## v1.2 Coding Hygiene (Shipped: 2026-03-31)

**Delivered:** Consistent IPC contract with typed responses, structured logging, zero TypeScript errors, justified lint suppressions, and visible error feedback for IPC failures.

**Phases completed:** 7-8 (5 plans total)

**Key accomplishments:**

- IPCResponse<T> typed response shape across all IPC handlers
- wrapHandler HOF as single IPC registration point
- Structured logging with [module] level: message format
- getResourcesBase() shared path resolution (eliminated 3 duplicate computations)
- ShipMarker.tsx TypeScript errors fixed (duck-typed MotionLayer)
- Error toast for IPC failures visible to player
- All eslint-disable comments justified
- tsc --noEmit passes with zero errors

**Stats:**

- 2 phases, 5 plans
- 8 requirements satisfied (ERR-01/02/03, ARCH-01/02, DBG-01, CLN-01/02)

**Git range:** `08d5c28` → `7ecd4d9`

---

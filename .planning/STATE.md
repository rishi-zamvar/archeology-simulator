# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-12)

**Core value:** Students learn ancient Mediterranean history by making decisions as a merchant captain, not by reading about them.
**Current focus:** Phase 3 — Port Experience

## Current Position

Phase: 3 of 3 (Port Experience) — Complete
Plan: 5 of 5 in current phase (03-01, 03-02, 03-03, 03-04, 03-05 complete)
Status: Phase complete
Last activity: 2026-03-12 — Completed 03-05-PLAN.md (PortIllustration SVG scenes for all 6 regions)

Progress: [██████████] 100% (All 3 phases + bonus plan 03-05 complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 8 (all phases)
- Average duration: ~3 min
- Total execution time: ~0.40 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | 11 min | 3.7 min |
| 02-core-loop  | 4/4 | 14 min | 3.5 min ✓ |
| 03-port-experience | 5/5 | ~43 min | ~8.6 min ✓ |

**Recent Trend:**
- Last 5 plans: 01-02 (3 min), 01-03 (3 min), 02-01 (5 min), 02-03 (4 min)
- Trend: Fast, consistent execution

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **better-sqlite3@12.6.2** — version 12.7.0 from plan doesn't exist on npm; 12.6.2 is latest stable
- **vite@7.3.1** — Vite 8 not released; 7.3.1 is latest stable
- **contextBridge key is 'api'** — window.api exposes IPCBridge interface (not window.gameAPI)
- **Separate tsconfig.main.json** — CommonJS for Electron main, ESNext for Vite renderer (required for Electron Node.js runtime)
- **GameState is a discriminated union** — not a generic object; enables exhaustive FSM switch and type-safe IPC contracts
- **initializeDatabase(path)** — accepts path string so tests pass ':memory:' without Electron dependency
- **ipc-types.ts re-exports from game/types** — single source of truth; renderer imports from boundary file
- **WAL mode silently ignored for :memory: DB** — SQLite constraint; real-file databases use WAL correctly
- **Tailwind CSS 4 syntax** — uses @import 'tailwindcss' and @tailwindcss/vite plugin (no postcss.config needed)
- **Inline styles for panel slide animation** — avoids Tailwind JIT purge of dynamic class strings like translate-x-[-280px]
- **Google Fonts in dev, bundle in Phase 3** — Cinzel and Lora are OFL-licensed; bundling deferred to Phase 3
- **[ and ] keyboard shortcuts for panel toggle** — guarded against input/textarea/select focus
- **Port region as union type** — typed as 'greece' | 'levant' | 'egypt' | 'italy' | 'iberia' | 'north_africa' for type-safe filtering in 02-02 map and 02-03 trade panels
- **SailingState optional fields** — departurePortId and route are optional; preserves backward compat with existing FSM tests and serialized saves
- **getMarketPrices calculates price inline** — SQL query layer handles currentPrice calculation; economy.ts advancePortEconomy is for turn-advance loop (avoids N+1)
- **massalia region = 'italy'** — Marseille (ancient Massalia) trade sphere is Tyrrhenian, not Iberian
- **INSERT OR IGNORE seed pattern** — seedPorts/seedGoods/seedPortInventory called every app launch; zero cost after first run
- **react-leaflet-cluster not @react-leaflet/cluster** — @react-leaflet/cluster does not exist on npm; react-leaflet-cluster@4.0.0 is the correct package
- **leaflet.motion type cast** — no TS bindings; LeafletWithMotion type alias + side-effect import is the correct pattern for accessing L.motion.polyline
- **ShipMarker renders null JSX** — imperative Leaflet layer via useMap() + useEffect; children prop on MapArea is the correct React/Leaflet composition pattern
- **Buy stacks by port+price** — same good/port/price merges into one CargoItem; different port or price = separate stack for P&L granularity
- **FIFO sell across stacks** — sellGood drains oldest stacks first; entire stack removed if qty >= stack size
- **Trade mutates supply/demand** — buy decrements supply by 1 (MIN 1); sell decrements demand by 1 (MIN 1); repeated trading moves prices
- **broadcastGameUpdated helper** — extracted to standalone helper in game.ts; called after each trade to fan state to all BrowserWindows
- **CargoHold/ProfitDisplay always visible** — rendered in left panel regardless of port selection; player inventory always contextually relevant
- **pendingVoyageEvent module-level in IPC** — single-player game; cleared on each SET_SAIL; no DB persistence needed for mid-voyage state
- **Event roll inline in SET_SAIL handler** — if event fires, handler returns encountered state directly (no second round-trip needed)
- **EventCard no-escape blocking** — player must choose; no backdrop click / Escape key dismiss
- **culturalDescription optional on Port** — existing call sites need no changes; new consumers check presence
- **ALTER TABLE try/catch for column backfill** — SQLite has no IF NOT EXISTS for columns; try/catch in schema.ts is the idempotent upgrade pattern
- **INSERT OR IGNORE + UPDATE backfill in seedPorts** — covers both fresh installs and existing DBs with new columns
- **PortScene as absolute overlay over relative MapArea wrapper** — map stays in DOM; overlay removed on sail, avoiding Leaflet re-init
- **openRightPanel added to uiStore** — PortScene needs to open (not toggle) right panel; toggleRightPanel would close an already-open panel
- **TradingState.selectedPort synced into uiStore via useEffect in Shell** — FSM is single source of truth; uiStore is a reflection
- **Artifact thumbnail is additive above TradeGoodIcon row** — SVG icon stays as name/price row anchor; ArtifactImage renders above it when artifact data available
- **artifactMap.get(good.id)?.[0] pattern** — safe first-artifact access; TypeScript infers CachedArtifact | undefined without explicit cast
- **PortRegion exported as named type** — previously inlined in Port.region; exported from game-types.ts for consumer use in PortIllustration and PortScene
- **portRegions Map in Shell** — built alongside portCoords in same getPorts() call; zero extra IPC round-trips
- **SVG scene component pattern** — pure JSX SVG elements in sub-functions per region (GreeceScene, EgyptScene, etc.); same zero-dep pattern as TradeGoodIcon

### Pending Todos

None.

### Blockers/Concerns

- Phase 1: Native module compilation (better-sqlite3) CI workflow created but NOT yet triggered — needs GitHub remote configured and first push to validate on all 3 platforms
- Phase 2: Leaflet performance at realistic marker count (100+ ports + animated ship) needs profiling early in Phase 2, not deferred

## Session Continuity

Last session: 2026-03-12 15:38 UTC
Stopped at: Completed 03-05-PLAN.md (PortIllustration SVG scenes — gap closure plan)
Resume file: None

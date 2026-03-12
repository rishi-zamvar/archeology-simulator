# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-12)

**Core value:** Students learn ancient Mediterranean history by making decisions as a merchant captain, not by reading about them.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 3 (Foundation)
Plan: 3 of 3 in current phase
Status: Phase 1 complete
Last activity: 2026-03-12 — Completed 01-03-PLAN.md (parchment UI shell)

Progress: [███░░░░░░░] ~33% (3/9 plans estimated)

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 3.7 min
- Total execution time: 0.18 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | 11 min | 3.7 min |

**Recent Trend:**
- Last 5 plans: 01-01 (5 min), 01-02 (3 min), 01-03 (3 min)
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

### Pending Todos

None.

### Blockers/Concerns

- Phase 1: Native module compilation (better-sqlite3) CI workflow created but NOT yet triggered — needs GitHub remote configured and first push to validate on all 3 platforms
- Phase 2: Leaflet performance at realistic marker count (100+ ports + animated ship) needs profiling early in Phase 2, not deferred

## Session Continuity

Last session: 2026-03-12 14:04 UTC
Stopped at: Completed 01-03-PLAN.md
Resume file: None

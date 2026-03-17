# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Students learn ancient Mediterranean history by making decisions as a merchant captain, not by reading about them.
**Current focus:** v1.2 — Coding Hygiene

## Current Position

Phase: 7 — IPC Foundation
Plan: 01 of N (foundation utilities complete)
Status: In progress
Last activity: 2026-03-17 — Completed 07-01-PLAN.md (foundation utilities)

Progress: [████████████░░░░░░░░] 60% (v1.0 + v1.1 Phase 4 complete, 07-01 done)

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 13
- Phases: 3
- Timeline: 1 day

**v1.1 Velocity:**
- Total plans completed: 2
- Phases: 1 complete (Phase 4 done)

**v1.2 Velocity:**
- Total plans completed: 1
- Phases: 0 complete (Phase 7 in progress)

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions table for full history.

- v1.0: SVG port illustrations were a known compromise — v1.1 replaced them with real historical art
- v1.0: Met Museum API for artifact images — v1.1 added curated offline fallbacks
- v1.2: DBG-01 (structured logging) grouped with Phase 7 IPC Foundation rather than its own phase — depth=quick favors combining infrastructure work
- v1.2: ERR-03 (renderer-side error feedback) deferred to Phase 8 because it depends on the typed response shape from Phase 7 being in place first
- 07-01: IPCResponse<T> placed in shared/ipc-types.ts (not main-only) so renderer can reference the type for Phase 8
- 07-01: wrapHandler is the only place ipcMain.handle is called — handlers are pure async functions with no IPC coupling
- 07-01: Logger suppresses debug/info in NODE_ENV=test to keep test output clean

### Pending Todos

None.

### Blockers/Concerns

- CI workflow not yet triggered (needs GitHub remote + first push — low priority)
- v1.1 Phases 5-6 still pending — v1.2 phases depend on v1.1 being complete
- Pre-existing ShipMarker.tsx TypeScript errors (Leaflet MotionLayer type incompatibility) — unrelated to Phase 7, out of scope

## Session Continuity

Last session: 2026-03-17T10:01:39Z
Stopped at: Completed 07-01-PLAN.md (foundation utilities)
Resume file: None

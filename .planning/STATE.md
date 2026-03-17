# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Students learn ancient Mediterranean history by making decisions as a merchant captain, not by reading about them.
**Current focus:** v1.2 — Coding Hygiene

## Current Position

Phase: 7 — IPC Foundation
Plan: 04 of 04 (renderer IPCResponse unwrap complete)
Status: Phase 7 complete
Last activity: 2026-03-17 — Completed 07-04-PLAN.md (renderer IPCResponse unwrap)

Progress: [█████████████████░░░] 86% (v1.0 + v1.1 Phase 4 complete, Phase 7 complete)

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 13
- Phases: 3
- Timeline: 1 day

**v1.1 Velocity:**
- Total plans completed: 2
- Phases: 1 complete (Phase 4 done)

**v1.2 Velocity:**
- Total plans completed: 4
- Phases: 1 complete (Phase 7 done, all 4 plans)

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
- 07-02: game:load has no validator (no args); game:save uses isValidGameState as the validator function to keep guard logic in one place
- 07-02: getTransactionHistory has no validator — undefined limit is a valid value the underlying query handles with a default
- 07-02: game:getPendingEvent migrated despite accessing module-level state — pure getter with no side effects qualifies as simple handler
- 07-03: game:resolveEvent returns custom { success, outcome, message } — wrapHandler wraps it as IPCResponse<T>.data per contract
- 07-03: buyGood/sellGood validators enforce qty > 0 matching semantic requirements
- 07-03: Global process.on error handlers placed before app.whenReady() to catch initialization crashes
- 07-04: useGameState.updateGame returns IPCResponse<GameResult> so callers can check .success
- 07-04: Fire-and-forget action calls left with .catch() pattern (no unwrap needed for ignored results)

### Pending Todos

None.

### Blockers/Concerns

- CI workflow not yet triggered (needs GitHub remote + first push — low priority)
- v1.1 Phases 5-6 still pending — v1.2 phases depend on v1.1 being complete
- Pre-existing ShipMarker.tsx TypeScript errors (Leaflet MotionLayer type incompatibility) — unrelated to Phase 7, out of scope

## Session Continuity

Last session: 2026-03-17T10:17:24Z
Stopped at: Completed 07-04-PLAN.md (renderer IPCResponse unwrap — Phase 7 complete)
Resume file: None

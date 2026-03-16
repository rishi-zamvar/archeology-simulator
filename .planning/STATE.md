# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Students learn ancient Mediterranean history by making decisions as a merchant captain, not by reading about them.
**Current focus:** v1.1 — Phase 4: Image Infrastructure

## Current Position

Phase: 4 of 6 (Image Infrastructure)
Plan: 2 of 2 in current phase
Status: Phase 4 complete
Last activity: 2026-03-16 — Completed 04-02-PLAN.md (IPC wiring, preload, startup validation)

Progress: [██████████░░░░░░░░░░] 53% (v1.0 phases complete, Phase 4 complete)

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 13
- Phases: 3
- Timeline: 1 day

**v1.1 Velocity:**
- Total plans completed: 2
- Phases: 1 complete (Phase 4 done)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| v1.0 (1-3) | 13 | 1 day | — |
| v1.1 Phase 4 Plan 1 | 1 | 8 min | 8 min |
| v1.1 Phase 4 Plan 2 | 1 | 7 min | 7 min |

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions table for full history.

- v1.0: SVG port illustrations were a known compromise — v1.1 replaces them with real historical art
- v1.0: Met Museum API for artifact images was a known compromise — v1.1 adds curated offline fallbacks
- v1.1: IMG-03 requires user approval of every image before download (no autonomous sourcing)
- 04-01: LIMIT 5 for good images, LIMIT 3 for port images — matches Phase 6 renderer display budget
- 04-01: CHECK constraint at DB level guarantees no orphaned rows regardless of application code
- 04-01: Empty manifest (not placeholder entries) so Phase 5 controls all real content
- 04-02: fileExists attached inline on IPC response to avoid second renderer round-trip
- 04-02: Startup validation uses console.warn (non-fatal) since Phase 5 has not yet populated images

### Pending Todos

None.

### Blockers/Concerns

- Phase 5 is interactive/checkpoint-based — image sourcing must pause for user approval on each candidate before downloading
- CI workflow not yet triggered (needs GitHub remote + first push — low priority)
- Pre-existing ShipMarker.tsx TypeScript errors (MotionLayer interface mismatch) — not blocking but worth tracking

## Session Continuity

Last session: 2026-03-16
Stopped at: Completed 04-02-PLAN.md (Phase 4 fully complete)
Resume file: None

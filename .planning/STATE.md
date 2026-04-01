---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: "The Merchant's Odyssey"
status: ready_to_plan
last_updated: "2026-03-31"
last_activity: 2026-03-31
progress:
  total_phases: 8
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** Students learn ancient Mediterranean history by making decisions as a merchant captain, not by reading about them.
**Current focus:** Phase 13 - Infrastructure & Migration System

## Current Position

Phase: 13 of 20 (Infrastructure & Migration System)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-31 -- Roadmap created for v2.0 The Merchant's Odyssey

Progress: [░░░░░░░░░░] 0% (v2.0 milestone)

## Accumulated Context

### Decisions
- v1.0-v1.3 shipped successfully -- full gameplay loop, images, weather, journal, sailing animation, trade UX, title screen
- Turn = 1 Athenian calendar month, max 2-month voyage range
- Stamen Watercolor tiles for map (no modern roads)
- Sea routes curve around land via maritime waypoints
- [Roadmap]: Quest/NPC/reputation state in separate SQLite tables, not GameState JSON (Pitfall 1)
- [Roadmap]: Dialogue in JSON data files with build-time validation (Pitfall 2)
- [Roadmap]: Quest system observes game FSM -- no new GameState variants (Pitfall 6)
- [Roadmap]: Fog-of-knowledge for port unlocking -- sail anywhere, depth varies (Pitfall 3)
- [Roadmap]: Reputation modifies experience, never gates content (Pitfall 7)
- [Roadmap]: Version-based migration system before any new tables (Pitfall 4)

### Blockers/Concerns
- Pitfall 5: Content phases must cite sources for every historical claim. Quality over volume.
- Pitfall 8: Code and content interleaved to prevent building systems without content to test.

## Session Continuity

Last session: 2026-03-31
Stopped at: Roadmap created for v2.0 milestone
Resume file: None

---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: The Merchant's Odyssey
status: completed
stopped_at: Completed 17-02-PLAN.md
last_updated: "2026-04-01T18:28:03.038Z"
last_activity: 2026-04-01
progress:
  total_phases: 8
  completed_phases: 5
  total_plans: 12
  completed_plans: 12
  percent: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** Students learn ancient Mediterranean history by making decisions as a merchant captain, not by reading about them.
**Current focus:** Phase 17 — npc-characters-dialogue-content

## Current Position

Phase: 18
Plan: Not started
Status: Phase complete
Last activity: 2026-04-01

Progress: [▓░░░░░░░░░] 8% (v2.0 milestone)

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
- [13-01]: Migration runner with 7 ordered migrations replaces ad-hoc CREATE TABLE pattern
- [13-01]: PLAYER_DATA_TABLES constant exported for new-game reset (9 tables, excludes reference data)
- [13-01]: runMigrations exported separately for testability
- [Phase 13-02]: PLAYER_DATA_TABLES loop replaces hardcoded DELETE statements in new-game reset
- [Phase 14]: Composite conditions use $and/$or/$not JSON DSL for dialogue branching logic
- [Phase 14]: Validation function exported for unit testing; CLI guarded by argv check
- [Phase 14]: Dialogue files cached in module-level Map for performance
- [Phase 14]: NPC availability re-checked on dialogue dismiss (effects may change conditions)
- [Phase 15]: GameContext extended with currentPortId and recentTrades for quest objective evaluation
- [Phase 15]: talk_to_npc quest objective is stub returning false -- Phase 17 will wire NPC dialogue state
- [Phase 15]: evaluateActiveQuests is a plain exported function called after game actions, not an IPC handler
- [Phase 15]: buildGameContext exported from dialogue.ts for reuse by quest.ts
- [Phase 15]: Logbook uses tab bar (Journal/Quests) matching parchment theme; quest completion detected via active quest ID diff
- [Phase 16-02]: 5 historically accurate trade goods added with regional supply/demand patterns for all 25 ports
- [Phase 16]: Alexandria framed as proto-settlement Rhakotis for temporal accuracy at 540-530 BCE
- [Phase 16]: All port lore citations use real scholarly works: Herodotus, Aubet, Boardman, Braudel, Horden and Purcell
- [Phase 16]: Ambient description fetched via getPortDetails in PortScene rather than passed as prop from Shell
- [Phase 16]: 29 sea routes total (10 original + 19 new) with 6 new waypoints for land-avoidance
- [Phase 17]: Adapted quest goods to use existing IDs (grain, wine, olive_oil) since silver/cedar not in goods.json
- [Phase 17]: Fixed validator BFS to treat nodes with conditions as alternate entry points for dialogue state branching
- [Phase 17]: talk_to_npc objective evaluates npcDialogueState.timesSpoken > 0 via GameContext
- [Phase 17-02]: port_unlock uses ON CONFLICT with conditional UPDATE to only upgrade status, never downgrade

### Blockers/Concerns

- Pitfall 5: Content phases must cite sources for every historical claim. Quality over volume.
- Pitfall 8: Code and content interleaved to prevent building systems without content to test.

## Session Continuity

Last session: 2026-04-01T18:22:00Z
Stopped at: Completed 17-02-PLAN.md
Resume file: None

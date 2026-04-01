# Roadmap: Archeology Simulator

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped 2026-03-12)
- ✅ **v1.1 Integration** - Phases 4-6 (shipped 2026-03-31)
- ✅ **v1.2 Coding Hygiene** - Phases 7-8 (shipped 2026-03-31)
- ✅ **v1.3 Gameplay Depth & Polish** - Phases 9-12 (shipped 2026-04-01)
- 🚧 **v2.0 The Merchant's Odyssey** - Phases 13-20 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-3) - SHIPPED 2026-03-12</summary>
Fully playable ancient Mediterranean trade simulator with illustrated port scenes, museum artifact integration, ambient audio, and guided tutorial.
</details>

<details>
<summary>✅ v1.1 Integration (Phases 4-6) - SHIPPED 2026-03-31</summary>
57 curated historical images (25 ports + 32 trade goods) replacing all SVG placeholders and live Met API calls. Fully offline image content with attribution displays.
</details>

<details>
<summary>✅ v1.2 Coding Hygiene (Phases 7-8) - SHIPPED 2026-03-31</summary>
Consistent IPC contract with typed responses, structured logging, zero TypeScript errors, justified lint suppressions, and visible error feedback.
</details>

<details>
<summary>✅ v1.3 Gameplay Depth & Polish (Phases 9-12) - SHIPPED 2026-04-01</summary>
Seasonal weather with Athenian calendar, captain's journal with auto-logging, animated per-turn sailing, trade P&L indicators, and title screen.
</details>

### 🚧 v2.0 The Merchant's Odyssey (In Progress)

**Milestone Goal:** Transform the framework into a complete educational game where players live the life of a 6th century BCE merchant captain -- learning ancient Mediterranean history through a narrative quest spanning the entire sea.

- [x] **Phase 13: Infrastructure & Migration System** - Version-tracked DB migrations and new tables for quests, NPCs, reputation, and port status (completed 2026-04-01)
- [x] **Phase 14: Dialogue Engine & Content Pipeline** - JSON-driven dialogue system with condition evaluation, content templates, and build-time validation (completed 2026-04-01)
- [x] **Phase 15: Quest System Foundation** - Observer-pattern quest engine with separate persistence, quest FSM, and Piraeus starting quest (completed 2026-04-01)
- [ ] **Phase 16: Port Content & World Building** - Historically researched lore, trade specializations, and ambient descriptions for 10 ports
- [ ] **Phase 17: NPC Characters & Dialogue Content** - 5 key NPCs with portraits, historically grounded dialogue trees, and quest hooks at ports
- [ ] **Phase 18: Reputation & Trade Integration** - Reputation tracking with qualitative descriptors, price modifiers, and recovery paths
- [ ] **Phase 19: Progressive Port Unlocking** - Fog-of-knowledge discovery model with tiered port status and NPC-driven reveals
- [ ] **Phase 20: Journal Integration & Game Polish** - Quest/NPC journal entries with priority taxonomy, intro sequence, expanded events, and win condition

## Phase Details

### Phase 13: Infrastructure & Migration System
**Goal**: All v2.0 systems have reliable, versioned database tables and the new-game reset covers every player-data table
**Depends on**: Phase 12 (v1.3 complete)
**Requirements**: (none -- foundational infrastructure required by all v2.0 requirements)
**Success Criteria** (what must be TRUE):
  1. A schema_version table tracks the current DB version and migrations run in order on app startup
  2. New tables exist: quest_progress, npc_state, reputation, port_status -- each empty but correctly structured
  3. v1.3 save files load without errors and all new tables default correctly (no data loss)
  4. Starting a new game resets ALL player-data tables (including new ones) via a single PLAYER_DATA_TABLES list
**Plans**: 2 plans

Plans:
- [x] 13-01-PLAN.md -- Migration runner, new table types, 7 migrations (v1 baseline through v7 port_access), migration tests
- [x] 13-02-PLAN.md -- Consolidate new-game reset with PLAYER_DATA_TABLES, add db:schemaVersion IPC

### Phase 14: Dialogue Engine & Content Pipeline
**Goal**: NPCs can deliver branching, condition-gated dialogue loaded from JSON data files -- with build-time validation ensuring no broken references
**Depends on**: Phase 13
**Requirements**: NPC-02
**Success Criteria** (what must be TRUE):
  1. Dialogue is authored in JSON files (one per port) with nodes, choices, and condition predicates -- not in TypeScript code
  2. A dialogue engine (~200 lines) loads JSON, evaluates conditions (reputation, quest status, visited ports), and returns the correct next node
  3. A build-time validation script (npm run data:validate) catches broken node references, missing entity IDs, and orphaned terminal nodes
  4. A port content template defines minimum requirements per port (lore word count, NPC count, dialogue node count, source citations)
**Plans**: 2 plans

Plans:
- [x] 14-01-PLAN.md -- Pure dialogue engine, types, validation script, sample dialogue JSON, tests
- [x] 14-02-PLAN.md -- IPC handlers, preload bridge, DialogueModal UI, Shell wiring, human verification

### Phase 15: Quest System Foundation
**Goal**: Players can receive, track, and complete quests that observe game state without modifying the game FSM
**Depends on**: Phase 14
**Requirements**: QUEST-01, QUEST-02, QUEST-03
**Success Criteria** (what must be TRUE):
  1. Quest state is stored in the quest_progress SQLite table (not in GameState JSON) with status, progress, and timestamps
  2. The game FSM (idle/trading/sailing/encountered) has zero new state variants -- quests observe game actions via an event/observer pattern
  3. The Piraeus starting quest ("commission from an Athenian merchant house") is playable end-to-end: accept, fulfill objectives, complete
  4. Quests involve historically plausible merchant activities (deliver goods, source materials, negotiate deals) with no hard turn deadlines
**Plans**: 3 plans

Plans:
- [x] 15-01-PLAN.md -- Pure quest engine, types, data (Tyre port + pottery/purple_dye goods), unit tests
- [x] 15-02-PLAN.md -- Quest IPC handlers, game loop integration, preload bridge, integration tests
- [x] 15-03-PLAN.md -- Quest UI (Logbook tab + Shell indicator), human verification of full quest flow

### Phase 16: Port Content & World Building
**Goal**: Players experience historically rich, source-cited port content that teaches ancient Mediterranean culture through trade
**Depends on**: Phase 14
**Requirements**: PORT-01, PORT-02, PORT-03, PORT-04, POLISH-03
**Success Criteria** (what must be TRUE):
  1. 10 ports have full lore sections (100-200 words each) covering culture, customs, religion, daily life, and regional significance -- every historical claim cites a source
  2. Regional trade goods are historically accurate per port (Tyrian purple from Sidon, grain from Egypt, olive oil from Athens, etc.)
  3. Each port has ambient descriptions (sights, sounds, smells a merchant would experience) displayed on arrival
  4. Port content follows a consistent template with uniform depth, tone, and temporal framing (circa 540-530 BCE)
**Plans**: TBD
**UI hint**: yes

### Phase 17: NPC Characters & Dialogue Content
**Goal**: Players meet named NPCs who share historical knowledge, give quests, and reveal new trade routes through branching dialogue
**Depends on**: Phase 15, Phase 16
**Requirements**: NPC-01, NPC-03, NPC-04
**Success Criteria** (what must be TRUE):
  1. 5 key NPC characters exist with distinct personalities, historically grounded backstories, and portraits displayed during dialogue
  2. NPCs at ports give quests, share educational lore, and reveal previously unknown ports through conversation
  3. NPC dialogue branches based on quest state, reputation, and visited ports -- with at least 5 dialogue nodes per NPC
  4. Every NPC dialogue reference to a port, good, or quest is validated by the build-time validation script
**Plans**: TBD
**UI hint**: yes

### Phase 18: Reputation & Trade Integration
**Goal**: Players build trade reputation that modifies their experience without ever gating required content
**Depends on**: Phase 15, Phase 16
**Requirements**: REP-01, REP-02, REP-03
**Success Criteria** (what must be TRUE):
  1. Reputation increases through successful trades and quest completion, displayed as qualitative descriptors ("Stranger" to "Proxenos") not raw numbers
  2. Higher reputation yields better trade prices (percentage modifier, capped at +/-20%, prices floored at 1g)
  3. Reputation NEVER gates required content -- low reputation means higher prices and grumpier NPCs, not locked doors
  4. A recovery path exists for every possible reputation state (no unrecoverable dead ends)
**Plans**: TBD
**UI hint**: yes

### Phase 19: Progressive Port Unlocking
**Goal**: Players discover the Mediterranean progressively through trade reputation and NPC introductions, with a fog-of-knowledge model that preserves the open-world feel
**Depends on**: Phase 17, Phase 18
**Requirements**: UNLOCK-01, UNLOCK-02, UNLOCK-03
**Success Criteria** (what must be TRUE):
  1. New games start with Piraeus + 2-4 nearby ports unlocked; remaining ports are "discovered" (visible, basic trading) or "unknown" (shown on map but unexplored)
  2. Port unlocking is earned through reputation thresholds, quest progress, or NPC referrals -- never arbitrary
  3. Locked/unknown ports are visible on the map with a distinct visual treatment (not hidden) -- players can sail anywhere but get a limited experience at undiscovered ports
  4. v1.3 saves treat all 25 existing ports as unlocked; new v2.0 ports default to "unknown"
**Plans**: TBD
**UI hint**: yes

### Phase 20: Journal Integration & Game Polish
**Goal**: The game feels complete -- journal captures the narrative journey, intro sets the scene, events are richer, and the odyssey has a satisfying conclusion
**Depends on**: Phase 17, Phase 18, Phase 19
**Requirements**: JRNL-01, JRNL-02, JRNL-03, QUEST-04, POLISH-01, POLISH-02
**Success Criteria** (what must be TRUE):
  1. Quest events, NPC conversations, and story milestones are logged in the captain's journal with a priority taxonomy (narrative/quest/mechanical) -- no more than 3 entries per port visit
  2. Educational "discoveries" (first time learning about a culture or trade good) are recorded as visually distinct journal entries
  3. The journal reads as a personal history record of the merchant's odyssey by end of game
  4. An intro sequence at Piraeus sets the scene and introduces the story before gameplay begins
  5. A win condition exists: completing the merchant's odyssey triggers a satisfying conclusion sequence
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 13 -> 14 -> 15 -> 16 -> 17 -> 18 -> 19 -> 20

Note: Phase 15 and Phase 16 can proceed in parallel after Phase 14 completes. Phase 17 and Phase 18 can proceed in parallel after their dependencies complete.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 13. Infrastructure & Migration System | v2.0 | 2/2 | Complete    | 2026-04-01 |
| 14. Dialogue Engine & Content Pipeline | v2.0 | 2/2 | Complete    | 2026-04-01 |
| 15. Quest System Foundation | v2.0 | 3/3 | Complete   | 2026-04-01 |
| 16. Port Content & World Building | v2.0 | 0/TBD | Not started | - |
| 17. NPC Characters & Dialogue Content | v2.0 | 0/TBD | Not started | - |
| 18. Reputation & Trade Integration | v2.0 | 0/TBD | Not started | - |
| 19. Progressive Port Unlocking | v2.0 | 0/TBD | Not started | - |
| 20. Journal Integration & Game Polish | v2.0 | 0/TBD | Not started | - |

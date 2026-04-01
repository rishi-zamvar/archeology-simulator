# Roadmap: Archeology Simulator

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped 2026-03-12)
- ✅ **v1.1 Integration** - Phases 4-6 (shipped 2026-03-31)
- ✅ **v1.2 Coding Hygiene** - Phases 7-8 (shipped 2026-03-31)
- ✅ **v1.3 Gameplay Depth & Polish** - Phases 9-12 (shipped 2026-04-01)
- ✅ **v2.0 The Merchant's Odyssey** - Phases 13-20 (shipped 2026-04-01)
- ✅ **v2.0.1 Polish & Stabilization** - Phases 21-23 (shipped 2026-04-01)
- 🚧 **v2.1 Immersion & Polish** - Phases 24-29 (in progress)

## Phases

<details>
<summary>✅ v2.0.1 Polish & Stabilization (Phases 21-23) - SHIPPED 2026-04-01</summary>

### Phase 21: Test Stabilization & Code Cleanup
**Goal**: All tests pass, TypeScript clean, dead code removed, logic simplified
**Depends on**: Phase 20 (v2.0 complete)
**Requirements**: TEST-01, TEST-02, TEST-03, CLEAN-01, CLEAN-02, CLEAN-03
**Success Criteria** (what must be TRUE):
  1. `npx vitest run` exits with 0 failures
  2. `npx tsc --noEmit` produces zero errors
  3. No `any` casts in production code (tests exempted)
  4. No unused imports or dead functions detected by linter
**Plans**: Complete

### Phase 22: Game Flow Validation
**Goal**: End-to-end game flow works reliably without crashes or broken state
**Depends on**: Phase 21
**Requirements**: TEST-04, FLOW-01, FLOW-02, FLOW-03, FLOW-04
**Success Criteria** (what must be TRUE):
  1. New Game -> intro -> Piraeus -> buy pottery -> sail to Tyre -> arrive completes without errors
  2. Sailing animation shows correct route from departure port to destination with smooth motion
  3. Double-click skip arrives at destination without V8 crash
  4. Quest objectives advance correctly on trade/arrival/dialogue actions
  5. Port neighbors unlock on arrival and map markers update
**Plans**: Complete

### Phase 23: UI Polish & Immersion
**Goal**: The game looks and feels polished -- smooth transitions, better layouts, immersive design
**Depends on**: Phase 22
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. Screen transitions (title->intro->game, port->sailing->port) use CSS fade/slide animations
  2. Trade panel images have consistent aspect ratios with rounded corners and proper spacing
  3. Port info panel has clear typography hierarchy with comfortable reading spacing
  4. Dialogue modal shows NPC portrait at proper size with balanced text layout
  5. Sailing overlay is clearly visible without obstructing the map
  6. Quest panel has polished status badges and clear visual hierarchy
**Plans**: Complete

</details>

### 🚧 v2.1 Immersion & Polish (In Progress)

**Milestone Goal:** Make the game feel alive -- every port has its own atmosphere, every action has satisfying feedback, and the world responds to the player's journey.

- [x] **Phase 24: Animation & Effects** - Typewriter dialogue, wax seals, parchment unfurls, coin animations, screen transitions (completed 2026-04-01)
- [x] **Phase 25: Visual Immersion** - Parallax port scenes, ambient particles, day/night tinting, fog discovery, vignette borders (completed 2026-04-01)
- [x] **Phase 26: Audio Atmosphere** - Port-specific ambience, sailing sounds, UI sound effects (completed 2026-04-01)
- [ ] **Phase 27: Ship & Crew** - Hull wear and repair, crew morale system
- [ ] **Phase 28: World Events & Collectibles** - NPC trade rumors, seasonal festivals, historical postcards
- [ ] **Phase 29: Narrative & Memory** - NPC memory of trades, port gossip network, ending epilogue

## Phase Details

### Phase 24: Animation & Effects
**Goal**: Every interaction has satisfying visual feedback -- text animates, panels unfurl, trades sparkle, and state changes flow smoothly
**Depends on**: Phase 23
**Requirements**: FX-01, FX-02, FX-03, FX-04, FX-05
**Success Criteria** (what must be TRUE):
  1. NPC dialogue text appears character-by-character with a visible typewriter cadence
  2. Completing a quest plays a wax seal stamp animation before showing the completion toast
  3. Opening the Harbor or Market panel plays a parchment unfurl/tear animation
  4. Completing a trade shows gold coins counting up or cascading visually
  5. Transitioning between all game states (title, intro, port, sailing, event, conclusion) uses smooth CSS animations with no jarring cuts
**Plans**: TBD
**UI hint**: yes

### Phase 25: Visual Immersion
**Goal**: Port scenes feel like living paintings -- depth, atmosphere, and discovery reward the player's eyes
**Depends on**: Phase 24
**Requirements**: VIS-01, VIS-02, VIS-03, VIS-04, VIS-05
**Success Criteria** (what must be TRUE):
  1. Moving the mouse over a port scene causes foreground elements to shift subtly, creating parallax depth
  2. Each port displays ambient particles appropriate to its setting (dust in Egypt, fireflies in Greek harbors, seagulls at coastal ports)
  3. The port scene tint shifts based on the current turn/season -- golden hour, dusk purple, bright midday
  4. Discovering a new port on the map plays a parchment-burn fog reveal animation
  5. Port scenes display a dark vignette border evoking a ship's porthole view
**Plans**: TBD
**UI hint**: yes

### Phase 26: Audio Atmosphere
**Goal**: The game has a distinct soundscape -- ports sound different from each other, sailing feels immersive, and UI actions have tactile audio feedback
**Depends on**: Phase 24
**Requirements**: AUD-01, AUD-02, AUD-03
**Success Criteria** (what must be TRUE):
  1. Arriving at different ports plays distinct ambient sound loops (marketplace chatter at Athens, harbor bells at Ostia, waves at coastal ports)
  2. Sailing between ports plays creaking wood, wave, and wind sounds with intensity varying by weather and season
  3. Trading plays a coin clink, opening panels plays a parchment unfurl sound, and writing journal entries plays a quill scratch sound
**Plans**: TBD

### Phase 27: Ship & Crew
**Goal**: The ship and crew are living systems the player must manage -- neglect leads to consequences, care leads to advantages
**Depends on**: Phase 24
**Requirements**: GAME-03, GAME-04
**Success Criteria** (what must be TRUE):
  1. Hull condition visibly degrades over voyages and the player can see the current hull percentage
  2. Arriving at a port with low hull condition offers a repair option that costs gold and restores hull
  3. Crew morale changes based on successful trades (up), long voyages (down), and random events (up or down)
  4. Morale level affects gameplay -- high morale grants bonuses, low morale triggers negative events or trade penalties
**Plans**: TBD
**UI hint**: yes

### Phase 28: World Events & Collectibles
**Goal**: The world feels dynamic and rewarding -- NPCs offer useful intel, seasons bring festivals, and exploration unlocks collectibles
**Depends on**: Phase 27
**Requirements**: GAME-01, GAME-02, GAME-05
**Success Criteria** (what must be TRUE):
  1. NPCs at ports occasionally share trade rumors hinting at price opportunities ("Silver is cheap in Iberia this season")
  2. Seasonal festivals occur at historically appropriate ports and visibly affect local trade prices
  3. Arriving at a new port for the first time unlocks a historical postcard illustration viewable in the journal
**Plans**: TBD
**UI hint**: yes

### Phase 29: Narrative & Memory
**Goal**: The world remembers the player and the journey ends with a personalized historical narrative
**Depends on**: Phase 28
**Requirements**: NAR-01, NAR-02, NAR-03
**Success Criteria** (what must be TRUE):
  1. NPCs remember the player's previous trades at their port and comment on them in dialogue ("You brought fine pottery last time")
  2. NPCs share gossip about events at other ports the player has visited ("I heard there was a storm near Crete")
  3. The ending epilogue presents a narrated summary weaving the player's journey stats (ports visited, goods traded, gold earned) into a historical narrative
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:** Phases 24-29 in sequence. Phase 25 and 26 can proceed in parallel after Phase 24.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 21. Test Stabilization | v2.0.1 | Complete | Complete | 2026-04-01 |
| 22. Game Flow | v2.0.1 | Complete | Complete | 2026-04-01 |
| 23. UI Polish | v2.0.1 | Complete | Complete | 2026-04-01 |
| 24. Animation & Effects | v2.1 | 0/? | Complete    | 2026-04-01 |
| 25. Visual Immersion | v2.1 | 0/? | Complete    | 2026-04-01 |
| 26. Audio Atmosphere | v2.1 | 0/? | Complete    | 2026-04-01 |
| 27. Ship & Crew | v2.1 | 0/? | Not started | - |
| 28. World Events & Collectibles | v2.1 | 0/? | Not started | - |
| 29. Narrative & Memory | v2.1 | 0/? | Not started | - |

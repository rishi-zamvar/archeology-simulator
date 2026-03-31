# Roadmap: Archeology Simulator

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped 2026-03-16)
- ✅ **v1.1 Integration & macOS Polish** - Phases 4-6 (shipped 2026-03-31)
- ✅ **v1.2 Coding Hygiene** - Phases 7-8 (shipped 2026-03-31)
- 🚧 **v1.3 Gameplay Depth & Polish** - Phases 9-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-3) - SHIPPED 2026-03-16</summary>

### Phase 1: Foundation
**Goal**: Project scaffolded and runnable
**Plans**: 4 plans (complete)

### Phase 2: Core Gameplay
**Goal**: Full trade loop playable end-to-end
**Plans**: 5 plans (complete)

### Phase 3: Polish & Packaging
**Goal**: Game shippable with audio, tutorial, and Electron packaging
**Plans**: 4 plans (complete)

</details>

---

<details>
<summary>✅ v1.1 Integration & macOS Polish (Phases 4-6) - SHIPPED 2026-03-31</summary>

See [v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md) for full details.

</details>

<details>
<summary>✅ v1.2 Coding Hygiene (Phases 7-8) - SHIPPED 2026-03-31</summary>

See [v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md) for full details.

</details>

---

### 🚧 v1.3 Gameplay Depth & Polish (In Progress)

**Milestone Goal:** Deepen gameplay with seasonal weather affecting voyages, a persistent captain's journal, polished sailing animations with visible ship movement, and trade profit/loss feedback -- turning the simulator from a functional loop into a richer educational experience.

- [ ] **Phase 9: Seasonal Weather System** - Pure game logic deriving season from turn and modifying voyage duration/events
- [ ] **Phase 10: Captain's Journal** - SQLite-backed journal with auto-logged trades, events, and player reflections
- [ ] **Phase 11: Sailing Animation Polish** - Visible ship movement on map with route line, camera tracking, and voyage overlay
- [ ] **Phase 12: Trade UX & Title Screen** - Profit/loss indicators on trade panel and entry screen for the game

## Phase Details

### Phase 9: Seasonal Weather System
**Goal**: Players experience historically grounded seasonal variation that affects voyage planning decisions
**Depends on**: Phase 8 (v1.2 complete)
**Requirements**: WX-01, WX-02, WX-03, WX-04
**Success Criteria** (what must be TRUE):
  1. Player can see the current season (spring/summer/autumn/winter) displayed in the game UI
  2. Voyages take noticeably longer in winter and shorter in summer
  3. Storm events occur more frequently during winter voyages than summer voyages
  4. Player sees a mare clausum warning before departing during dangerous winter months
  5. Existing v1.2 save files load without errors after the weather system is added
**Plans**: 3 plans

Plans:
- [x] 09-01-PLAN.md — weather.ts pure functions + TDD tests (WX-01 through WX-04)
- [x] 09-02-PLAN.md — seasonal event weights + voyage duration IPC wiring (WX-02, WX-03)
- [x] 09-03-PLAN.md — season header display, mare clausum modal, logbook seasonal text (WX-01, WX-04)

### Phase 10: Captain's Journal
**Goal**: Players build a persistent historical record of their trading career that survives restarts
**Depends on**: Phase 9 (weather system provides seasonal context for journal entries)
**Requirements**: JRN-01, JRN-02, JRN-03, JRN-04, JRN-05
**Success Criteria** (what must be TRUE):
  1. Journal entries persist across app restart and save/load cycles
  2. Completing a trade automatically creates a journal entry showing goods, quantities, prices, and port
  3. Voyage events (storms, encounters, decisions) automatically appear in the journal with outcomes
  4. Port arrivals and departures are logged with in-game calendar dates
  5. Player can write and save personal notes/reflections in the journal
**Plans**: 3 plans

Plans:
- [ ] 10-01-PLAN.md — SQLite schema, types, query functions, IPC handlers, preload bridge (JRN-01, JRN-05)
- [ ] 10-02-PLAN.md — Auto-log trades, events, arrivals, departures into journal (JRN-02, JRN-03, JRN-04)
- [ ] 10-03-PLAN.md — Refactor Logbook.tsx to DB-backed journal with note input (JRN-01, JRN-05)

### Phase 11: Sailing Animation Polish
**Goal**: Players see their ship physically move between ports on the map during voyages
**Depends on**: Phase 9 (weather system provides duration modifiers and overlay content)
**Requirements**: SAIL-01, SAIL-02, SAIL-03, SAIL-04, SAIL-05
**Success Criteria** (what must be TRUE):
  1. A visible dashed route line appears on the map showing the path between origin and destination
  2. Ship animation takes longer for distant ports and shorter for nearby ports
  3. Map camera smoothly follows the ship during the sailing animation
  4. A sailing overlay displays voyage progress, estimated arrival, and current weather conditions
  5. Time passes visibly during the voyage with each time unit triggering an event (including uneventful sailing)
**Plans**: 3 plans

Plans:
- [ ] 11-01: TBD
- [ ] 11-02: TBD

### Phase 12: Trade UX & Title Screen
**Goal**: Players see profit/loss before confirming trades and encounter a proper entry screen when launching the game
**Depends on**: Phase 10 (journal records trade history for cohesion with profit display)
**Requirements**: TRD-01, TRD-02, TRD-03, UI-01
**Success Criteria** (what must be TRUE):
  1. Each cargo item in the trade panel shows a green/red profit/loss indicator per unit before the player confirms a sale
  2. Total profit/loss preview updates as the player adjusts the quantity being sold
  3. Player can see where and when each cargo item was originally purchased
  4. Launching the game shows a title screen with game description, new game button, and continue button (if a save exists)
**Plans**: 3 plans

Plans:
- [ ] 12-01: TBD
- [ ] 12-02: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 4/4 | Complete | 2026-03-12 |
| 2. Core Gameplay | v1.0 | 5/5 | Complete | 2026-03-12 |
| 3. Polish & Packaging | v1.0 | 4/4 | Complete | 2026-03-16 |
| 4. Image Sourcing | v1.1 | 3/3 | Complete | 2026-03-31 |
| 5. Image Integration | v1.1 | 3/3 | Complete | 2026-03-31 |
| 6. Dead Code Removal | v1.1 | 2/2 | Complete | 2026-03-31 |
| 7. IPC & Logging | v1.2 | 3/3 | Complete | 2026-03-31 |
| 8. TypeScript & Error UX | v1.2 | 2/2 | Complete | 2026-03-31 |
| 9. Seasonal Weather | v1.3 | 1/3 | In Progress|  |
| 10. Captain's Journal | v1.3 | 0/3 | Not started | - |
| 11. Sailing Animation | v1.3 | 0/? | Not started | - |
| 12. Trade UX & Title Screen | v1.3 | 0/? | Not started | - |

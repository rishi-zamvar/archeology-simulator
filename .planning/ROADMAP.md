# Roadmap: Archeology Simulator

## Overview

Build a turn-based ancient Mediterranean trade simulator as an Electron + React desktop app. Three phases deliver the project: Foundation establishes the cross-platform infrastructure and secure IPC bridge; Core Loop implements the game engine, map, trade mechanics, and turn system so the game is playable; Port Experience adds illustrated port scenes, museum artifact images, audio, and a guided tutorial so the educational experience is complete and shippable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Cross-platform Electron shell with IPC bridge, SQLite persistence, and parchment UI skeleton
- [ ] **Phase 2: Core Loop** - Playable game with Leaflet map, turn-based navigation, trade mechanics, ship inventory, and voyage events
- [ ] **Phase 3: Port Experience** - Illustrated port scenes, museum artifact images, ambient audio, and guided tutorial

## Phase Details

### Phase 1: Foundation
**Goal**: A cross-platform Electron + React app boots, persists data to SQLite, and communicates safely between main and renderer processes
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, UI-01, UI-02, UI-04, SAVE-01, SAVE-02
**Success Criteria** (what must be TRUE):
  1. App launches on macOS, Windows, and Linux from a GitHub release installer
  2. App displays a parchment-themed shell with correct fonts and warm sepia palette
  3. Game auto-saves state to SQLite on each turn and resumes correctly on next launch
  4. Renderer can invoke game actions via IPC and receive updated state back without direct Node access
**Plans**: TBD

Plans:
- [ ] 01-01: Electron + Vite + React scaffold with Electron Forge packaging and CI for all three platforms
- [ ] 01-02: SQLite schema, migrations, save/load IPC handlers, and auto-save wiring
- [ ] 01-03: Parchment UI shell — Tailwind theme, period fonts, side-panel layout, accessibility baseline

### Phase 2: Core Loop
**Goal**: Players can sail between historically accurate Mediterranean ports, buy and sell goods, manage cargo, and encounter voyage events — the game is fully playable
**Depends on**: Phase 1
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-04, MAP-05, TRADE-01, TRADE-02, TRADE-03, TRADE-04, TRADE-05, SHIP-01, SHIP-02, SHIP-03, TURN-01, TURN-02, TURN-03, TURN-04, TURN-05
**Success Criteria** (what must be TRUE):
  1. Leaflet map displays the Mediterranean with parchment tile overlay, 20-30 labeled ports with ancient names, and is pannable and clickable
  2. Player can click a port to see its info panel and navigate to 3-5 reachable destinations with distance and risk info
  3. Player can buy goods at one port and sell at another, with prices that fluctuate based on supply and demand
  4. Player can see their cargo hold, remaining capacity, profit/loss display, and transaction history at all times
  5. Voyage events (storms, pirates, calm seas) appear as decision cards during transit and affect the journey outcome
**Plans**: TBD

Plans:
- [ ] 02-01: GameEngine — turn-based FSM, command pattern, IPC action handlers, and port/route navigation logic
- [ ] 02-02: Leaflet map with parchment tiles, port markers, ship route animation, and click-to-navigate flow
- [ ] 02-03: Trade system — supply/demand simulation, buy/sell UI, inventory with cargo limit, profit/loss display, currency notes
- [ ] 02-04: Voyage events — hand-written event database (20-30 events), decision card UI, consequence application

### Phase 3: Port Experience
**Goal**: Arriving at a port is an illustrated, historically rich scene with museum artifacts, ambient sound, and new players are guided through their first voyage
**Depends on**: Phase 2
**Requirements**: PORT-01, PORT-02, PORT-03, PORT-04, TUT-01, TUT-02, UI-03
**Success Criteria** (what must be TRUE):
  1. Arriving at a port shows a public domain historical illustration with clickable market and harbor elements that open side panels
  2. Port side panels show student-accessible cultural descriptions sourced from academic text
  3. Trade goods display museum artifact images from Met/British Museum APIs with Wikimedia fallback
  4. Ambient Mediterranean audio and event sound effects play throughout the game
  5. A new player can complete a guided first voyage that teaches map navigation, buying/selling, and sailing — and can skip it
**Plans**: TBD

Plans:
- [ ] 03-01: Port scene — public domain illustrations, clickable elements, side-panel layout, cultural descriptions
- [ ] 03-02: Museum API integration — Met/British Museum artifact images, Wikimedia fallback, caching, rate-limit handling
- [ ] 03-03: Audio + tutorial — Howler.js ambient and event sounds, guided first-voyage tutorial with skip option

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Not started | - |
| 2. Core Loop | 0/4 | Not started | - |
| 3. Port Experience | 0/3 | Not started | - |

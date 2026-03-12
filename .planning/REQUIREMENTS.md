# Requirements: Archeology Simulator

**Defined:** 2026-03-12
**Core Value:** Students learn ancient Mediterranean history by making decisions as a merchant captain, not by reading about them.

## v1 Requirements

### Map & Navigation (MAP)

- [ ] **MAP-01**: Interactive Leaflet map displays the Mediterranean with parchment-style tile overlay (sepia filter, texture)
- [ ] **MAP-02**: ~20-30 ports plotted at historically accurate coordinates sourced from Pleiades gazetteer
- [ ] **MAP-03**: Ports display ancient names as primary labels with modern names in parentheses (e.g., "Massalia (Marseille)")
- [ ] **MAP-04**: Player can click a port to see its info panel (name, description, available goods, cultural context)
- [ ] **MAP-05**: At each port, app shows 3-5 reachable destinations with distance and basic risk info

### Trade & Economy (TRADE)

- [ ] **TRADE-01**: Each port produces and consumes specific goods based on historical trade patterns (wheat from Egypt, wine from Greece, purple dye from Phoenicia, copper from Cyprus)
- [ ] **TRADE-02**: Player can buy and sell goods at each port with visible prices
- [ ] **TRADE-03**: Prices fluctuate based on supply/demand simulation with historical exchange ratios as baseline
- [ ] **TRADE-04**: Player has a running profit/loss display and transaction history
- [ ] **TRADE-05**: Currency/barter differences by region are reflected in trade UI (informational)

### Ship & Inventory (SHIP)

- [ ] **SHIP-01**: Player has a ship with cargo capacity limit — must decide what to carry
- [ ] **SHIP-02**: Inventory UI shows current cargo, remaining space, and value of goods
- [ ] **SHIP-03**: Ship has basic stats: speed and cargo capacity (one ship type for v1)

### Turn System (TURN)

- [ ] **TURN-01**: Game is turn-based — each turn the player sails from one port to another
- [ ] **TURN-02**: Player picks a start year in the 600-900 BCE range; time advances based on voyage distance
- [ ] **TURN-03**: Ship animates along the route on the map between ports
- [ ] **TURN-04**: Voyage events (storms, pirates, calm seas) can interrupt travel with decision cards showing choices and consequences
- [ ] **TURN-05**: Hand-written event database with ~20-30 historically grounded events for v1

### Port Experience (PORT)

- [ ] **PORT-01**: Arriving at a port shows a curated public domain historical illustration with clickable elements (market, harbor)
- [ ] **PORT-02**: Side panels slide in for marketplace, port info, and cultural description
- [ ] **PORT-03**: Cultural descriptions pulled from academic sources and rewritten for student accessibility
- [ ] **PORT-04**: Museum artifact images from Met/British Museum APIs displayed for trade goods, with Wikimedia fallback

### Persistence (SAVE)

- [ ] **SAVE-01**: Game auto-saves state to SQLite on every turn
- [ ] **SAVE-02**: Player can resume from where they left off on next launch

### Tutorial (TUT)

- [ ] **TUT-01**: Guided first voyage teaching map navigation, buying/selling, and sailing
- [ ] **TUT-02**: Tutorial is skippable

### UI & Audio (UI)

- [ ] **UI-01**: Parchment/ancient aesthetic throughout — warm sepia tones, period-appropriate fonts, no modern UI chrome
- [ ] **UI-02**: Side panel layout — map fills screen, info panels slide in from sides
- [ ] **UI-03**: Ambient Mediterranean audio and sound effects (sailing, port bustle, events) — public domain/CC licensed
- [ ] **UI-04**: Accessible UI: clear buttons, readable fonts, works on standard school hardware

### Infrastructure (INFRA)

- [ ] **INFRA-01**: Packaged as Electron app with installers for macOS, Windows, and Linux
- [ ] **INFRA-02**: Distributed via GitHub releases
- [ ] **INFRA-03**: JSON files for static reference data (ports, goods, events); SQLite for game state
- [ ] **INFRA-04**: Critical images bundled with app; supplementary images cached on first load
- [ ] **INFRA-05**: Game engine runs in Electron main process; React UI in renderer communicates via IPC

## v1.1 Requirements (Post-Validation)

### Seasonal & Weather

- **SEASON-01**: Seasonal sailing system — winter is deadly, summer opens routes, spring/fall transitional
- **SEASON-02**: Weather data adapted from real Mediterranean weather API with ancient context
- **SEASON-03**: Season visually indicated on map and affects available routes

### Political Factions

- **FACTION-01**: Greek, Phoenician, Etruscan, Egyptian factions with dynamic relationships
- **FACTION-02**: Faction reputation system — player behavior affects reception at faction ports
- **FACTION-03**: Wars/embargoes between factions affect port access and prices

### Ship Progression & Crew

- **SHIP-V2-01**: Historical ship progression — ship types unlock as in-game years advance
- **SHIP-V2-02**: Ship upgrade stats: speed, cargo capacity, crew requirement, storm resistance
- **CREW-01**: Crew count + morale bar, food/water supplies
- **CREW-02**: Crew mutiny risk if underfed or overworked

### Advanced Systems

- **NAV-01**: Star navigation and coastal landmark system improving with exploration
- **FEST-01**: Religious/festival events creating demand spikes and safe passage windows
- **CHAIN-01**: Commodity chains (copper + tin = bronze) with combination mechanics
- **REP-01**: Port reputation tracking — cheating a trader has lasting consequences
- **JOURNAL-01**: Captain's journal recording discoveries, encounters, and trade history

## v2 Requirements

- **TEACH-01**: Teacher dashboard/analytics for classroom use
- **MULTI-01**: Multiplayer co-op trading discussions
- **SCENARIO-01**: Historical scenarios with specific constraints
- **ADV-ECON-01**: Advanced economy modeling (inflation, banking, lending)
- **I18N-01**: Internationalization support

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI-generated imagery | Authenticity is core — real artifacts and public domain art only |
| Real-time gameplay | Turn-based enables classroom pacing and reflection |
| Mobile/tablet versions | Desktop Electron only for v1 |
| Procedural port generation | Loses historical anchoring; curated ports teach geography |
| Full ship customization | Scope explosion; distracts from trade learning |
| NPC AI competitors | Hard to balance; students blame game not strategy |
| Achievement/trophy system | Distracts from learning goals |
| Character leveling/XP | Confuses game mechanic with learning outcome |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MAP-01 | Phase 2 | Complete |
| MAP-02 | Phase 2 | Complete |
| MAP-03 | Phase 2 | Complete |
| MAP-04 | Phase 2 | Complete |
| MAP-05 | Phase 2 | Complete |
| TRADE-01 | Phase 2 | Complete |
| TRADE-02 | Phase 2 | Complete |
| TRADE-03 | Phase 2 | Complete |
| TRADE-04 | Phase 2 | Complete |
| TRADE-05 | Phase 2 | Complete |
| SHIP-01 | Phase 2 | Complete |
| SHIP-02 | Phase 2 | Complete |
| SHIP-03 | Phase 2 | Complete |
| TURN-01 | Phase 2 | Complete |
| TURN-02 | Phase 2 | Complete |
| TURN-03 | Phase 2 | Complete |
| TURN-04 | Phase 2 | Complete |
| TURN-05 | Phase 2 | Complete |
| PORT-01 | Phase 3 | Pending |
| PORT-02 | Phase 3 | Pending |
| PORT-03 | Phase 3 | Pending |
| PORT-04 | Phase 3 | Pending |
| SAVE-01 | Phase 1 | Complete |
| SAVE-02 | Phase 1 | Complete |
| TUT-01 | Phase 3 | Pending |
| TUT-02 | Phase 3 | Pending |
| UI-01 | Phase 1 | Complete |
| UI-02 | Phase 1 | Complete |
| UI-03 | Phase 3 | Pending |
| UI-04 | Phase 1 | Complete |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 — Phase 2 requirements marked Complete (28/35)*

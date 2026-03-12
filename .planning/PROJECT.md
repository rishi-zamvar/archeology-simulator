# Archeology Simulator

## What This Is

A turn-based ancient Mediterranean trade simulator where the player is a merchant captain sailing between ports in 600-900 BCE. Built as an Electron + React desktop app aimed at students and educators, it combines historically grounded gameplay with real museum artifacts, academic source data, and dynamic economic/political systems to teach ancient history through interactive decision-making. Think Oregon Trail meets ancient Mediterranean commerce.

## Core Value

Students learn ancient Mediterranean history — trade networks, cultures, geography, politics, and daily life — by making decisions as a merchant captain, not by reading about them.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Interactive parchment-styled map (Leaflet + styled OSM tiles with sepia/texture overlay) showing the full Mediterranean with ancient port locations
- [ ] Turn-based gameplay: each turn = one voyage leg (port to port), with events occurring during transit
- [ ] Player picks a start year (600-900 BCE range) and time advances dynamically as voyages progress
- [ ] Seasonal sailing system: winter sailing is deadly, summer opens routes, spring/fall are transitional — forces strategic planning
- [ ] Oregon Trail-style voyage events: storms, pirates, disease, crew morale — pop up as decision cards during transit with choices and consequences
- [ ] Ship animation along routes on the Leaflet map with event card interruptions during voyage
- [ ] Port arrival: illustrated scene (public domain historical art) with clickable elements — market, temple, harbor — that open side panels
- [ ] Trade system with historical exchange ratios as baseline + dynamic supply/demand per port per session
- [ ] Commodity chains: copper + tin = bronze, understanding material relationships matters for profit
- [ ] ~40-60 historically accurate ports across Greek mainland/islands, Cyprus/Levant, North Africa/Egypt, Italy/Western Med
- [ ] Port data sourced from Pleiades gazetteer and academic databases (Perseus Digital Library) for coordinates and base info
- [ ] Ancient port names as primary labels (e.g., Massalia, Kition) with modern names in parentheses
- [ ] Cultural descriptions pulled from academic sources (Pleiades, Perseus) and rewritten for student-accessible reading level
- [ ] Museum artifact images from Met Museum + British Museum open APIs, supplemented by Wikimedia Commons
- [ ] Critical images bundled with app; supplementary images fetched and cached on demand
- [ ] Dynamic political faction system: Greek, Phoenician, Etruscan, Egyptian spheres with shifting alliances, wars, embargoes affecting port access
- [ ] Port reputation system: player behavior affects how factions and individual ports receive them
- [ ] Historical ship progression: ship types unlock as in-game years advance, matching real technological development (penteconter → merchant galley → round ship)
- [ ] Ship stats: speed, cargo capacity, crew requirement, storm resistance — determined by ship type
- [ ] Crew management: crew count + morale bar, food/water supplies, feed them and don't overwork or face mutiny risk
- [ ] Currency/barter differences by region: Lydian coins, grain credits, direct barter — understanding local economies matters
- [ ] Navigation as guided choices: at each port, app suggests 3-5 reachable destinations with risk/reward/distance info
- [ ] Weather system sourced from real Mediterranean weather API data, adapted for ancient context with seasonal patterns
- [ ] Religious/festival events creating demand spikes and safe passage windows (Olympics, Phoenician festivals)
- [ ] Star navigation and coastal landmark system that improves as player explores
- [ ] Hand-written event database (~50-100 events) with historically grounded scenarios, choices, and outcomes
- [ ] Info popups on any trade good, port, culture, or event with historical context and source citations
- [ ] Captain's journal/log recording discoveries, cultural encounters, and trade history — doubles as study notes
- [ ] Side panel UI: map fills the screen, info/trade/inventory panels slide in from sides when interacting
- [ ] Auto-save game state (single continuous save)
- [ ] JSON files for static reference data (ports, goods, events), SQLite for game state (inventory, reputation, position)
- [ ] Ambient audio + sound effects: Mediterranean ambiance, sailing sounds, port marketplace bustle, event sounds
- [ ] Packaged as Electron + React application, distributed via GitHub releases (.dmg, .exe, .deb)
- [ ] English only for v1

### Out of Scope

- AI-generated imagery — all visuals are public domain historical art, museum artifacts, or curated illustrations
- Multiplayer or online features — single-player educational experience
- Teacher dashboard or progress export — v2 consideration
- Quiz/knowledge check features — learning happens through gameplay, not testing
- Multiple language support — English only for v1
- Mobile/tablet versions — desktop Electron only
- Real-time gameplay — strictly turn-based

## Context

- Target audience is students in history/classics courses, but the gameplay should be engaging enough for anyone interested in ancient history
- The 600-900 BCE period covers the Archaic Greek period, Phoenician maritime dominance, Neo-Assyrian expansion, Egyptian Late Period, and early Etruscan civilization — a rich and well-documented era for Mediterranean trade
- Public domain art is abundant for this period: ancient Greek pottery, Phoenician artifacts, Egyptian art, Roman-era depictions of ancient ships are all widely available through museum APIs and Wikimedia
- Pleiades (pleiades.stoa.org) is the standard academic gazetteer for ancient places — provides coordinates, period data, and relationships
- Perseus Digital Library (perseus.tufts.edu) provides primary source texts and encyclopedia entries for ancient Mediterranean cultures
- Met Museum and British Museum both have well-documented open APIs for searching collections by period, region, and material
- Oregon Trail is the core gameplay inspiration: port-to-port progression, resource management, event cards with choices, consequences that compound
- Pokemon Conquest is the time progression inspiration: player chooses when to advance, not real-time pressure

## Constraints

- **Platform**: Electron + React — must run on macOS, Windows, and Linux from a single codebase
- **Map**: Leaflet with styled OpenStreetMap tiles (sepia/parchment CSS filters) — no custom tileset generation
- **Art**: Public domain only — no AI-generated images, no licensed stock art
- **Data Sources**: Museum APIs (Met, British Museum), Pleiades gazetteer, Perseus Digital Library, Wikimedia Commons
- **Audio**: Public domain or Creative Commons licensed sound effects and ambient audio
- **Distribution**: GitHub releases — no app store submissions for v1
- **Offline**: Hybrid — core data and critical images bundled, supplementary images cached on first load, weather fetched live with fallback

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Electron + React over Tauri or native | Largest ecosystem for map/animation components, team familiarity, cross-platform without Rust complexity | — Pending |
| Leaflet over Mapbox | Free, open-source, no API key limits, full control over tile styling | — Pending |
| Styled OSM tiles over custom tileset | Custom ancient coastline tiles would be most authentic but prohibitively labor-intensive for v1 | — Pending |
| Turn-based (voyage leg) over real-time | Lets students think through decisions without time pressure; matches educational context | — Pending |
| Museum APIs over AI-generated art | Authenticity is core to educational value; real artifacts teach more than illustrations | — Pending |
| Hand-written events over procedural generation | Ensures historical accuracy and educational quality; 50-100 events is manageable scope | — Pending |
| JSON + SQLite over pure JSON | Static reference data stays version-controlled; game state needs proper persistence and querying | — Pending |
| Academic sources + rewrite over raw academic text | Raw scholarly text is inaccessible to students; consistent voice matters for engagement | — Pending |
| Ancient names primary over modern names | Immersion and learning; modern names available as reference in parentheses | — Pending |

---
*Last updated: 2026-03-12 after initialization*

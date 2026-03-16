# Archeology Simulator

## What This Is

A turn-based ancient Mediterranean trade simulator where the player is a merchant captain sailing between ports in 600-900 BCE. Built as an Electron + React desktop app aimed at students and educators, it combines historically grounded gameplay with real museum artifacts, academic source data, and dynamic economic systems to teach ancient history through interactive decision-making. Think Oregon Trail meets ancient Mediterranean commerce.

Shipped v1.0 with full gameplay loop: map navigation, port-to-port sailing with events, buy/sell trading, illustrated port scenes, museum artifact images, ambient audio, and tutorial.

## Core Value

Students learn ancient Mediterranean history — trade networks, cultures, geography, politics, and daily life — by making decisions as a merchant captain, not by reading about them.

## Requirements

### Validated

- ✓ Interactive parchment-styled Leaflet map with ancient port locations — v1.0
- ✓ Turn-based gameplay with voyage events during transit — v1.0
- ✓ Port arrival with illustrated scenes and clickable Market/Harbor — v1.0
- ✓ Trade system with supply/demand pricing — v1.0
- ✓ Ship with cargo capacity and inventory UI — v1.0
- ✓ Museum artifact images from Met Museum API with cache — v1.0
- ✓ Ambient Mediterranean audio (Web Audio synthesis) — v1.0
- ✓ SQLite persistence with auto-save — v1.0
- ✓ Guided tutorial (skippable) — v1.0
- ✓ Parchment UI aesthetic with Cinzel/Lora fonts — v1.0
- ✓ Electron packaging with secure IPC bridge — v1.0

### Active

- [ ] Real archaeological artifact images sourced and curated (4-5 per trade good)
- [ ] Real historical port illustrations sourced and curated (1 per port)
- [ ] Seasonal sailing system with weather affecting routes
- [ ] Political faction system with reputation
- [ ] Ship progression and crew management
- [ ] Commodity chains (copper + tin = bronze)
- [ ] Captain's journal/log
- [ ] ~40-60 ports (currently 5)
- [ ] Bundle fonts for offline use

### Out of Scope

- AI-generated imagery — all visuals are public domain historical art, museum artifacts, or curated illustrations
- Multiplayer or online features — single-player educational experience
- Teacher dashboard or progress export — v2 consideration
- Mobile/tablet versions — desktop Electron only
- Real-time gameplay — strictly turn-based

## Current Milestone: v1.1 Integration & macOS Polish

**Goal:** Replace programmatic SVG port illustrations and API-dependent artifact images with curated, verified real images — historical drawings for ports and archaeological artifact photos for trade goods.

**Target features:**
- Curated archaeological artifact images (4-5 per trade good, 8 goods = ~35-40 images)
- Curated historical port illustrations (1 per port, 5 ports = 5 images)
- Image database schema for storing curated image metadata
- UI integration to display curated images instead of SVG/API fallbacks
- Credential wiring for museum API access

## Context

Shipped v1.0 with 7,732 lines of TypeScript across 100 files.

**Tech stack:** Electron 35, React 19, Vite 7.3, TypeScript, better-sqlite3, Leaflet, Tailwind CSS 4, Web Audio API

**Current state:** Fully playable with 5 ports, 8 trade goods, 24 voyage events. Port illustrations are programmatic SVG (6 regional variants). Trade good images come from Met Museum API with SQLite cache. Audio is synthesized via Web Audio API.

**Known gaps:** Only 5 ports seeded (target 40-60). Port illustrations are SVG placeholders, not real historical art. Trade good images rely on live Met Museum API — should have curated fallbacks. Google Fonts loaded from CDN, not bundled.

## Constraints

- **Platform**: Electron + React — macOS, Windows, Linux
- **Map**: Leaflet with styled OpenStreetMap tiles (sepia/parchment CSS filters)
- **Art**: Public domain only — no AI-generated images, no licensed stock art
- **Data Sources**: Museum APIs (Met, British Museum), Pleiades gazetteer, Perseus Digital Library, Wikimedia Commons
- **Audio**: Web Audio API synthesis (no external audio files currently)
- **Distribution**: GitHub releases

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Electron + React over Tauri or native | Largest ecosystem for map/animation components, cross-platform | ✓ Good |
| Leaflet over Mapbox | Free, open-source, no API key limits | ✓ Good |
| Styled OSM tiles over custom tileset | Custom ancient coastline tiles prohibitively labor-intensive | ✓ Good |
| Turn-based (voyage leg) over real-time | Students think through decisions without time pressure | ✓ Good |
| Museum APIs over AI-generated art | Authenticity is core to educational value | ✓ Good |
| JSON + SQLite over pure JSON | Static reference data version-controlled; game state needs persistence | ✓ Good |
| GameState discriminated union | Type-safe FSM with exhaustive switch | ✓ Good |
| contextBridge IPC (window.api) | Secure renderer↔main boundary | ✓ Good |
| Web Audio synthesis over audio files | Zero external dependencies; prior MP3 sourcing failed | ✓ Good |
| SVG port illustrations over external images | Zero external dependencies; prior PNG sourcing failed | ⚠️ Revisit — source real historical art |
| better-sqlite3 12.6.2 | Latest stable; 12.7.0 doesn't exist | ✓ Good |
| Vite 7.3.1 | Latest stable; Vite 8 not released | ✓ Good |

---
*Last updated: 2026-03-16 after v1.1 milestone started*

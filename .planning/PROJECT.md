# Archeology Simulator

## What This Is

A turn-based ancient Mediterranean trade simulator where the player is a merchant captain sailing between ports in 600-900 BCE. Built as an Electron + React desktop app aimed at students and educators, it combines historically grounded gameplay with real museum artifacts, academic source data, and dynamic economic systems to teach ancient history through interactive decision-making. Think Oregon Trail meets ancient Mediterranean commerce.

Shipped v1.0 (2026-03-16), v1.1 (2026-03-31), v1.2 (2026-03-31), v1.3 (2026-04-01). Full gameplay loop with 25 ports, curated historical art, seasonal weather system, captain's journal, animated sailing, trade P&L feedback, and title screen.

## Core Value

Students learn ancient Mediterranean history — trade networks, cultures, geography, politics, and daily life — by making decisions as a merchant captain, not by reading about them.

## Requirements

### Validated

- ✓ Interactive parchment-styled Leaflet map with ancient port locations — v1.0
- ✓ Turn-based gameplay with voyage events during transit — v1.0
- ✓ Port arrival with illustrated scenes and clickable Market/Harbor — v1.0
- ✓ Trade system with supply/demand pricing — v1.0
- ✓ Ship with cargo capacity and inventory UI — v1.0
- ✓ Museum artifact images from Met Museum API with cache — v1.0 (replaced by curated images in v1.1)
- ✓ Ambient Mediterranean audio (Web Audio synthesis) — v1.0
- ✓ SQLite persistence with auto-save — v1.0
- ✓ Guided tutorial (skippable) — v1.0
- ✓ Parchment UI aesthetic with Cinzel/Lora fonts — v1.0
- ✓ Electron packaging with secure IPC bridge — v1.0

### Active

- ✓ Real archaeological artifact images sourced and curated (4 per trade good) — v1.1
- ✓ Real historical port illustrations sourced and curated (1 per port) — v1.1
- ✓ Consistent IPC contract with IPCResponse<T> and wrapHandler — v1.2
- ✓ Structured logging replacing ad-hoc console calls — v1.2
- ✓ Zero TypeScript errors, justified lint suppressions — v1.2
- ✓ Visible error feedback for IPC failures — v1.2
- ✓ Seasonal weather system with Athenian calendar, mare clausum, voyage modifiers — v1.3
- ✓ Captain's journal with auto-logged trades, events, arrivals/departures, player notes — v1.3
- ✓ Animated sailing with per-turn events, route line, camera follow, voyage overlay — v1.3
- ✓ Trade P&L indicators with purchase provenance and dynamic totals — v1.3
- ✓ Title screen with New Game / Continue — v1.3
- [ ] Political faction system with reputation
- [ ] Ship progression and crew management
- [ ] Commodity chains (copper + tin = bronze)
- [ ] ~40-60 ports (currently 25)
- [ ] Bundle fonts for offline use

### Out of Scope

- AI-generated imagery — all visuals are public domain historical art, museum artifacts, or curated illustrations
- Multiplayer or online features — single-player educational experience
- Teacher dashboard or progress export — v2 consideration
- Mobile/tablet versions — desktop Electron only
- Real-time gameplay — strictly turn-based

## Current Milestone: v2.0 The Merchant's Odyssey

**Goal:** Transform the framework into a complete educational game where players live the life of a 6th century BCE merchant captain — learning ancient Mediterranean history, culture, trade, and geography through a narrative quest that spans the entire sea.

**Target features:**
- Rich port experiences with deep historical content (culture, customs, regional trade specializations)
- Narrative quest system starting at Piraeus with branching historically-grounded objectives
- Progressive port unlocking through trade reputation and NPC introductions
- 15-25 historically important ports with unique goods, lore, and economic systems
- NPCs at ports who share historical knowledge, give quests, reveal trade routes
- Captain's journal as narrative device recording discoveries and quest progress
- Reputation/standing system affecting trade prices and NPC access
- Expanded historically accurate voyage events
- Polished game flow: title → intro → tutorial at Piraeus → open world → odyssey complete

**Previously shipped:**
- v1.0 MVP — Playable trade simulator with 25 ports, events, audio, tutorial
- v1.1 Integration — 57 curated images (ports + trade goods), fully offline, attribution displays
- v1.2 Coding Hygiene — IPCResponse<T>, structured logging, zero tsc errors, error toast
- v1.3 Gameplay Depth & Polish — Seasonal weather, captain's journal, sailing animation, trade P&L, title screen

## Context

**Tech stack:** Electron 35, React 19, Vite 7.3, TypeScript, better-sqlite3, Leaflet, leaflet.motion, Tailwind CSS 4, Web Audio API

**Current state (v1.3):** Fully playable with 25 ports, 8 trade goods, 24 voyage events, seasonal weather (Athenian calendar), captain's journal with auto-logging, animated per-turn sailing with route lines and voyage overlay, trade P&L indicators, and title screen. 57 curated historical images served offline. 60 passing tests (game logic + weather + sailing). Zero TypeScript errors.

**Known gaps:** Target 40-60 ports (currently 25). Google Fonts loaded from CDN, not bundled. No CI/CD pipeline. DB tests fail in Vitest due to better-sqlite3 native module mismatch (works in Electron).

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
| SVG port illustrations over external images | Zero external dependencies; prior PNG sourcing failed | ✓ Replaced with curated art in v1.1 |
| better-sqlite3 12.6.2 | Latest stable; 12.7.0 doesn't exist | ✓ Good |
| Vite 7.3.1 | Latest stable; Vite 8 not released | ✓ Good |

---
## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-01 — v2.0 milestone started*

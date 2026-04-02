# Archeology Simulator — Mare Nostrum

[![Release](https://img.shields.io/github/v/release/rishi-zamvar/archeology-simulator)](https://github.com/rishi-zamvar/archeology-simulator/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A turn-based ancient Mediterranean trade simulator where you play as a merchant captain sailing between ports in 540 BCE. Learn real history — trade networks, cultures, geography, and daily life — by making decisions, not by reading about them.

## Features

- **25 historically researched ports** across the Mediterranean — Athens, Tyre, Carthage, Alexandria, and more
- **Narrative quest system** — start at Piraeus with "The Tyrian Commission" and work your way across the ancient world
- **Progressive exploration** — discover new ports as you trade and meet NPCs, gradually revealing the map
- **5 named NPCs** with branching dialogue, trade rumors, and port gossip
- **Historically accurate trade goods** — olive oil, Attic pottery, Tyrian purple, Egyptian grain, Iberian silver
- **Seasonal weather system** with Athenian calendar, mare clausum winter sailing restrictions
- **Animated trireme sailing** with sea routes curving around land masses
- **Reputation system** affecting trade prices ("Stranger" to "Proxenos")
- **Ship hull condition & crew morale** — manage your vessel and crew
- **Captain's journal** recording trades, discoveries, quest progress
- **Educational port lore** with cited historical sources
- **37 historically grounded voyage events** — storms, pirates, ancient shipwreck salvage
- **Web Audio synthesized soundscapes** — unique ambient audio per port region

## Install & Play

### macOS (Apple Silicon)
1. Download **[Archeology Simulator-1.0.0-arm64.dmg](https://github.com/rishi-zamvar/archeology-simulator/releases/latest/download/Archeology.Simulator-1.0.0-arm64.dmg)** from [Releases](../../releases/latest)
2. Open the DMG and drag **Archeology Simulator** to Applications
3. Right-click the app → **Open** (first time only, to bypass Gatekeeper)

### Windows (x64)
1. Download **[Archeology Simulator Setup 1.0.0.exe](https://github.com/rishi-zamvar/archeology-simulator/releases/latest/download/Archeology.Simulator.Setup.1.0.0.exe)** from [Releases](../../releases/latest)
2. Run the installer — choose your install directory when prompted
3. Launch from Start Menu or Desktop shortcut

### From Source (developers)
```bash
git clone https://github.com/rishi-zamvar/archeology-simulator.git
cd archeology-simulator
npm install
npm run dev
```

## How to Play

1. **Start a New Game** — you begin at Piraeus, the port of Athens
2. **Read the intro** — learn about your commission from Nikias
3. **Hover the top edge** to see your quest objectives and captain's log
4. **Click the port scene** to open Harbor (destinations) and Market (trade goods)
5. **Buy low, sell high** — trade goods between ports for profit
6. **Sail to new ports** — click "Sail" next to a destination
7. **Meet NPCs** — speak with merchants who give quests and share knowledge
8. **Complete quests** — deliver goods, visit ports, talk to people
9. **Discover the Mediterranean** — each port reveals 3 new nearby ports
10. **Complete The Merchant's Odyssey** — finish all 5 commissions to win

## Controls

- **Hover top of screen** — reveals captain's log, quest tracker
- **Click port scene** — opens Harbor/Market popup
- **Double-click during sailing** — skip animation, arrive immediately
- **Scroll** — zoom map in/out
- **Drag** — pan the map

## Tech Stack

- Electron 35 + React 19 + TypeScript
- Vite 7.3 for bundling
- better-sqlite3 for persistence
- Leaflet with Stamen Watercolor tiles
- Web Audio API for synthesized sound (no audio files)
- 200+ tests

## Historical Period

Set in approximately **540-530 BCE** (late Archaic period):
- Athens under the reforms of Peisistratos
- Carthage at the height of Phoenician maritime power
- Egypt under Persian rule (26th Dynasty ending)
- Greek colonization of the western Mediterranean

All historical content is sourced from academic references including Herodotus, Thucydides, Lionel Casson's "Ships and Seamanship in the Ancient World", and the Pleiades gazetteer.

## License

MIT License — Copyright © 2026 Rishi Zamvar

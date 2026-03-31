# Technology Stack — v1.3 Gameplay Depth & Polish

**Project:** Archeology Simulator v1.3
**Researched:** 2026-03-31
**Confidence:** HIGH (all features use existing stack; verified against codebase)
**Mode:** Incremental — what changes from v1.2 baseline

## Verdict: No New Dependencies Required

All four v1.3 features build on top of the existing stack. Adding libraries would introduce unnecessary coupling and maintenance burden for capabilities that are straightforward to implement with what's already installed.

| v1.3 Feature | Existing Tech That Covers It | New Library Needed? |
|---|---|---|
| Seasonal weather system | Pure TypeScript game logic + existing turn/month mapping | NO |
| Captain's journal persistence | better-sqlite3 + existing IPC contract (IPCResponse\<T\>) | NO |
| Sailing animation polish | leaflet.motion 0.3.2 + ShipMarker.tsx (already working) | NO |
| Trade profit/loss before sale | Pure React UI + existing CargoItem.boughtAtPrice field | NO |

## Existing Capabilities Already Covering v1.3

### Seasonal Weather System

**What exists:** `Logbook.tsx` already maps turns to Athenian calendar months via `turnToDate()`. Turn number modulo 12 gives month index. The Athenian months already map to real seasons (Hekatombaion = July, Poseideon = December, etc.).

**What's needed:** Game logic layer that converts month to season, season to weather modifiers (voyage duration multiplier, storm probability, route danger). This is pure TypeScript — a `SeasonEngine` module that takes a turn number and returns `{ season, weatherModifier, stormChance, description }`.

**Stack implication:** None. No weather API, no physics engine, no animation library. This is a turn-based modifier system — multiply voyage duration by a seasonal factor, adjust event probabilities.

### Captain's Journal Persistence

**What exists:**
- `Logbook.tsx` — fully functional UI with 6 entry types (weather, rumor, arrival, departure, event, trade), scrollable panel, parchment styling
- `LogEntry` interface already defined with turn, date, text, type fields
- Entries accumulate in React component state (lost on reload)
- `better-sqlite3` schema in `schema.ts` with established migration pattern
- `IPCResponse<T>` contract for all IPC calls

**What's needed:** A `journal_entries` SQLite table, IPC handlers for save/load, and wiring Logbook.tsx to persist entries through the existing IPC layer instead of React state alone.

**Stack implication:** None. One new table in `schema.ts`, two IPC handlers (`journal:save`, `journal:load`), and Logbook.tsx loads persisted entries on mount.

### Sailing Animation

**What exists:**
- `ShipMarker.tsx` — complete implementation using `leaflet.motion` 0.3.2
- SVG ship icon (sepia-toned boat with sail)
- Polyline animation from departure to destination (5-second duration)
- Motion-ended callback triggers ARRIVE action
- Cleanup on unmount

**What's needed:** This is already working. Enhancements might include:
- Variable animation duration based on distance/season (currently hardcoded 5000ms)
- Wake/trail effect behind ship (CSS pseudo-element on the ship div, no library needed)
- Route preview polyline (Leaflet native `L.polyline`, no plugin needed)

**Stack implication:** None. `leaflet.motion` 0.3.2 is already installed and integrated. Any visual polish is CSS/SVG work on the existing ship icon div.

### Trade Profit/Loss Before Sale

**What exists:**
- `ProfitDisplay.tsx` — shows running total profit (current gold - 500 starting) and last 10 transactions
- `CargoItem` type already tracks `boughtAtPrice` and `boughtAtPort`
- `MarketGood` type has `currentPrice` at any port
- `TradePanel.tsx` handles buy/sell UI

**What's needed:** In the sell confirmation flow, display `(currentPrice - boughtAtPrice) * quantity` as a green/red indicator. The data is already available — `CargoItem.boughtAtPrice` vs `MarketGood.currentPrice`. This is a UI calculation, not a data pipeline.

**Stack implication:** None. Pure React component work.

## What NOT to Add

| Tempting Addition | Why to Avoid |
|---|---|
| D3.js for weather visualization | Overkill. Weather is a text description + numeric modifier in a turn-based game. A styled div with season icon is sufficient. |
| Framer Motion for UI animations | Already using CSS transitions and leaflet.motion. Adding a second animation system creates inconsistency and 45KB bundle cost. |
| date-fns / luxon for date handling | The game uses fictional ancient calendar months. Real date libraries add nothing — `turnToDate()` is 10 lines of array indexing. |
| Lodash for utility functions | TypeScript native `Array.prototype` methods cover everything needed. No deep cloning or complex object manipulation required. |
| React Query / SWR for data fetching | All data is local SQLite. There's no remote API to cache. Zustand + IPC is the established pattern. |
| A charting library for profit tracking | Profit is a single number with a plus/minus sign. A `<span>` with conditional color is the right tool. |

## Version Pinning (Current, Keep As-Is)

These are the actual installed versions from `package.json`. They are working and should not be upgraded for v1.3 — no new capabilities are needed from newer versions.

| Package | Installed Version | Upgrade? | Rationale |
|---|---|---|---|
| electron | ^35.7.5 | NO | Stable, working. v1.3 adds no Electron-level features. |
| react | ^19.0.0 | NO | UI additions are component-level, not framework-level. |
| vite | ^7.3.1 | NO | Build tooling unchanged. |
| better-sqlite3 | ^12.6.2 | NO | One new table is trivial. No new SQLite features needed. |
| leaflet | ^1.9.4 | NO | Native polyline + leaflet.motion covers all map needs. |
| leaflet.motion | ^0.3.2 | NO | Already integrated in ShipMarker.tsx. Working correctly. |
| react-leaflet | ^5.0.0 | NO | Map component layer unchanged. |
| zustand | ^5.0.11 | NO | State management patterns unchanged. |
| tailwindcss | ^4.2.1 | NO | Styling approach unchanged. |
| typescript | ^5.7.3 | NO | Type system needs unchanged. |

## Integration Points for v1.3 Features

Where new code connects to existing code — no new libraries, but these are the seams:

### Seasonal Weather -> Game Engine
```
src/game/          <- NEW: season-engine.ts (pure functions)
  |
  v
src/shared/game-types.ts  <- EXTEND: add Season type, WeatherModifier type
  |
  v
src/game/events.ts        <- MODIFY: storm probability uses seasonal modifier
src/renderer/Logbook.tsx   <- MODIFY: weather text uses seasonal descriptions
```

### Journal Persistence -> SQLite
```
src/main/db/schema.ts     <- EXTEND: add journal_entries table
  |
  v
src/main/db/queries.ts    <- EXTEND: add saveJournalEntry, loadJournalEntries
  |
  v
src/main/ipc/             <- NEW: journal.ts IPC handlers
  |
  v
src/shared/ipc-types.ts   <- EXTEND: add journal channel types
  |
  v
src/renderer/Logbook.tsx   <- MODIFY: load on mount, save on new entry
```

### Sailing Animation -> leaflet.motion
```
src/game/season-engine.ts  <- provides duration multiplier
  |
  v
src/renderer/ShipMarker.tsx <- MODIFY: duration = baseDuration * seasonModifier
```

### Trade Profit Preview -> TradePanel
```
src/renderer/TradePanel.tsx <- MODIFY: show (salePrice - boughtAtPrice) * qty
  |                            before confirm button
  v
(no backend changes — data already available in CargoItem + MarketGood)
```

## Sources

- Codebase inspection (ground truth): `package.json`, `ShipMarker.tsx`, `Logbook.tsx`, `ProfitDisplay.tsx`, `schema.ts`, `game-types.ts`
- leaflet.motion: already installed and working in ShipMarker.tsx (v0.3.2)
- All version numbers from `package.json` (verified 2026-03-31)

---

**Bottom line:** v1.3 is a game logic and UI milestone, not an infrastructure milestone. The stack is already right-sized. Ship features, not dependencies.

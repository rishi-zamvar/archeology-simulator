# Project Research Summary

**Project:** Archeology Simulator v1.3 — Gameplay Depth & Polish
**Domain:** Incremental feature addition to an existing Electron + React turn-based educational trade simulator
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

v1.3 is a features-and-polish milestone, not an infrastructure milestone. All four planned features — seasonal weather, captain's journal persistence, sailing animation polish, and trade profit/loss display — are buildable entirely on the existing stack (Electron 35, React 19, Zustand, better-sqlite3, leaflet.motion, TypeScript). No new dependencies are warranted. Two of the four features (sailing animation, trade profit/loss display) are partly or fully implemented and require targeted extension rather than greenfield work. The stack is already right-sized; the mandate is to ship features, not dependencies.

The recommended build order is determined by dependency: (1) weather system as a pure-function foundation that unblocks both the journal and the sailing overlay, (2) journal persistence as the largest architectural change (new SQLite table, IPC channels, Logbook refactor from component state to DB-backed), (3) sailing animation polish that consumes the weather module for duration and display, and (4) trade profit/loss display as the smallest standalone change with zero backend dependencies. The trade profit feature can technically be built in parallel with phase 1.

The critical risks are around integration seams, not individual features. The three most dangerous failure modes are: (a) weather modifiers written to voyage duration without baking them into FSM state at SET_SAIL time, causing animation and turn-count to diverge; (b) journal entries generated in React component state rather than the main process, making them vulnerable to component unmount and reload; and (c) the `leaflet.motion` animation restarting mid-voyage when parent components re-render due to unstable prop references. Each has a concrete, implementable prevention strategy and should be addressed explicitly in phase planning.

## Key Findings

### Recommended Stack

No changes from the existing stack. All v1.3 work is additive at the TypeScript, React, and SQLite layer. The existing stack handles every requirement: `better-sqlite3` for journal persistence (one new table), `leaflet.motion` 0.3.2 for animation polish (already wired in `ShipMarker.tsx`), pure TypeScript for the weather engine, and inline JSX for the trade profit indicator. Introducing D3.js, Framer Motion, date-fns, or any other library would add maintenance cost and bundle weight without proportional benefit.

**Core technologies (all unchanged, keep pinned at current versions):**
- **Electron 35 + better-sqlite3 12.6.2:** IPC contract and SQLite persistence — covers journal persistence with one new table and two new IPC channels
- **React 19 + Zustand 5.0.11:** Component layer and UI state — covers all UI additions; no new Zustand stores needed
- **TypeScript 5.7.3:** Shared game logic — weather engine is pure TS functions with zero framework coupling, importable by both main and renderer
- **leaflet 1.9.4 + leaflet.motion 0.3.2 + react-leaflet 5:** Map and animation — already functional in `ShipMarker.tsx`; needs targeted polish only
- **Tailwind 4.2.1:** Styling — all visual additions fit the existing utility-class approach

**What NOT to add:** D3.js (overkill for a text label + modifier), Framer Motion (second animation system creates inconsistency), date-fns/luxon (fictional ancient calendar needs no real date library), React Query/SWR (all data is local SQLite), Lodash (TypeScript native methods cover all needs).

### Expected Features

**Must have (table stakes):**
- **Trade profit/loss indicator** — players need pre-confirmation P/L visibility; all data already exists (`CargoItem.boughtAtPrice` vs `MarketGood.currentPrice`)
- **Journal persistence** — losing the Logbook on reload breaks the educational narrative; the `Logbook.tsx` component provides 80% of the UI already
- **Season display** — if weather affects voyage mechanics, the current season must be visible to the player before committing to SET_SAIL

**Should have (differentiators):**
- **Seasonal voyage modifiers** — historically grounded (mare clausum, Vegetius sources); unique educational angle on why ancient ships avoided winter crossings
- **Prompted journal reflections** — bridges simulation to essay and discussion; metacognitive value is documented in educational game research
- **Route line on map** — geographic literacy teaching tool; students see actual Mediterranean distances and paths before departure

**Defer to v2+:**
- Real-time wind simulation (complexity without proportional pedagogical gain)
- Rich text or image journal entries (scope explosion; plain text with type icons is sufficient)
- Mid-voyage weather event interruption (requires FSM rework with interruptible sailing states)
- Supply/demand modification from weather (creates double feedback loop with existing economy system)
- Per-route profit optimization hints (undermines discovery learning)

### Architecture Approach

All four features integrate cleanly with the existing layered architecture (Renderer → contextBridge → Main/IPC → Game Logic). Changes are additive: two new files (`src/game/weather.ts`, `src/renderer/components/SailingOverlay.tsx`), one new DB table (`journal_entries`), two new IPC channels (`game:getJournal`, `game:addJournalEntry`), and targeted modifications to 10 existing files. No new FSM states are needed — weather is a modifier on existing states, not a discrete phase. No new Zustand stores — journal uses the existing fetch-on-mount + subscribe-to-broadcast pattern.

**New files:**
1. **`src/game/weather.ts`** — pure `getSeason(turn)` / `getWeatherModifiers(turn)` functions; shared by main process and renderer with no Electron dependency; single source of truth for all weather text and mechanics
2. **`src/renderer/components/SailingOverlay.tsx`** — floating voyage info panel showing destination, weather conditions, and estimated arrival during sailing state

**Major modifications:**
3. **`journal_entries` SQLite table** — id, turn, date_text, text, type, created_at; entries generated server-side in IPC handlers at every game action boundary (ARRIVE, SET_SAIL, COMPLETE_TRADE, turn advance)
4. **`Logbook.tsx`** — large refactor: remove `useState<LogEntry[]>`, load from IPC on mount, subscribe to `subscribe:journal:updated`, remove cosmetic `generateWeather()` (replaced by weather system)
5. **`ShipMarker.tsx`** — visible dashed route polyline (currently transparent), dynamic duration scaled to `eta` (currently hardcoded 5000ms), `voyageId` dep for animation stability
6. **`TradePanel.tsx`** — inline profit indicator per carried good; color-coded; uses existing `CargoItem.boughtAtPrice`

**Unchanged:** `state.ts` FSM, `game-types.ts` GameState union, `uiStore.ts`, `ProfitDisplay.tsx`, `CargoHold.tsx`, `EventCard.tsx`, `ipc/save.ts`

### Critical Pitfalls

1. **Weather modifies voyage duration after FSM `eta` is already frozen** — calculate weather-adjusted `durationTurns` BEFORE `SET_SAIL` fires and bake it into `SailingState.eta`; never modify `eta` mid-voyage; scale animation duration from `eta` rather than hardcoding 5000ms; do not introduce mid-voyage weather changes in v1.3

2. **Journal entries generated in React component state** — all entry generation must move to the main process inside IPC action handlers; Logbook becomes a read-only subscriber, not an entry generator; this eliminates entries lost on unmount, reload, and React StrictMode double-mount duplicates

3. **`leaflet.motion` animation restarts mid-voyage on parent re-renders** — stabilize `portCoords` with `useMemo` in parent (ports don't change, Map reference should be stable); add `voyageId` to `SailingState` as the sole animation effect dependency instead of `destination` + `departurePortId`; guard `motion-ended` callback with a sailing-state check before firing ARRIVE

4. **Cosmetic weather text in `Logbook.tsx` contradicts mechanical weather system** — remove the existing `generateWeather(turn)` function and hardcoded `conditions` array entirely; `weather.ts` is the single source of truth for all weather descriptions and mechanics; do not layer on top

5. **Weather fields added to `GameState` break existing save files** — all new fields must be optional (`?`) with defaults computed from `currentTurn`; add a `migrateGameState(raw: unknown): GameState` normalization function; test with actual v1.2 save files before shipping

## Implications for Roadmap

Based on the combined research, the dependency graph points to a clear four-phase structure. The ordering minimizes blocked work and surfaces the most dangerous architectural changes earliest.

### Phase 1: Seasonal Weather System

**Rationale:** The weather engine is a pure-function foundation that both the journal (seasonal weather entries) and the sailing overlay (weather display during voyage) depend on. Building it first unblocks phases 2 and 3. It is also architecturally the most consequential phase because it touches `voyage.ts` and `events.ts` (the core game engine) and requires save-file migration. Do it first while the codebase is cleanest and there are no dependent features to break.

**Delivers:** `src/game/weather.ts` with `getSeason` and `getWeatherModifiers`; modified `voyage.ts` with weather-adjusted duration calculation; modified `events.ts` with seasonal storm weight adjustment; season indicator in Logbook title bar; mare clausum warning in port selection UI before SET_SAIL; `migrateGameState()` function for backward compatibility with v1.2 saves; `calendar.ts` unified module so Logbook date display and weather system share the same season mapping

**Addresses:** Seasonal weather system (FEATURES.md Feature 1), season display (table stakes)

**Avoids:** Pitfall 1 (FSM eta divergence if weather is applied late), Pitfall 6 (save file breakage), Pitfall 7 (cosmetic vs mechanical weather producing contradictory output), Pitfall 10 (calendar/season mismatch between Logbook months and weather module), Integration 1 (weather must not modify supply/demand)

**Research flag:** NONE — patterns are well-documented, codebase is fully analysed, historical accuracy data is HIGH confidence from academic sources (Tammuz 2005, Beresford 2013)

---

### Phase 2: Captain's Journal Persistence

**Rationale:** The largest architectural change in v1.3. Depends on the weather module for seasonal weather entries. The existing `Logbook.tsx` provides the display template so UI scope is bounded, but the SQLite + IPC + broadcast wiring is the most involved work in this milestone. Doing this before sailing animation and trade profit ensures the journal is ready to capture entries from all subsequent feature work without rework.

**Delivers:** `journal_entries` table added to `schema.ts` with turn index; journal CRUD functions in `queries.ts`; `game:getJournal` and `game:addJournalEntry` IPC channels following existing `wrapHandler` pattern; `subscribe:journal:updated` broadcast after mutations; auto-journaling hooks inserted into existing trade, event, and navigation IPC handlers; Logbook refactored from `useState` to DB-backed with IPC fetch on mount; pagination from the start (limit 50, `beforeId` cursor); prompted reflection modals after key game moments (post-profitable-trade, post-storm, post-new-region)

**Addresses:** Captain's journal persistence (FEATURES.md Feature 2), prompted reflections (differentiator)

**Avoids:** Pitfall 2 (entries lost on unmount or reload), Pitfall 11 (unbounded journal growth causing render slowdown), Integration 2 (journal + animation timing producing duplicate or missing arrival entries)

**Research flag:** NONE — SQLite table + IPC + broadcast is the established pattern in this codebase; no novel patterns needed; the exact trigger points for prompted reflections (profit threshold, first port visit, etc.) are a product decision that should be specified during phase planning

---

### Phase 3: Sailing Animation Polish

**Rationale:** Depends on the weather module for weather-aware duration and route styling. Independent of journal. Scope is bounded to `ShipMarker.tsx` and the new `SailingOverlay.tsx`. This is the most visually impactful phase for the student experience but architecturally the simplest once weather is in place.

**Delivers:** Visible dashed sepia route polyline (color `#7a5c45`, `dashArray: '8, 6'`, was `transparent`); animation duration scaled to `eta * 2000ms` capped at 10000ms (was hardcoded 5000ms); `voyageId` field added to `SailingState` (counter incremented on each SET_SAIL) used as sole animation effect dependency; `useMemo` on `portCoords` in parent to stabilize Map reference; `SailingOverlay.tsx` showing destination, weather conditions, distance, and estimated arrival; Shell.tsx wired to render overlay when `gameState.type === 'sailing'`

**Addresses:** Sailing animation polish (FEATURES.md Feature 3), route line on map (differentiator)

**Avoids:** Pitfall 3 (leaflet.motion races with React re-renders), Pitfall 8 (animation duration disconnect from turn cost), Integration 3 (weather updates triggering MapArea re-render that restarts ShipMarker animation)

**Research flag:** MODERATE — `leaflet.motion` is an unmaintained plugin (~4 years since last release, no TypeScript types, mutates global `L`). The `voyageId` dep-stabilization approach is the recommended prevention, but if during planning it proves insufficient to eliminate animation restarts under realistic re-render patterns, a fallback to a manual `requestAnimationFrame` + Leaflet `setLatLng` loop should be specced. Evaluate the actual ShipMarker cleanup pattern against the `voyageId` approach before committing to implementation.

---

### Phase 4: Trade Profit/Loss Display

**Rationale:** Zero backend dependencies — all data already in the renderer (`CargoItem.boughtAtPrice`, `MarketGood.currentPrice`). Could technically be built in parallel with Phase 1 since it has no dependencies. Placing it last ensures the journal (Phase 2) is already recording trade entries so the UI cohesion between profit preview and trade history is visible during development. It is also the safest, lowest-risk work to close the milestone.

**Delivers:** Inline per-good profit indicator in `TradePanel.tsx` shown when the player is carrying that good; format: `+Xg profit` (green) / `-Xg loss` (red) / `break even` (neutral); FIFO cost basis for multi-batch purchases (oldest batch consumed first, matching `CargoItem` array order); profit calculation uses the same market price that the sell IPC handler will use — not calculated independently — to prevent display/transaction divergence

**Addresses:** Trade profit/loss display (FEATURES.md Feature 4)

**Avoids:** Pitfall 5 (profit display shows wrong numbers due to economy tick timing), Pitfall 9 (UI clutter in already-dense trade panel — show only for carried goods, inline on price display)

**Research flag:** NONE — pure UI arithmetic, fully established patterns, zero novel architecture; the FIFO multi-batch edge case needs explicit handling during planning (current `CargoItem` type may need a `quantity` field or the sell handler needs to consume FIFO)

---

### Phase Ordering Rationale

- **Weather first** because it is a shared pure-function module; building it last would force journal and sailing overlay to either duplicate logic or defer their weather-dependent content
- **Journal second** because it is the largest change and touches the most files; completing it early means phases 3 and 4 can auto-journal their events without rework
- **Sailing third** because it depends on weather for duration and display and benefits from having the journal wired to record arrival and departure entries
- **Trade profit last** because it is the most isolated; no phase blocks it and no phase depends on it; placing it last ensures visual cohesion with the journal that records trade history

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Sailing Animation):** The `leaflet.motion` plugin is unmaintained (~2021, no TypeScript types, mutates global `L`). The `voyageId` dep-stabilization approach is recommended, but if it proves insufficient to prevent animation restarts under realistic re-render patterns, a fallback to `requestAnimationFrame` + `setLatLng` should be specced. This decision should be evaluated explicitly in phase planning before implementation begins.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Seasonal Weather):** Pure TypeScript module following existing `src/game/` patterns; historical accuracy data is HIGH confidence from academic sources; save migration is a known pattern
- **Phase 2 (Journal Persistence):** SQLite + IPC + broadcast is the established pattern in this codebase; `journal_entries` table follows existing schema conventions from `schema.ts`
- **Phase 4 (Trade Profit Display):** Inline React calculation; zero novel patterns; all data already in renderer

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against actual `package.json` in codebase; all installed versions confirmed 2026-03-31; no new dependencies identified |
| Features | HIGH | Codebase verified for current state of each feature; historical sailing season data from multiple academic sources (Tammuz 2005, Beresford 2013); educational reflection patterns from peer-reviewed research |
| Architecture | HIGH | Based on direct codebase analysis of all relevant files (`ShipMarker.tsx`, `Logbook.tsx`, `state.ts`, `schema.ts`, `voyage.ts`, `events.ts`, `ipc/game.ts`); no external library unknowns introduced |
| Pitfalls | HIGH | Derived from actual code patterns in existing components; not speculative — each pitfall references specific line numbers and mechanisms in the codebase |

**Overall confidence:** HIGH

### Gaps to Address

- **`voyageId` / dep-stabilization exact implementation:** Research recommends a counter incremented on each SET_SAIL action, but the precise placement (in `state.ts` action handler vs. in the IPC handler vs. as a separate field on `SailingState`) needs confirmation against the actual SET_SAIL action flow during Phase 3 planning

- **FIFO multi-batch cargo edge case:** Research recommends FIFO for the trade profit display, matching `CargoItem` array order. The edge case of selling a quantity that spans multiple purchase batches at different prices needs explicit handling in Phase 4 planning — the current `CargoItem` type may need a `quantity` field or the sell IPC handler needs to consume items in FIFO order and return the weighted average cost basis for display

- **Prompted reflection trigger points:** Research confirms high educational value but the exact in-game moments that trigger reflection prompts (profit/loss threshold, first visit to a new region, storm survived) are product decisions that need specification during Phase 2 planning, not just technical implementation

## Sources

### Primary (HIGH confidence)

- Codebase direct analysis: `package.json`, `ShipMarker.tsx`, `Logbook.tsx`, `ProfitDisplay.tsx`, `TradePanel.tsx`, `schema.ts`, `game-types.ts`, `state.ts`, `voyage.ts`, `events.ts`, `ipc/game.ts` — verified 2026-03-31
- [Mare Clausum? Sailing Seasons in the Mediterranean in Early Antiquity (Tammuz, 2005)](https://www.researchgate.net/publication/233200035_Mare_clausum_Sailing_Seasons_in_the_Mediterranean_in_Early_Antiquity) — Vegetius dates, sailing season periods
- [The Ancient Sailing Season (Beresford, 2013)](https://www.academia.edu/10928681/The_Ancient_Sailing_Season_2013_) — comprehensive seasonal navigation treatment
- [Reflective Game Design (MDPI, 2023)](https://www.mdpi.com/2227-7102/13/12/1204) — reflection mechanisms during gameplay support learning
- [Oregon Trail Gameplay (StrategyWiki)](https://strategywiki.org/wiki/The_Oregon_Trail/Gameplay) — journal mechanic in educational games
- [React Leaflet Introduction](https://react-leaflet.js.org/docs/start-introduction/) — rendering architecture and imperative plugin warnings
- [leaflet.motion GitHub](https://github.com/Igor-Vladyka/leaflet.motion) — plugin status (unmaintained since ~2021) and API

### Secondary (MEDIUM confidence)

- [Seaborne Trade in the Roman Empire](https://www.ancient-history-sites.com/roman/context/economy/seaborne-trade/) — grain routes, seasonal logistics
- [Mare Clausum: How Romans Managed Extreme Storms](https://romanempiretimes.com/mare-clausum-how-romans-managed-extreme-storms-floods-and-monsoons/) — enforcement of sailing bans
- [Trading Dashboard UI/UX Design (Medium)](https://medium.com/@deepshikha.singh_8561/case-study-trading-investment-dashboard-ui-ux-design-c4a040f6ddf4) — color-coded P/L indicators
- [Designing User Interface in Trading Software (Devexperts)](https://devexperts.com/blog/ui/) — confirmation patterns, P/L display
- [Campaign Mastery — Weather, Not Climate](https://www.campaignmastery.com/blog/weather-not-climate/) — game weather system design principles

### Tertiary (LOW confidence)

- [Static vs dynamic weather systems in video games](https://www.diva-portal.org/smash/get/diva2:1524012/FULLTEXT02) — academic; specific multiplier values are design decisions, not historical facts
- [GameDev.net — Weather Modeling discussion](https://gamedev.net/forums/topic/342648-weather-modeling/3242504/) — community consensus on modifier ranges

---
*Research completed: 2026-03-31*
*Synthesized from: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
*Ready for roadmap: yes*

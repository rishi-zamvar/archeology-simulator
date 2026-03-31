# Phase 9: Seasonal Weather System - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a historically grounded seasonal weather system that affects voyage planning. Season is derived from turn number using the existing 12-month Athenian calendar. Weather modifiers affect voyage duration and event probability. Mare clausum warning prevents accidental winter sailing. Existing save files must load without errors.

</domain>

<decisions>
## Implementation Decisions

### Season Mechanics
- 12-month Athenian calendar maps to 4 seasons (3 months each): Spring (Elaphebolion-Thargelion), Summer (Skirophorion-Metageitnion), Autumn (Boedromion-Pyanepsion), Winter (Maimakterion-Anthesterion)
- New `src/game/weather.ts` module with pure functions: `getSeason(turn)`, `getWeatherModifiers(turn)` — no side effects
- Duration multipliers: winter 1.5x, spring/autumn 1.0x, summer 0.8x
- Replace existing `generateWeather()` in Logbook.tsx with calls to `weather.ts` — seasonal descriptions replace random ones

### Storm Events & Mare Clausum
- Storm chance weighted by season: winter 40%, autumn 20%, spring 10%, summer 5%
- Existing storm events get higher probability in winter, calm events get lower probability — no new events needed
- Mare clausum: modal dialog before SET_SAIL in winter — "Ancient sailors avoided winter seas. Storms are likely. Sail anyway?" with Sail/Wait buttons
- "Wait for spring" advances turns to next safe season, costs gold for port fees

### UI Display & Save Compatibility
- Season displayed in header/status bar alongside turn counter: "Turn 5 — Summer (Skirophorion)"
- Subtle color tint on header: warm gold (summer), blue-gray (winter) — matches parchment aesthetic
- `migrateGameState()` adds season defaults from existing turn number — no disruption to old saves
- Logbook entries reference the season in auto-generated text ("Winter storm", "Summer calm")

### Claude's Discretion
- Exact port fee cost for "wait for spring"
- Specific weather description text for each season
- Which existing events qualify as "storm" vs "calm" for probability weighting
- Animation/transition for season change notification

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `turnToDate(turn)` in Logbook.tsx — maps turns to Athenian months (12-month cycle with year tracking)
- `generateWeather(turn)` in Logbook.tsx — random weather descriptions (to be replaced)
- Existing event system in `src/game/events.ts` with storm-type events
- `migrateGameState()` pattern likely in `src/game/state.ts`

### Established Patterns
- Pure game logic in `src/game/` (state.ts, events.ts, economy.ts, types.ts)
- IPC handlers follow wrapHandler/IPCResponse<T> pattern
- Zustand stores for renderer state (gameStore, uiStore, tradeStore)
- Structured logging with createLogger()

### Integration Points
- `src/game/state.ts` — SET_SAIL action needs weather duration modifier
- `src/game/events.ts` — event selection needs season-weighted probability
- `src/renderer/components/Shell.tsx` — header area for season display
- `src/renderer/components/Logbook.tsx` — replace generateWeather, add seasonal context

</code_context>

<specifics>
## Specific Ideas

- Duration multipliers are moderate (1.5x winter, not 2x) — noticeable but not punishing for students
- Mare clausum is historical (Vegetius) — adds educational value
- Wait-for-spring mechanic adds strategic depth (cost vs risk tradeoff)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

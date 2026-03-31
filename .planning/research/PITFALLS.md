# Domain Pitfalls — v1.3 Gameplay Depth & Polish

**Domain:** Adding seasonal weather, captain's journal persistence, sailing animation improvements, and trade profit/loss UX to an existing Electron + React turn-based game
**Researched:** 2026-03-31
**Confidence:** HIGH (verified against existing codebase + domain patterns)

---

## Critical Pitfalls

Mistakes that cause rewrites or break existing functionality.

### Pitfall 1: Seasonal Weather Mutates Voyage Duration Without Updating FSM Contract

**What goes wrong:**
Weather modifies `durationTurns` in `calculateVoyageDuration()` (voyage.ts), but the FSM's `SailingState` already stores `eta` as a fixed number set at `SET_SAIL` time. If weather changes duration after sail is set, the FSM's `eta` and the actual voyage length diverge. The ShipMarker animation runs for 5 seconds regardless. The Logbook shows arrival at one time, the FSM resolves at another. Player sees the ship arrive but can't trade, or can trade before the ship arrives.

**Why it happens:**
The current architecture sets `eta` once during the `SET_SAIL` action (state.ts:80-85) and never revisits it. Weather is a modifier that wants to change duration dynamically (storms add turns, favorable winds reduce them), but the FSM has no mechanism for mid-voyage state updates. Developers add weather as a multiplier in `calculateVoyageDuration()` without realizing `eta` is already frozen in state.

**Consequences:**
- Ship animation duration (5000ms hardcoded in ShipMarker.tsx:101) doesn't reflect weather-modified travel time
- `motion-ended` callback fires ARRIVE action at wrong time relative to game turns
- Save/load breaks if weather state isn't serialized alongside `eta`

**Prevention:**
1. Weather must modify `durationTurns` BEFORE `SET_SAIL` — calculate weather-adjusted duration, pass it as `eta` in the action. Do not try to modify `eta` mid-voyage.
2. Add a `weatherModifier` field to `SailingState` (optional, for backward compat) so the UI can display "Storm: +2 turns" without needing to recalculate.
3. Map animation duration in ShipMarker should derive from `eta`, not be hardcoded at 5000ms. Formula: `eta * BASE_ANIMATION_MS` with a reasonable cap.
4. Never introduce mid-voyage weather changes in v1.3 — that requires a fundamentally different FSM with interruptible sailing states. Save that for v2.

**Detection:**
- Ship arrives visually but game state is still `sailing`
- `eta` in saved game doesn't match expected weather-adjusted duration
- Player can click ports while ship is still animating

**Phase to address:** First phase (Seasonal Weather) — must be designed before touching voyage.ts or state.ts.

---

### Pitfall 2: Journal Entries Lost on Component Unmount / Save-Load

**What goes wrong:**
The current Logbook component (Logbook.tsx) stores ALL entries in React component state (`useState<LogEntry[]>`). Entries are generated in a `useEffect` that watches `currentTurn` and `gameStateType`. This state is:
- Lost when the component unmounts (navigating away from map view)
- Lost on page reload / app restart
- Lost on save/load (game_state table stores FSM state, not journal entries)
- Not deduplicated — if `useEffect` re-runs from a React re-render with same deps, duplicate entries appear

**Why it happens:**
The Logbook was designed as a cosmetic overlay, not a persisted game system. The `lastProcessedTurn` ref (Logbook.tsx:79) prevents duplicate weather entries within a session, but refs reset on unmount. When adding the Captain's Journal as a real feature, developers naturally extend this component without moving state to persistence.

**Consequences:**
- Player saves game, loads it, journal is empty
- Player navigates to port scene and back to map, journal resets
- React StrictMode in dev causes double-mount, creating duplicate entries

**Prevention:**
1. Move journal entries to SQLite — add a `journal_entries` table with columns: `id`, `turn`, `date_text`, `entry_text`, `entry_type`, `created_at`.
2. Generate entries in the main process (game engine / IPC handler), not in a React component. When `SET_SAIL` is handled, insert departure entry. When `ARRIVE` is handled, insert arrival entry. When turn advances, insert weather entry.
3. The Logbook component becomes a read-only view that fetches entries via IPC, not a generator of entries.
4. Add an IPC channel: `journal:getEntries(sinceId?)` that returns paginated entries.
5. Keep the `turnToDate()` function but move it to shared code so both main and renderer can use it.

**Detection:**
- Journal empty after save/load
- Journal empty after navigating away and back
- Duplicate entries appearing in dev mode

**Phase to address:** Journal phase — this is the fundamental architecture decision for the feature.

---

### Pitfall 3: leaflet.motion Animation Races With React Re-renders

**What goes wrong:**
The ShipMarker component (ShipMarker.tsx) creates a `leaflet.motion.polyline` in a `useEffect`, stores it in a ref, and cleans up on unmount. But React can re-render the component (parent state change, Zustand store update, context change) WITHOUT changing the effect deps (`map`, `destination`, `departurePortId`, `portCoords`). When the parent re-renders and the effect deps DO change (e.g., portCoords Map reference changes because parent reconstructs it), the effect cleanup runs `motionStop()` + `removeLayer()`, then re-creates the animation from scratch — the ship jumps back to the start.

Additionally, `leaflet.motion` mutates the Leaflet `L` global. React-leaflet explicitly warns that "React does not render Leaflet layers to the DOM" and that properties are not updated unless documented as mutable. The `motion-ended` callback (ShipMarker.tsx:112-118) fires an IPC call that triggers a state change that causes a re-render that can destroy the animation before the state transition completes.

**Why it happens:**
leaflet.motion is an imperative Leaflet plugin (last published 4 years ago, no TS types, mutates global `L`). React-leaflet is declarative. Mixing imperative animation lifecycle with React's render cycle creates timing conflicts. The `motion-ended` -> `ARRIVE` -> state change -> re-render -> effect cleanup -> animation destroyed chain is a classic race condition.

**Consequences:**
- Ship animation restarts mid-voyage (jumps back to departure)
- Ship arrives but `ARRIVE` action fails because animation was already cleaned up
- Double `ARRIVE` actions fire (once from animation end, once from stale callback)
- `cleanedUp` boolean (ShipMarker.tsx:79) prevents some issues but not all — it doesn't prevent the re-creation race

**Prevention:**
1. Stabilize the `portCoords` reference — use `useMemo` in the parent to prevent Map reconstruction on every render. The current code passes a `Map<string, [number, number]>` that may be recreated each render.
2. Add a `sailingId` or `voyageId` to `SailingState` (a counter or UUID incremented on each `SET_SAIL`). Use it as the effect dep instead of `destination` + `departurePortId`. This ensures the animation only restarts for genuinely new voyages.
3. Guard the `motion-ended` callback with a state check: verify the game is still in `sailing` state before firing `ARRIVE`. If state has already transitioned (e.g., from a save/load), skip the action.
4. Consider replacing `leaflet.motion` with a manual `requestAnimationFrame` loop that interpolates position. This gives full control over the animation lifecycle without depending on a 4-year-old unmaintained plugin.

**Detection:**
- Ship visually jumps during sailing
- Console errors: "Invalid transition: idle -> ARRIVE"
- Double port arrival entries in journal

**Phase to address:** Sailing Animation phase — must stabilize before adding weather-dependent duration.

---

## Moderate Pitfalls

Mistakes that cause delays or degrade UX.

### Pitfall 4: Weather System Creates Invisible Difficulty Spikes

**What goes wrong:**
Seasonal weather modifies route safety and travel time. Developer implements honest Mediterranean weather patterns: winter storms make Crete-to-Egypt a 5-turn voyage instead of 2, with 60% storm encounter chance. Player has no way to know this before setting sail. They lose cargo, crew, or gold to a "random" storm that was actually predictable from the season. Educational value is zero because the student learns "the game is unfair" instead of "ancient sailors avoided winter crossings."

**Why it happens:**
The current game has no pre-voyage information system. `getReachablePorts()` (voyage.ts) returns ports with duration but no risk assessment. Weather modifiers are calculated but not surfaced to the player before they commit to `SET_SAIL`. The Logbook generates weather descriptions AFTER departure (Logbook.tsx:91-108), not before.

**Consequences:**
- Students feel cheated by "random" storms
- No educational payoff: real ancient sailors knew seasonal patterns
- Players avoid sailing entirely in dangerous seasons (game becomes unplayable for 1/4 of turns)
- Difficulty curve is invisible — no way to improve through knowledge

**Prevention:**
1. Show weather forecast BEFORE departure: "Winter crossing to Alexandria: 4 turns (normally 2). Storm risk: HIGH. Ancient sailors avoided this route in Poseideon."
2. Add a `getWeatherForecast(fromPort, toPort, currentTurn)` function that returns `{ adjustedDuration, riskLevel, historicalNote }`.
3. Display risk in the port selection / route picking UI, not just in the Logbook.
4. Keep weather effects moderate in v1.3: +1-2 turns max, 10-30% event chance modifier. Don't make routes impassable.
5. Always pair the mechanical effect with a historical teaching moment: "Phoenician captains preferred coastal routes in winter" teaches more than "+3 turns."

**Detection:**
- Playtesting: students complain about unfair storms
- Analytics: players avoid sailing for multiple consecutive turns
- No weather information visible before `SET_SAIL`

**Phase to address:** Seasonal Weather phase — forecast display must ship WITH the weather system, not after.

---

### Pitfall 5: Profit/Loss Display Shows Wrong Numbers Due to Price Timing

**What goes wrong:**
The TradePanel shows `currentPrice` for each good. The ProfitDisplay shows overall P/L as `gold - 500`. But profit per trade (the v1.3 feature: "price difference before confirming a sale") requires comparing `boughtAtPrice` (from `CargoItem`) with `currentPrice` at the selling port. Problem: `currentPrice` changes every turn via `advancePortEconomy()`. If the player buys wheat at 10g in Athens, sails for 3 turns, then checks the sell price in Carthage, the "profit display" might show the Athens price (stale) or the Carthage price (correct) depending on when the economy advanced.

**Why it happens:**
The current `CargoItem` type (game-types.ts:55-60) stores `boughtAtPrice` and `boughtAtPort`. But `currentPrice` is a property of `MarketGood` at the CURRENT port, recalculated each turn. The profit calculation is: `currentPrice - boughtAtPrice`. But which `currentPrice`? The selling port's current price. If the economy hasn't advanced for the current turn yet (race between `advancePortEconomy` and UI render), the price shown is off by one turn's worth of supply/demand drift.

**Consequences:**
- Profit indicator shows "+5g profit" but actual sale yields "+3g" (economy advanced between display and transaction)
- Player makes decisions based on stale prices
- Trust in the trade system erodes — "the numbers lie"

**Prevention:**
1. Calculate profit display using the SAME price that will be used for the transaction. Do not calculate display-side and transaction-side independently.
2. The profit indicator should call the same `calculateMarketPrice()` function with the same inputs that the buy/sell IPC handler uses. Or better: have the IPC handler return the expected profit alongside the market data.
3. Add a `profitPerUnit` computed field to the trade panel data: `profitPerUnit = currentPrice - boughtAtPrice` calculated server-side (main process) and sent to renderer.
4. Ensure `advancePortEconomy()` runs BEFORE the market data is sent to the renderer for display, not concurrently.

**Detection:**
- Player sees "+10g" in profit indicator, sells, gets "+7g"
- Profit display changes between opening trade panel and clicking sell (price drifted)

**Phase to address:** Trade Profit Display phase — must be designed alongside the economy tick timing.

---

### Pitfall 6: Seasonal Weather Breaks Existing Save Files

**What goes wrong:**
The `game_state` table stores `state_json` — a serialized `GameState`. Adding weather means adding fields: `currentSeason`, `weatherCondition`, `seasonalModifiers`. Old save files don't have these fields. Loading an old save with `JSON.parse()` produces a `GameState` without weather data. The weather system reads `state.currentSeason`, gets `undefined`, and either crashes or produces nonsensical behavior (no season = no weather = trivially easy forever).

**Why it happens:**
The current schema (schema.ts) uses `state_json TEXT` for game state — a single JSON blob. There's no migration system, no versioning on the JSON structure. Previous additions (like `departurePortId` and `route` on `SailingState`) were handled with optional fields and `?` types (types.ts:48-49). This works for small additions but becomes fragile at scale.

**Consequences:**
- Players who upgrade lose their save context (weather defaults to nothing)
- TypeScript types say `currentSeason` exists, runtime data says it doesn't
- Edge cases: player in mid-voyage when weather is added — what season are they in?

**Prevention:**
1. All new weather fields on `GameState` must be optional (`?`) with sensible defaults. `currentSeason` defaults to calculating from `currentTurn` using `turnToSeason()`.
2. Add a `version` field to the saved state JSON. When loading, check version and apply migrations: v1 -> v2 adds `currentSeason = turnToSeason(currentTurn)`.
3. Never make weather fields required on the TypeScript types — existing tests and save files will break. Use runtime defaults.
4. Add a `migrateGameState(raw: unknown): GameState` function that normalizes old saves to the current schema, filling in missing fields.
5. Test with actual v1.2 save files — don't just test with fresh games.

**Detection:**
- App crashes on load with "Cannot read property of undefined"
- Weather system silently inactive on loaded games
- Tests fail because mock GameState objects don't have weather fields

**Phase to address:** Seasonal Weather phase — migration must be part of the implementation, not an afterthought.

---

### Pitfall 7: Weather-as-Cosmetic vs Weather-as-Mechanic Confusion

**What goes wrong:**
The existing Logbook already generates "weather" text per turn (Logbook.tsx:24-36) — `generateWeather(turn)` returns flavor text like "Clear skies and calm seas." This is purely cosmetic: it doesn't affect gameplay. When adding the seasonal weather SYSTEM, developers must reconcile two weather concepts: the cosmetic Logbook weather and the mechanical weather that modifies voyage duration/risk. If they're not unified, the Logbook says "Brilliant sun" while the weather system applies a storm penalty to the route.

**Why it happens:**
The cosmetic weather was a quick addition for atmosphere. It uses `turn % conditions.length` (Logbook.tsx:36) — deterministic based on turn number, not season-aware, not route-aware. The seasonal weather system needs to be season-aware and route-aware. Two independent weather systems producing contradictory information is confusing.

**Consequences:**
- Logbook says "calm seas" while voyage takes +3 turns from storms
- Students learn contradictory information
- Code has two weather generation paths that must be kept in sync

**Prevention:**
1. Replace `generateWeather(turn)` with a call to the new weather system: `getWeatherForTurn(turn, season, region)`.
2. The weather system is the single source of truth. The Logbook consumes it, the voyage calculation consumes it, the map display consumes it.
3. Remove the hardcoded `conditions` array from Logbook.tsx entirely. Weather text comes from the weather system.
4. Same for `generateRumor()` — rumors about prices should eventually reflect actual market data, not a hardcoded rotating array.

**Detection:**
- Logbook weather contradicts voyage duration modifier
- Two different "weather" functions in the codebase
- Player confused: "It said clear skies, why did I get a storm?"

**Phase to address:** Seasonal Weather phase — must replace the existing cosmetic weather, not layer on top of it.

---

### Pitfall 8: Animation Duration Disconnect From Turn Duration

**What goes wrong:**
Current ShipMarker animates for exactly 5000ms (ShipMarker.tsx:101) regardless of voyage duration. A 1-turn coastal hop and a 5-turn open-sea crossing both take 5 seconds of animation. When weather modifies duration, the disconnect worsens: a storm-extended 8-turn voyage still animates in 5 seconds, giving no visual feedback that this voyage is longer/harder.

When the animation ends, `motion-ended` fires `ARRIVE` (ShipMarker.tsx:112-118). But if weather added turns, should the ship arrive after 5 seconds and then the player "waits" the extra turns? Or should the animation be longer? Neither is implemented — the animation just runs 5 seconds and arrives regardless of actual turn cost.

**Why it happens:**
The current `duration: 5000` is hardcoded because in v1.0, animation was a visual indicator, not a gameplay-accurate representation. With weather modifying duration, animation timing becomes gameplay-relevant.

**Consequences:**
- No visual difference between short and long voyages
- Players can't gauge voyage length from the animation
- Weather penalties are invisible during sailing
- If animation triggers ARRIVE, weather-extended voyages end too early

**Prevention:**
1. Scale animation duration by `eta`: `duration = Math.min(eta * 1500, 10000)` — 1-turn = 1.5s, 5-turn = 7.5s, capped at 10s.
2. Decouple animation completion from game state transition. Animation is visual only. The ARRIVE action should fire based on turn count, not animation end.
3. Show a turn counter during sailing: "Day 2 of 5" — this gives feedback even if the animation is shorter than real voyage time.
4. If keeping animation-triggers-arrival: ensure `eta` in the FSM already includes weather modifier so animation duration and turn cost are consistent.

**Detection:**
- All voyages feel the same length regardless of distance
- Weather modifiers have no visual feedback during sailing
- ARRIVE fires before the correct number of turns have elapsed

**Phase to address:** Sailing Animation phase — before adding weather-scaled durations.

---

## Minor Pitfalls

Annoyances that are fixable but worth preventing.

### Pitfall 9: Profit Display Clutters Already-Dense Trade Panel

**What goes wrong:**
The TradePanel (TradePanel.tsx) is already dense: curated image (120px), good name + icon + price, carrying count, quantity stepper, buy/sell buttons, inline feedback. Adding a per-good profit indicator ("You bought at 8g, sell here for 12g: +4g/unit profit") makes the panel overwhelming. On smaller screens or with many goods, the panel becomes a wall of numbers.

**Prevention:**
1. Show profit inline on the price display, not as a separate element: "12g (+4g)" in green or "12g (-2g)" in red.
2. Only show profit for goods the player is CARRYING. Don't show profit indicators for goods the player hasn't bought.
3. Use color coding, not additional text — green price = profit, red price = loss, neutral = same as bought.
4. Consider a tooltip on hover rather than always-visible profit numbers.

**Phase to address:** Trade Profit Display phase.

---

### Pitfall 10: turnToDate() Season Calculation Disagrees With Weather Season

**What goes wrong:**
The existing `turnToDate()` function (Logbook.tsx:58-67) uses Athenian month names (Hekatombaion through Skirophorion) and maps turns to months via `turn % 12`. The seasonal weather system needs to know what season it is. If the weather system calculates season independently (e.g., `turn % 4` for four seasons), it may disagree with `turnToDate()`. The Logbook shows "15 Poseideon" (winter month) while the weather system thinks it's summer.

**Prevention:**
1. Create a single `calendar.ts` module that both `turnToDate()` and the weather system use.
2. Define seasons based on Athenian months: Hekatombaion-Boedromion = summer/early fall, Pyanepsion-Poseideon = late fall/winter, Gamelion-Elaphebolion = winter/spring, Mounichion-Skirophorion = spring/summer.
3. Export `getCurrentSeason(turn)` from the same module. Weather system and Logbook both consume it.
4. Historical accuracy: Mediterranean sailing season was roughly March-October. Winter (November-February) was the mare clausum (closed sea). Map this to the Athenian months.

**Phase to address:** Seasonal Weather phase — calendar unification must happen first.

---

### Pitfall 11: Journal Grows Unbounded, Slows Down Rendering

**What goes wrong:**
If journal entries are persisted to SQLite (as recommended in Pitfall 2), a long game accumulates hundreds of entries. Loading all entries on every Logbook open causes a visible delay. The scrollable div (Logbook.tsx:206-209, maxHeight: 320px) with hundreds of DOM nodes becomes sluggish.

**Prevention:**
1. Paginate journal entries: load last 50 by default, "Load more" button for history.
2. IPC query: `journal:getEntries({ limit: 50, beforeId?: number })`.
3. Use virtual scrolling only if entry count exceeds 200 — unlikely in normal play but possible in long sessions.

**Phase to address:** Journal phase — pagination from the start.

---

## Integration Pitfalls

Mistakes when connecting new features to the existing system.

### Integration 1: Weather + Economy Double-Counting

**What goes wrong:**
Weather affects trade route viability. Economy already has supply/demand pricing. If weather also modifies supply/demand (e.g., "storms reduce wheat supply"), it creates a double feedback loop: storms raise prices AND make routes dangerous, making the game excessively punishing in bad weather and trivially easy in good weather.

**Prevention:**
1. In v1.3, weather affects ONLY voyage duration and event probability. Do NOT modify supply/demand.
2. Document this boundary explicitly: "Weather modifies routes, not markets. Market modification is a v2 feature (commodity chains)."
3. If supply/demand modification is added later, it should be a separate system with its own tuning, not piggybacked on weather.

---

### Integration 2: Journal + Animation Timing

**What goes wrong:**
Journal generates entries on state transitions (Logbook.tsx:112-141). Animation fires state transitions (ShipMarker.tsx:112-118). If animation fires `ARRIVE` before the journal processes the `sailing` -> `idle` transition, journal misses the arrival entry. Or if animation fires twice (race condition from Pitfall 3), journal records duplicate arrivals.

**Prevention:**
1. Journal entry generation must be in the main process (IPC handler for game actions), not in a React effect watching state transitions. This ensures exactly-once entry creation regardless of animation timing.
2. Each game action handler (`ARRIVE`, `SET_SAIL`, `COMPLETE_TRADE`) inserts its journal entry synchronously as part of the action processing, before returning the result to the renderer.

---

### Integration 3: Weather + ShipMarker portCoords Stability

**What goes wrong:**
Weather display on the map (weather overlay, route risk indicators) causes MapArea to re-render, which reconstructs `portCoords` Map, which triggers ShipMarker's useEffect, which restarts the animation (Pitfall 3). Weather updates every turn, meaning the animation restarts every turn during sailing.

**Prevention:**
1. Memoize `portCoords` with `useMemo` in the parent component — ports don't change, so the Map reference should be stable.
2. Weather overlay should be a separate Leaflet layer, not a prop that causes MapArea re-render.
3. Use React keys or refs to isolate ShipMarker from weather-related re-renders.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Seasonal Weather | Weather fields break save files | Optional types + migration function (Pitfall 6) |
| Seasonal Weather | Cosmetic vs mechanical weather confusion | Replace existing weather gen, single source of truth (Pitfall 7) |
| Seasonal Weather | Calendar mismatch between date display and season | Unified calendar.ts module (Pitfall 10) |
| Seasonal Weather | Invisible difficulty spikes | Forecast display ships WITH the system (Pitfall 4) |
| Captain's Journal | Entries lost on unmount/reload | SQLite persistence, main-process generation (Pitfall 2) |
| Captain's Journal | Unbounded growth | Paginate from the start (Pitfall 11) |
| Sailing Animation | leaflet.motion races with React | Stabilize deps, consider replacing plugin (Pitfall 3) |
| Sailing Animation | Duration disconnect from turns | Scale duration by eta, decouple from ARRIVE (Pitfall 8) |
| Trade Profit/Loss | Price timing mismatch | Server-side profit calculation, same price for display and transaction (Pitfall 5) |
| Trade Profit/Loss | UI clutter | Inline color-coded indicator, show only for carried goods (Pitfall 9) |
| Weather + Economy | Double feedback loop | Weather modifies routes only, not markets (Integration 1) |
| Journal + Animation | Duplicate/missing entries | Main-process entry generation (Integration 2) |

---

## "Looks Done But Isn't" Checklist for v1.3

- [ ] **Seasonal Weather:** Shows forecast before departure, not just weather after departure
- [ ] **Seasonal Weather:** Old saves load correctly with weather fields defaulted
- [ ] **Seasonal Weather:** Logbook weather matches mechanical weather (single source)
- [ ] **Seasonal Weather:** Calendar months map correctly to seasons for historical accuracy
- [ ] **Captain's Journal:** Entries persist across save/load
- [ ] **Captain's Journal:** Entries persist when navigating away from map and back
- [ ] **Captain's Journal:** No duplicate entries in dev mode (React StrictMode)
- [ ] **Sailing Animation:** Animation doesn't restart when parent re-renders
- [ ] **Sailing Animation:** Duration reflects voyage length (not hardcoded 5s)
- [ ] **Sailing Animation:** ARRIVE fires at correct game-turn, not just animation-end
- [ ] **Trade Profit:** Displayed profit matches actual sale result
- [ ] **Trade Profit:** Economy tick happens before price display, not concurrently
- [ ] **Trade Profit:** Profit only shown for goods player is carrying

---

## Sources

- Codebase analysis: `src/game/state.ts`, `src/game/types.ts`, `src/game/voyage.ts`, `src/game/economy.ts`
- Codebase analysis: `src/renderer/components/ShipMarker.tsx`, `src/renderer/components/Logbook.tsx`, `src/renderer/components/TradePanel.tsx`, `src/renderer/components/ProfitDisplay.tsx`
- Codebase analysis: `src/main/db/schema.ts`, `src/shared/game-types.ts`
- [React Leaflet Introduction — architecture note on rendering](https://react-leaflet.js.org/docs/start-introduction/)
- [leaflet.motion GitHub repository](https://github.com/Igor-Vladyka/leaflet.motion)
- [GameDev.net — Weather Modeling discussion](https://gamedev.net/forums/topic/342648-weather-modeling/3242504/)
- [Campaign Mastery — Weather, Not Climate (game weather system design)](https://www.campaignmastery.com/blog/weather-not-climate/)
- [Preserving and Resetting State in React](https://react.dev/learn/preserving-and-resetting-state)
- [Game Studies — Simulating Weather in Virtual Environments](https://gamestudies.org/0801/articles/barton)
- [Static vs dynamic weather systems in video games (academic paper)](https://www.diva-portal.org/smash/get/diva2:1524012/FULLTEXT02)

---

*Pitfalls research for: Archeology Simulator v1.3 — Gameplay Depth & Polish*
*Researched: 2026-03-31*

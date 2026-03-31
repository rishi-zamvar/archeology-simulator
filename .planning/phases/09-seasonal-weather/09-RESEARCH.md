# Phase 9: Seasonal Weather System - Research

**Researched:** 2026-03-31
**Domain:** Game logic (pure functions), Electron IPC, React renderer UI
**Confidence:** HIGH

## Summary

Phase 9 adds a seasonal weather system to the existing turn-based ancient Mediterranean trading game. The codebase is well-structured: pure game logic lives in `src/game/`, IPC handlers in `src/main/ipc/`, and React components in `src/renderer/components/`. The existing `turnToDate()` function in Logbook.tsx already maps turns to the 12 Athenian months, providing the foundation for season derivation. The event system in `events.ts` uses weighted probabilities (storm 25%, pirate 20%, calm 55%) with a 70% event-occurrence roll -- both are clean injection points for seasonal modifiers.

The save/load system stores GameState as JSON in a single SQLite row (`game_state` table). There is an existing migration pattern: `withTutorialDefault()` in both `save.ts` and `game.ts` backfills the `tutorialPhase` field on old saves. The same pattern should be used for weather/season fields, ensuring old saves load without errors.

**Primary recommendation:** Create `src/game/weather.ts` with pure functions (`getSeason`, `getWeatherModifiers`). Modify `rollVoyageEvent()` to accept seasonal weights. Intercept SET_SAIL in `game.ts` IPC handler to apply duration modifier and show mare clausum warning. Add season display to Logbook title bar. Follow the `withTutorialDefault()` pattern for save migration.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 12-month Athenian calendar maps to 4 seasons (3 months each): Spring (Elaphebolion-Thargelion), Summer (Skirophorion-Metageitnion), Autumn (Boedromion-Pyanepsion), Winter (Maimakterion-Anthesterion)
- New `src/game/weather.ts` module with pure functions: `getSeason(turn)`, `getWeatherModifiers(turn)` -- no side effects
- Duration multipliers: winter 1.5x, spring/autumn 1.0x, summer 0.8x
- Replace existing `generateWeather()` in Logbook.tsx with calls to `weather.ts` -- seasonal descriptions replace random ones
- Storm chance weighted by season: winter 40%, autumn 20%, spring 10%, summer 5%
- Existing storm events get higher probability in winter, calm events get lower probability -- no new events needed
- Mare clausum: modal dialog before SET_SAIL in winter -- "Ancient sailors avoided winter seas. Storms are likely. Sail anyway?" with Sail/Wait buttons
- "Wait for spring" advances turns to next safe season, costs gold for port fees
- Season displayed in header/status bar alongside turn counter: "Turn 5 -- Summer (Skirophorion)"
- Subtle color tint on header: warm gold (summer), blue-gray (winter) -- matches parchment aesthetic
- `migrateGameState()` adds season defaults from existing turn number -- no disruption to old saves
- Logbook entries reference the season in auto-generated text ("Winter storm", "Summer calm")

### Claude's Discretion
- Exact port fee cost for "wait for spring"
- Specific weather description text for each season
- Which existing events qualify as "storm" vs "calm" for probability weighting
- Animation/transition for season change notification

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WX-01 | Season derived from turn number using Mediterranean calendar | `turnToDate()` already maps turns to 12 Athenian months; `getSeason(turn)` groups these into 4 seasons |
| WX-02 | Voyage duration modified by seasonal weather | `calculateVoyageDuration()` in voyage.ts returns base turns; apply multiplier in game.ts IPC before SET_SAIL transition |
| WX-03 | Voyage event probabilities adjusted by season | `rollVoyageEvent()` in events.ts uses `EVENT_WEIGHTS` object; inject season-aware weights via `getWeatherModifiers()` |
| WX-04 | Mare clausum warning shown before departing in winter | Intercept in renderer before dispatching SET_SAIL (Shell.tsx `handleNavigate`); show modal; optionally "wait for spring" |
</phase_requirements>

## Architecture Patterns

### Recommended Project Structure
```
src/game/
  weather.ts          # NEW — getSeason(), getWeatherModifiers(), SEASON_CONFIG
  weather.test.ts     # NEW — pure function tests (or tests/game/weather.test.ts)
  events.ts           # MODIFY — rollVoyageEvent() accepts season param
  voyage.ts           # NO CHANGE — duration stays pure; multiplier applied at call site
  state.ts            # NO CHANGE — FSM is unchanged
  types.ts            # NO CHANGE — no new state variants needed
src/main/ipc/
  game.ts             # MODIFY — apply duration multiplier on SET_SAIL, handle WAIT_FOR_SPRING
  save.ts             # MODIFY — add migrateGameState() for old saves
src/renderer/components/
  Logbook.tsx          # MODIFY — replace generateWeather() with weather.ts calls
  Shell.tsx            # MODIFY — season display in header, mare clausum modal
  MareClausumModal.tsx # NEW — confirmation dialog for winter sailing
```

### Pattern 1: Athenian Month-to-Season Mapping
**What:** The existing `turnToDate()` uses a specific month order that starts at Hekatombaion (index 0). The CONTEXT.md specifies season groupings that must align with this order.
**When to use:** Anywhere season is derived from turn number.
**Critical detail -- month indices from turnToDate():**
```typescript
// From Logbook.tsx turnToDate():
const months = [
  'Hekatombaion',  // 0 — Summer
  'Metageitnion',  // 1 — Summer
  'Boedromion',    // 2 — Autumn
  'Pyanepsion',    // 3 — Autumn
  'Maimakterion',  // 4 — Winter
  'Poseideon',     // 5 — Winter
  'Gamelion',      // 6 — Winter
  'Anthesterion',  // 7 — Winter (note: CONTEXT says Winter = Maimakterion-Anthesterion = 4 months)
  'Elaphebolion',  // 8 — Spring
  'Mounichion',    // 9 — Spring
  'Thargelion',    // 10 — Spring
  'Skirophorion',  // 11 — Summer
];
```

**IMPORTANT DISCREPANCY:** The CONTEXT.md says "3 months each" but the actual groupings suggest:
- Spring: Elaphebolion(8), Mounichion(9), Thargelion(10) = 3 months
- Summer: Skirophorion(11), Hekatombaion(0), Metageitnion(1) = 3 months
- Autumn: Boedromion(2), Pyanepsion(3) = 2 months
- Winter: Maimakterion(4), Poseideon(5), Gamelion(6), Anthesterion(7) = 4 months

This is historically accurate (ancient Mediterranean winters were the longest dangerous sailing period). The implementation should use the named month ranges from CONTEXT.md, not force equal 3-month splits. The code should map `turn % 12` to the month index, then to season.

**Example:**
```typescript
// src/game/weather.ts
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

const MONTH_NAMES = [
  'Hekatombaion', 'Metageitnion', 'Boedromion', 'Pyanepsion',
  'Maimakterion', 'Poseideon', 'Gamelion', 'Anthesterion',
  'Elaphebolion', 'Mounichion', 'Thargelion', 'Skirophorion',
] as const;

// Month index -> season (matches turnToDate() order)
const MONTH_TO_SEASON: Season[] = [
  'summer',  // 0: Hekatombaion
  'summer',  // 1: Metageitnion
  'autumn',  // 2: Boedromion
  'autumn',  // 3: Pyanepsion
  'winter',  // 4: Maimakterion
  'winter',  // 5: Poseideon
  'winter',  // 6: Gamelion
  'winter',  // 7: Anthesterion
  'spring',  // 8: Elaphebolion
  'spring',  // 9: Mounichion
  'spring',  // 10: Thargelion
  'summer',  // 11: Skirophorion
];

export function getSeason(turn: number): { season: Season; monthName: string } {
  const monthIndex = turn % 12;
  return {
    season: MONTH_TO_SEASON[monthIndex],
    monthName: MONTH_NAMES[monthIndex],
  };
}
```

### Pattern 2: Weather Modifiers as Pure Data
**What:** Return a plain object with all seasonal effects so consumers can pick what they need.
```typescript
export interface WeatherModifiers {
  season: Season;
  monthName: string;
  durationMultiplier: number;  // applied to voyage duration
  stormWeight: number;         // replaces EVENT_WEIGHTS.storm
  calmWeight: number;          // replaces EVENT_WEIGHTS.calm
  pirateWeight: number;        // unchanged or slightly modified
  isMareClasum: boolean;       // true during winter
}

const SEASON_CONFIG: Record<Season, Omit<WeatherModifiers, 'season' | 'monthName'>> = {
  winter:  { durationMultiplier: 1.5, stormWeight: 40, calmWeight: 30, pirateWeight: 30, isMareClasum: true },
  autumn:  { durationMultiplier: 1.0, stormWeight: 20, calmWeight: 50, pirateWeight: 30, isMareClasum: false },
  spring:  { durationMultiplier: 1.0, stormWeight: 10, calmWeight: 60, pirateWeight: 30, isMareClasum: false },
  summer:  { durationMultiplier: 0.8, stormWeight: 5,  calmWeight: 70, pirateWeight: 25, isMareClasum: false },
};

export function getWeatherModifiers(turn: number): WeatherModifiers {
  const { season, monthName } = getSeason(turn);
  return { season, monthName, ...SEASON_CONFIG[season] };
}
```

### Pattern 3: Duration Modifier Integration Point
**What:** The SET_SAIL action in `game.ts` IPC handler (line 82-109) is where voyage events are rolled. Duration modification should happen here, before the SET_SAIL action is dispatched to the FSM.
**How it works now:**
1. Shell.tsx `handleNavigate()` calls `window.api.game.action({ type: 'SET_SAIL', destination, eta: 0 })`
2. game.ts IPC receives it, calls `performAction(current, action)` which runs the FSM
3. After successful transition, it calls `rollVoyageEvent(result.state.currentTurn)`

**Where to add duration modifier:**
- The `eta` field on SetSailAction is currently always `0` (set in Shell.tsx line 138)
- The actual voyage duration comes from `calculateVoyageDuration()` in `voyage.ts` and is used for `VoyageRoute.durationTurns`
- The modifier should be applied when computing the duration shown in PortInfoPanel, and when advancing turns on arrival
- Since `eta` is passed through but seems unused for actual turn advancement currently, the multiplier needs to be integrated wherever turns actually advance

**Investigation finding:** Looking at the codebase, `currentTurn` is not incremented automatically by the FSM -- it stays the same through SET_SAIL and ARRIVE. Turns seem to be managed outside the FSM. The duration multiplier should be applied to the `durationTurns` displayed in PortInfoPanel and to whatever mechanism advances turns (likely the eta field or a separate mechanism).

### Pattern 4: Save Migration
**What:** Follow the existing `withTutorialDefault()` pattern in save.ts and game.ts.
```typescript
// No new GameState fields are strictly needed if season is derived from turn.
// However, if we want to store "waiting for spring" state, we might need it.
// Recommendation: derive season purely from turn — no new state fields needed.
// migrateGameState() just ensures backward compat (which is already handled).
```

**Key insight:** Since season is purely derived from `currentTurn`, no new fields need to be persisted in GameState. The "migration" is essentially a no-op -- old saves already have `currentTurn`, and `getSeason(turn)` will work on any turn number. The only migration concern is if we add a "waiting for spring" FSM state, but the CONTEXT.md design suggests "wait for spring" just advances `currentTurn` and deducts gold, which can be handled without a new state type.

### Pattern 5: Mare Clausum Modal Integration
**What:** Intercept the sail action in the renderer before it reaches the main process.
**Where:** Shell.tsx `handleNavigate()` (line 135-142) calls `window.api.game.action({ type: 'SET_SAIL' ... })`.
**How:** Before dispatching, check `getWeatherModifiers(currentTurn).isMareClasum`. If true, show a modal. The modal offers "Sail Anyway" (dispatches normally) or "Wait for Spring" (calls a new IPC to advance turns).

**Important:** `weather.ts` is pure game logic in `src/game/` and can be imported directly in the renderer (it has no Node.js dependencies). No IPC needed for season checks.

### Anti-Patterns to Avoid
- **Adding season to GameState union:** Season is derived from turn number. Don't add it as a persisted field -- it would create a sync bug if turn advances but season isn't updated.
- **Modifying the FSM for "wait for spring":** Don't add a new GameState variant. Just advance `currentTurn` and deduct gold via a new IPC handler.
- **Modifying voyage.ts:** Keep `calculateVoyageDuration()` pure (distance-only). Apply the seasonal multiplier at the call site (game.ts IPC handler).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Season calculation | Manual date arithmetic | Simple lookup table `turn % 12` | 12 months cycle perfectly; modular arithmetic is exact |
| Event weight modification | Copy-paste EVENT_WEIGHTS | Parameterize `rollVoyageEvent(turn, seasonWeights?)` | Avoids duplicating the weighted-selection algorithm |

## Common Pitfalls

### Pitfall 1: Month-Season Mapping Off By One
**What goes wrong:** Mapping the wrong months to seasons, causing summer storms or winter calm.
**Why it happens:** The Athenian calendar month order in turnToDate() starts at Hekatombaion (midsummer), not January.
**How to avoid:** Use the exact month index array from turnToDate(). Write a test for every turn 0-11 confirming the correct season.
**Warning signs:** Seeing storm events in summer gameplay, calm weather in winter.

### Pitfall 2: Duration Multiplier Applied Wrong
**What goes wrong:** Duration either not affecting actual gameplay, or being applied twice.
**Why it happens:** The `eta` field in SetSailAction is passed through but the turn advancement mechanism is unclear.
**How to avoid:** Trace the full voyage lifecycle: SET_SAIL -> sailing -> ARRIVE. Understand where `currentTurn` increments. Apply the multiplier exactly once, at the point where base duration is calculated.
**Warning signs:** Winter voyages taking the same time as summer ones, or taking 2.25x (multiplied twice).

### Pitfall 3: Mare Clausum Blocks Non-Winter Sailing
**What goes wrong:** The modal shows up in autumn or spring.
**Why it happens:** Off-by-one in season boundaries, or checking `isMareClasum` against wrong months.
**How to avoid:** `isMareClasum` should be true only for month indices 4-7 (Maimakterion through Anthesterion).
**Warning signs:** Modal appearing during autumn voyages.

### Pitfall 4: "Wait for Spring" Turn Advancement
**What goes wrong:** Player waits for spring but ends up in a different season than expected, or gold isn't deducted.
**Why it happens:** Advancing turns by a fixed amount (e.g., +3) instead of computing the exact number of turns to reach spring (month index 8, Elaphebolion).
**How to avoid:** Calculate: `turnsToWait = (8 - (currentTurn % 12) + 12) % 12`. If already at 8, wait 12 (full year).
**Warning signs:** "Wait for spring" landing in winter or summer.

### Pitfall 5: Logbook Weather Text Not Updating
**What goes wrong:** After replacing generateWeather(), the logbook shows undefined or missing entries.
**Why it happens:** The Logbook component directly calls generateWeather() in a useEffect. If the replacement function signature changes, the effect breaks silently.
**How to avoid:** Keep the same call site pattern: `generateWeather(currentTurn)` -> `getSeasonalWeatherDescription(currentTurn)`. Same signature, different implementation.

## Code Examples

### Existing rollVoyageEvent() Modification Point
```typescript
// Current (events.ts line 474-499):
export function rollVoyageEvent(
  _turn: number,
  _fromPortId?: string,
  _toPortId?: string
): VoyageEvent | null {
  if (Math.random() > 0.7) return null;
  // Uses hardcoded EVENT_WEIGHTS: { storm: 25, pirate: 20, calm: 55 }
  // ...
}

// Proposed: add optional seasonal weights parameter
export function rollVoyageEvent(
  turn: number,
  fromPortId?: string,
  toPortId?: string,
  seasonalWeights?: { storm: number; pirate: number; calm: number }
): VoyageEvent | null {
  if (Math.random() > 0.7) return null;
  const weights = seasonalWeights ?? EVENT_WEIGHTS;
  // ... rest uses `weights` instead of `EVENT_WEIGHTS`
}
```

### Existing SET_SAIL IPC Handler Modification Point
```typescript
// Current (game.ts line 82-84):
if (action.type === 'SET_SAIL') {
  pendingVoyageEvent = null;
  const event = rollVoyageEvent(result.state.currentTurn);
  // ...
}

// Proposed: inject seasonal modifiers
if (action.type === 'SET_SAIL') {
  pendingVoyageEvent = null;
  const mods = getWeatherModifiers(result.state.currentTurn);
  const event = rollVoyageEvent(
    result.state.currentTurn,
    undefined, undefined,
    { storm: mods.stormWeight, pirate: mods.pirateWeight, calm: mods.calmWeight }
  );
  // ...
}
```

### Existing Save Migration Pattern
```typescript
// Current pattern in save.ts (line 36-39):
function withTutorialDefault(state: GameState): GameState {
  if (state.tutorialPhase !== undefined) return state;
  return { ...state, tutorialPhase: { type: 'completed' } };
}

// Weather needs NO new field -- season is derived from currentTurn.
// But if we want a version marker for future migrations:
function migrateGameState(state: GameState): GameState {
  let migrated = withTutorialDefault(state);
  // Future: add more migrations here as needed
  return migrated;
}
```

### Shell.tsx handleNavigate() Modification Point
```typescript
// Current (Shell.tsx line 135-142):
function handleNavigate(destinationPortId: string) {
  setShowFullMap(false);
  window.api.game.action({
    type: 'SET_SAIL',
    destination: destinationPortId,
    eta: 0,
  }).catch(/* ... */);
}

// Proposed: check for mare clausum before dispatching
function handleNavigate(destinationPortId: string) {
  setShowFullMap(false);
  const mods = getWeatherModifiers(gameState?.currentTurn ?? 0);
  if (mods.isMareClasum) {
    setMareClausumDest(destinationPortId); // triggers modal
    return;
  }
  window.api.game.action({
    type: 'SET_SAIL',
    destination: destinationPortId,
    eta: 0,
  }).catch(/* ... */);
}
```

### Event Classification
The existing EVENT_DATABASE has explicit `type` fields. Classification for seasonal weighting:
- **Storm events** (8 total): All events with `type: 'storm'` -- ids starting with `storm_*`
- **Calm events** (8 total): All events with `type: 'calm'` -- ids starting with `calm_*`
- **Pirate events** (8 total): All events with `type: 'pirate'` -- ids starting with `pirate_*`

No reclassification needed -- the existing `type` field perfectly maps to the seasonal weighting system.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (via npm scripts) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WX-01 | getSeason(turn) returns correct season for all 12 months | unit | `npx vitest run tests/game/weather.test.ts -t "getSeason"` | Wave 0 |
| WX-02 | getWeatherModifiers returns correct duration multiplier per season | unit | `npx vitest run tests/game/weather.test.ts -t "durationMultiplier"` | Wave 0 |
| WX-03 | rollVoyageEvent uses seasonal weights when provided | unit | `npx vitest run tests/game/weather.test.ts -t "seasonal weights"` | Wave 0 |
| WX-04 | isMareClasum is true only during winter months (indices 4-7) | unit | `npx vitest run tests/game/weather.test.ts -t "mareClasum"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/game/weather.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/game/weather.test.ts` -- covers WX-01 through WX-04 (pure function tests)
- [ ] Verify existing tests still pass after events.ts modification: `npx vitest run tests/game/state.test.ts`

## Open Questions

1. **How does currentTurn actually advance?**
   - What we know: The FSM in state.ts does NOT increment `currentTurn`. The `SET_SAIL` action preserves `currentTurn` from the previous state. The `eta` field exists on `SetSailAction` but its consumer is unclear from the files reviewed.
   - What's unclear: Where/when does `currentTurn` actually increment? This determines where the duration multiplier takes effect.
   - Recommendation: Search for `currentTurn` mutation in game.ts IPC or db queries. The multiplier must be applied wherever base duration becomes turn advancement.

2. **Port fee cost for "wait for spring"**
   - What we know: Claude's discretion per CONTEXT.md
   - Recommendation: Use 50 gold per turn waited (moderate cost -- roughly equivalent to a pirate encounter). A winter wait from Maimakterion to Elaphebolion = 4 turns = 200 gold. This is meaningful but not punishing for a player with the starting 500 gold.

## Sources

### Primary (HIGH confidence)
- `src/game/state.ts` -- FSM structure, action handling, no turn increment
- `src/game/events.ts` -- EVENT_DATABASE (24 events), EVENT_WEIGHTS, rollVoyageEvent()
- `src/game/types.ts` -- GameState union, SetSailAction with eta field
- `src/game/voyage.ts` -- calculateVoyageDuration(), haversine distance
- `src/main/ipc/game.ts` -- SET_SAIL handler, rollVoyageEvent call site, save/load
- `src/main/ipc/save.ts` -- withTutorialDefault() migration pattern, isValidGameState()
- `src/renderer/components/Logbook.tsx` -- turnToDate(), generateWeather(), month array
- `src/renderer/components/Shell.tsx` -- handleNavigate(), Logbook integration
- `src/renderer/components/PortInfoPanel.tsx` -- Sail button, onNavigate callback chain

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries needed; all changes use existing patterns
- Architecture: HIGH - all integration points identified with line numbers
- Pitfalls: HIGH - month-to-season mapping verified against actual code; migration pattern documented

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable codebase, no external dependencies changing)

# Architecture: v1.3 Gameplay Depth & Polish

**Project:** Archeology Simulator
**Researched:** 2026-03-31
**Confidence:** HIGH -- based on direct codebase analysis, no external library unknowns

## Executive Summary

The four v1.3 features -- seasonal weather, captain's journal persistence, sailing animation enhancement, and trade profit display -- integrate cleanly with the existing architecture. The codebase already has partial implementations for two of them (Logbook component, ProfitDisplay component) that need deepening rather than building from scratch. Seasonal weather is the only feature requiring new game logic. The key architectural insight: **most changes are additive, not structural**. No FSM states need adding, no new IPC patterns are required, and the existing IPCResponse<T>/wrapHandler contract handles all new channels.

## Existing Architecture (Relevant Parts)

### Current Layer Stack

```
Renderer (React 19 + Zustand)
  Shell.tsx           -- root layout, composes all floating panels
  MapArea.tsx         -- Leaflet map with PortMarker children
  ShipMarker.tsx      -- leaflet.motion polyline animation during sailing
  Logbook.tsx         -- top-center dropdown, in-memory entries only
  TradePanel.tsx      -- buy/sell with market prices
  ProfitDisplay.tsx   -- overall profit/loss + transaction history
  CargoHold.tsx       -- inventory display
    |
    | window.api (contextBridge)
    |
Main Process (Electron 35 + better-sqlite3)
  ipc/game.ts         -- game:action, trade, market, event handlers
  ipc/save.ts         -- game:load, game:save handlers
  lib/ipc-wrapper.ts  -- wrapHandler enforces IPCResponse<T>
  db/schema.ts        -- 8 tables, WAL mode
  db/queries.ts       -- atomic save, port/good/inventory CRUD
    |
Game Logic (pure TypeScript, no Electron dependency)
  state.ts            -- FSM: idle | trading | sailing | encountered
  engine.ts           -- performAction wrapper + re-exports
  voyage.ts           -- haversine distance, voyage duration calc
  economy.ts          -- supply/demand price calculation
  events.ts           -- 24 voyage events, roll/resolve logic
```

### Key Patterns to Follow

1. **IPCResponse<T> contract** -- every handler returns `{ success: true, data }` or `{ success: false, error }`, never throws
2. **wrapHandler** -- all IPC registration goes through this wrapper (validation, try/catch, logging)
3. **GameState FSM** -- discriminated union with exhaustive switch; no new states needed for v1.3
4. **Zustand stores** -- uiStore for UI state; game state managed via useGameState hook + IPC
5. **Broadcast pattern** -- `win.webContents.send('subscribe:game:updated', state)` after mutations
6. **Seeded reference data** -- INSERT OR IGNORE on every launch (ports, goods, port_inventory)
7. **Atomic transactions** -- `db.transaction(() => { ... })()` for multi-statement writes

## Feature-by-Feature Integration

---

### Feature 1: Seasonal Weather System

**What it does:** Turn number maps to a season; season affects voyage duration and event probabilities. Mediterranean sailing had a well-documented "sailing season" (March-October) and dangerous "mare clausum" (November-February).

#### New: `src/game/weather.ts`

Pure game logic module. No Electron dependency.

```typescript
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface WeatherModifiers {
  season: Season;
  durationMultiplier: number;   // 1.0 = normal, 1.5 = 50% slower
  stormChanceMultiplier: number; // multiplied into event roll weights
  description: string;           // "Calm summer seas" for logbook
}

export function getSeason(turn: number): Season { ... }
export function getWeatherModifiers(turn: number): WeatherModifiers { ... }
```

**Season mapping:** 12 turns = 1 year. Turns 0-2 = spring, 3-5 = summer, 6-8 = autumn, 9-11 = winter. This maps to the existing Logbook's `turnToDate()` which already uses 12 Athenian months.

**Historical accuracy:** Summer (Thargelion-Hekatombaion) is safest. Winter (Poseideon-Gamelion) is mare clausum -- historically ships were beached November through March.

#### Modified: `src/game/voyage.ts`

`calculateVoyageDuration()` currently returns `Math.max(1, Math.ceil(days))`. Change to accept an optional `WeatherModifiers` parameter:

```typescript
export function calculateVoyageDuration(
  from: Port, 
  to: Port, 
  weather?: WeatherModifiers
): number {
  const km = haversineDistanceKm(from, to);
  const nauticalMiles = km / 1.852;
  const baseDays = nauticalMiles / (4 * 24);
  const multiplier = weather?.durationMultiplier ?? 1.0;
  return Math.max(1, Math.ceil(baseDays * multiplier));
}
```

#### Modified: `src/game/events.ts`

`rollVoyageEvent()` currently ignores its `_turn` parameter. Wire it to weather:

```typescript
export function rollVoyageEvent(
  turn: number,
  _fromPortId?: string,
  _toPortId?: string
): VoyageEvent | null {
  const weather = getWeatherModifiers(turn);
  // Adjust storm weight by season
  const adjustedWeights = {
    storm: 25 * weather.stormChanceMultiplier,
    pirate: 20,
    calm: 55,
  };
  // ... rest of roll logic using adjustedWeights
}
```

#### Modified: `src/main/ipc/game.ts`

In the `game:action` handler for SET_SAIL, pass weather to voyage duration calculations. The weather modifiers also need to be available when computing reachable ports.

#### Renderer: Client-Side Weather Computation (Recommended)

`getSeason()` and `getWeatherModifiers()` are pure functions of turn number with no DB dependency. Import them directly in the renderer from `src/game/weather.ts` (shared module, same pattern as importing from `src/game/types.ts`). This eliminates an IPC round-trip for weather display.

A small floating widget integrated into the Logbook title bar showing current season icon + description. No new IPC channel needed.

#### DB Changes: None

Weather is a pure function of turn number. No persistence needed beyond what `game_state.state_json` already stores (which includes `currentTurn`).

#### IPC Changes: None

Weather computed where needed -- server-side in voyage/event handlers, client-side for display.

---

### Feature 2: Captain's Journal (Persistent)

**What it does:** The existing Logbook component accumulates entries in React state (lost on refresh). This feature persists journal entries to SQLite and loads them on game:load.

#### Existing State

`Logbook.tsx` already has:
- `LogEntry` type with `turn`, `date`, `text`, `type` fields
- `generateWeather(turn)` and `generateRumor(turn)` functions
- Entries for arrivals, departures, encounters
- Display with type icons and date stamps

What it lacks:
- Persistence (entries are in-memory `useState`)
- Trade entries (buy/sell events)
- Event resolution entries (outcome of pirate/storm encounters)
- Weather system entries (seasonal conditions)

#### New DB Table: `journal_entries`

```sql
CREATE TABLE IF NOT EXISTS journal_entries (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  turn      INTEGER NOT NULL,
  date_text TEXT    NOT NULL,
  text      TEXT    NOT NULL,
  type      TEXT    NOT NULL CHECK(type IN ('weather','rumor','arrival','departure','event','trade')),
  created_at TEXT   NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_journal_turn ON journal_entries (turn);
```

Add to `schema.ts` inside the existing `db.transaction()` block.

#### New DB Query Functions (in `queries.ts`)

```typescript
export function insertJournalEntry(db: Database.Database, entry: {
  turn: number; dateText: string; text: string; type: string;
}): void { ... }

export function getJournalEntries(
  db: Database.Database, limit?: number
): JournalEntry[] { ... }

export function clearJournal(db: Database.Database): void { ... }
```

#### New IPC Channels

Two new channels following the existing wrapHandler pattern:

```typescript
wrapHandler('game:getJournal', async (limit?: number) => getJournalEntries(db, limit));
wrapHandler('game:addJournalEntry', async (entry) => {
  insertJournalEntry(db, entry);
  broadcastJournalUpdate(db);
});
```

#### Server-Side Auto-Journaling

The critical design decision: **journal entries for game events are generated server-side**, not in the renderer. This ensures entries are persisted even if the renderer crashes or refreshes.

Insert journal entries in existing IPC handlers:
- `game:buyGood` / `game:sellGood` -- insert trade entry after successful transaction
- `game:resolveEvent` -- insert event outcome entry after resolution
- `game:action` (SET_SAIL) -- insert departure entry
- `game:action` (ARRIVE / START_TRADE) -- insert arrival entry

Weather and rumor entries are generated per-turn when a new turn begins (detected by turn number advancing).

#### Modified: `src/renderer/components/Logbook.tsx`

Major refactor:
- Remove `useState<LogEntry[]>` -- replace with entries loaded from IPC
- On mount: `window.api.game.getJournal()` to load persisted entries
- Subscribe to `subscribe:journal:updated` for live updates
- Remove `generateWeather()` and `generateRumor()` (moved server-side)
- Keep display logic and styling intact

#### Modified: `src/shared/ipc-types.ts` (IPCBridge)

```typescript
getJournal: (limit?: number) => Promise<IPCResponse<JournalEntry[]>>;
addJournalEntry: (entry: { turn: number; dateText: string; text: string; type: string }) => Promise<IPCResponse<void>>;
```

#### Modified: `src/main/preload.ts`

Add corresponding `ipcRenderer.invoke` wrappers for the two new channels.

---

### Feature 3: Sailing Animation Enhancement

**What it does:** The existing ShipMarker already animates the ship along a polyline using leaflet.motion. The enhancement makes the animation more visible and informative: visible route line, dynamic duration, and a sailing info overlay.

#### Existing State

`ShipMarker.tsx` already:
- Creates a leaflet.motion polyline between departure and destination
- Uses a custom SVG ship icon (DivIcon)
- Fires ARRIVE + START_TRADE on `motion-ended`
- Has 5-second fixed animation duration
- Sets polyline color to `transparent` (invisible route line)

#### Enhancements (within existing component)

1. **Visible route line:** Change polyline color from `transparent` to a dashed sepia line
2. **Dynamic duration:** Scale animation duration by voyage distance (currently hardcoded 5s). Use `route.durationTurns` from SailingState: `Math.min(10_000, durationTurns * 2_000)`
3. **Weather-aware styling:** If winter, add a visual indicator (e.g., slight CSS animation on ship icon, or route line in different color)

#### Modified: `src/renderer/components/ShipMarker.tsx`

```typescript
// Change polyline options from transparent to visible dashed line
{
  color: '#7a5c45',
  weight: 2,
  dashArray: '8, 6',
  opacity: 0.5,
}

// Dynamic duration based on route
{
  auto: true,
  duration: Math.min(10_000, (sailingState.route?.durationTurns ?? 3) * 2_000),
}
```

#### New: `src/renderer/components/SailingOverlay.tsx`

A floating panel shown during sailing state (positioned where PortScene normally sits when trading). Displays destination name, weather conditions, estimated arrival, and distance.

```typescript
interface SailingOverlayProps {
  destination: string;
  departurePort: string;
  route?: VoyageRoute;
  currentTurn: number;
}
```

#### Modified: `src/renderer/components/Shell.tsx`

Add `SailingOverlay` rendering when `gameState.type === 'sailing'`:

```tsx
{isSailing && sailingState && (
  <SailingOverlay
    destination={sailingState.destination}
    departurePort={sailingState.departurePortId ?? ''}
    route={sailingState.route}
    currentTurn={sailingState.currentTurn}
  />
)}
```

#### No IPC/DB Changes

All animation is client-side (Leaflet + React). Weather modifiers computed from pure function imported directly.

---

### Feature 4: Trade Profit/Loss Indicator

**What it does:** Before confirming a sell, show the profit/loss compared to the purchase price. The existing ProfitDisplay shows overall P&L; this adds per-item trade preview.

#### Existing State

`TradePanel.tsx` already shows each MarketGood with buy/sell buttons. `CargoItem` already tracks `boughtAtPrice`. The data needed for profit calculation is already in the renderer.

`ProfitDisplay.tsx` shows overall profit (gold - 500) and last 10 transactions. Already functional -- no changes needed.

#### Enhancement: Per-Item Profit Preview in TradePanel

No new IPC channels needed. All data is already available:

- `MarketGood.currentPrice` -- what the port pays per unit
- `CargoItem.boughtAtPrice` -- what the player paid per unit
- `qty` -- selected quantity from the stepper

#### Modified: `src/renderer/components/TradePanel.tsx`

Add a profit indicator between the carrying count and the buy/sell buttons when the player is carrying that good:

```tsx
{carried > 0 && (() => {
  const cargoItem = inventory.cargoItems.find(c => c.goodId === good.id);
  if (!cargoItem) return null;
  const profitPerUnit = good.currentPrice - cargoItem.boughtAtPrice;
  const totalProfit = profitPerUnit * qty;
  const isProfit = totalProfit >= 0;
  return (
    <div style={{
      fontSize: '0.7rem',
      fontFamily: "'Lora', Georgia, serif",
      color: isProfit ? '#2b5c4a' : '#8b2e2e',
      fontStyle: 'italic',
      marginBottom: '0.2rem',
    }}>
      Sell {qty}: {isProfit ? '+' : ''}{totalProfit}g
      ({profitPerUnit >= 0 ? '+' : ''}{profitPerUnit}g/unit)
    </div>
  );
})()}
```

#### No IPC/DB/FSM Changes

Purely renderer-side calculation using data already available from `getMarketPrices` and `getPlayerInventory`.

---

## New vs Modified Summary

### New Files

| File | Layer | Purpose |
|------|-------|---------|
| `src/game/weather.ts` | Game logic | Season/weather pure functions |
| `src/renderer/components/SailingOverlay.tsx` | Renderer | Sailing info panel during voyage |

### Modified Files

| File | Change Scope | What Changes |
|------|-------------|--------------|
| `src/game/voyage.ts` | Small | `calculateVoyageDuration` accepts optional weather modifier |
| `src/game/events.ts` | Small | `rollVoyageEvent` uses weather-adjusted storm weights |
| `src/game/engine.ts` | Tiny | Re-export weather utilities |
| `src/main/db/schema.ts` | Small | Add `journal_entries` table |
| `src/main/db/queries.ts` | Medium | Add journal CRUD functions |
| `src/main/ipc/game.ts` | Medium | Add journal IPC handlers, insert entries on trade/event/navigation |
| `src/shared/ipc-types.ts` | Small | Add journal channels to IPCBridge, export JournalEntry type |
| `src/main/preload.ts` | Small | Add journal IPC wrappers |
| `src/renderer/components/Logbook.tsx` | Large | Load from DB, subscribe to updates, remove local state generation |
| `src/renderer/components/ShipMarker.tsx` | Medium | Visible route line, dynamic duration |
| `src/renderer/components/TradePanel.tsx` | Small | Add profit preview per good |
| `src/renderer/components/Shell.tsx` | Medium | Add SailingOverlay, pass weather info |

### Unchanged Files

| File | Why |
|------|-----|
| `src/game/state.ts` | No new FSM states -- weather/journal don't change game phases |
| `src/game/types.ts` | GameState union unchanged |
| `src/renderer/stores/uiStore.ts` | No new UI state needed |
| `src/renderer/components/ProfitDisplay.tsx` | Already functional for overall P&L |
| `src/renderer/components/CargoHold.tsx` | Unchanged |
| `src/renderer/components/EventCard.tsx` | Unchanged (event outcomes auto-journaled server-side) |
| `src/main/ipc/save.ts` | Unchanged -- journal is separate from game state save |

## Data Flow Diagrams

### Weather Flow

```
Turn number (in GameState.currentTurn)
    |
    v
getSeason(turn) --> Season enum
    |
    v
getWeatherModifiers(turn) --> { durationMultiplier, stormChanceMultiplier, description }
    |
    +--> voyage.ts: calculateVoyageDuration(from, to, weather) [server-side]
    +--> events.ts: rollVoyageEvent(turn) uses weather internally [server-side]
    +--> Logbook title bar: displays season icon + name [client-side, same pure function]
    +--> SailingOverlay.tsx: shows weather conditions [client-side, same pure function]
```

### Journal Flow

```
Game Events (server-side)                Renderer (client-side)
    |                                         |
    | trade completed                         |
    | event resolved                          |
    | port arrived/departed                   |
    | new turn (weather + rumor)              |
    v                                         |
insertJournalEntry(db, entry)                 |
    |                                         |
    v                                         |
broadcastJournalUpdate()  -- subscribe:journal:updated -->  Logbook.tsx re-fetches
                                              |
                          <-- game:getJournal (on mount) --  useEffect initial load
```

### Trade Profit Flow (Client-Only)

```
TradePanel receives: marketGoods[] + inventory (both already fetched via existing IPC)
    |
    v
For each good where player carries > 0:
  profitPerUnit = good.currentPrice - cargoItem.boughtAtPrice
  totalProfit = profitPerUnit * selectedQty
    |
    v
Render inline: "Sell 3: +36g (+12g/unit)" or "Sell 2: -16g (-8g/unit)"
```

## Build Order (Dependency-Aware)

The recommended build order minimizes blocked work and respects dependencies:

### Step 1: Weather System (foundation -- unblocks Steps 2 and 3)

1. Create `src/game/weather.ts` -- pure functions, testable in isolation
2. Modify `src/game/voyage.ts` -- integrate weather into duration calc
3. Modify `src/game/events.ts` -- integrate weather into event roll
4. Modify `src/game/engine.ts` -- re-export weather utilities

**Why first:** Both journal entries and sailing overlay reference weather. Building weather first unblocks both.

### Step 2: Journal Persistence (largest scope)

5. Add `journal_entries` table to `src/main/db/schema.ts`
6. Add journal CRUD to `src/main/db/queries.ts`
7. Add journal IPC channels to `src/main/ipc/game.ts` + types + preload
8. Add auto-journaling in existing trade/event/navigation handlers
9. Refactor `Logbook.tsx` to load from DB and subscribe to updates

**Why second:** Largest refactor. Depends on weather for seasonal entries.

### Step 3: Sailing Animation + Overlay (visual polish)

10. Modify `ShipMarker.tsx` -- visible route line, dynamic duration
11. Create `SailingOverlay.tsx` -- voyage info panel with weather display
12. Wire SailingOverlay into Shell.tsx

**Why third:** Benefits from weather module for display. Independent of journal.

### Step 4: Trade Profit Indicator (smallest, zero dependencies)

13. Modify `TradePanel.tsx` -- add per-item profit preview

**Why last:** Smallest change, no dependencies on other features. Pure renderer-side arithmetic.

## Architecture Anti-Patterns to Avoid

### 1. Do Not Add GameState FSM Variants for Weather

Weather is a modifier on existing states, not a new state. The FSM must remain `idle | trading | sailing | encountered`. Adding `type: 'sailing_storm'` would break exhaustive switches across the codebase and violate the principle that weather is a continuous condition, not a discrete phase.

### 2. Do Not Store Weather in a DB Table

Weather is a deterministic function of turn number. Creating a `weather` table would duplicate derived data. Compute it from `currentTurn` wherever needed.

### 3. Do Not Generate Journal Entries Client-Side

Journal entries for trades, events, and navigation must be generated server-side (in IPC handlers) where the authoritative game state lives. If the renderer generates entries and sends them via IPC, you risk: (a) entries lost on renderer crash, (b) duplicate entries on reconnect, (c) untrusted data in the journal.

### 4. Do Not Create a Separate Zustand Store for Journal

The journal is server-authoritative data (like ports or transactions). Use the same fetch-on-mount + subscribe-to-broadcast pattern used by `useTradeState` and `useGameState`. A journalStore would create a parallel source of truth.

### 5. Preserve ShipMarker's Cleanup Pattern

ShipMarker has a careful cleanup pattern with `cleanedUp` flag and `motionLayerRef`. Any enhancements must preserve this pattern to avoid memory leaks and ghost `motion-ended` event handlers. The `cleanedUp` guard prevents the ARRIVE action from firing after component unmount.

### 6. Do Not Modify the `game_state` Table Schema

Weather and journal data should not be added to `game_state.state_json`. The game state blob stores only FSM state (type, turn, destination, etc.). Journal entries get their own table. Weather is computed, not stored.

## Scalability Notes

These features are all well within the current architecture's capacity:

- **Journal entries:** SQLite handles millions of rows. A 100-turn game produces ~300 entries max. No pagination needed for v1.3.
- **Weather computation:** Pure arithmetic, sub-millisecond. No caching needed.
- **Animation:** leaflet.motion already handles one animation at a time. No change in performance profile.
- **Trade profit:** Simple arithmetic on data already in memory. Zero overhead.

## Sources

- Direct codebase analysis of all files listed above (HIGH confidence)
- Existing patterns from v1.0-v1.2 architecture (HIGH confidence)
- Mediterranean sailing season history: training data on ancient maritime practices (MEDIUM confidence -- historically well-documented period, but specific multiplier values are design decisions, not historical facts)

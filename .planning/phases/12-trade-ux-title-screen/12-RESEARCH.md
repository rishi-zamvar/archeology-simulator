# Phase 12: Trade UX & Title Screen - Research

**Researched:** 2026-03-31
**Domain:** React UI components, Electron IPC, game state management
**Confidence:** HIGH

## Summary

Phase 12 adds two independent features: (1) profit/loss indicators in the TradePanel before confirming sales, and (2) a title screen shown on app launch. Both features are well-supported by the existing codebase.

The trade P&L feature is straightforward because CargoItem already stores `boughtAtPrice` and `boughtAtPort` -- the purchase provenance data is already available in the renderer via `useTradeState` -> `inventory.cargoItems`. The TradePanel just needs to compare `boughtAtPrice` against `currentPrice` from `marketGoods` and display the delta. No new IPC channels or DB queries are needed for TRD-01/TRD-02/TRD-03.

The title screen (UI-01) requires a new component and a minor state management change. Currently, `useGameState` loads state on mount and `Shell.tsx` renders the game immediately. A title screen needs to intercept this flow: check if a save exists, show the title screen, and only load/create game state when the user clicks Continue or New Game. This requires one new IPC channel (`game:hasSave`) and a gating state in Shell.

**Primary recommendation:** Implement trade P&L as pure UI work in TradePanel using existing cargo data. Implement title screen as a new TitleScreen component gated by a `showTitle` state in Shell, with a lightweight `game:hasSave` IPC check.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Implementation Decisions (Locked)
- Show green/red indicator per cargo item in TradePanel for profit (current price > purchase price) or loss
- Display purchase port and turn for each cargo item (from transaction_history or cargo metadata)
- Total P&L preview updates dynamically as quantity slider changes
- Use existing transaction_history table to look up original purchase price per good
- Add purchase_price and purchase_port fields to cargo items (either in cargo_json or via transaction_history lookup)
- IPC channel to retrieve purchase details for current cargo
- New TitleScreen component shown when no game state is loaded or on fresh launch
- Parchment-themed with game title, brief Mediterranean merchant description
- "New Game" button always visible
- "Continue" button visible only if a save exists (check via IPC)
- After clicking Continue, load saved state and transition to normal game view
- After New Game, reset game state and start fresh

### Claude's Discretion
- Title screen layout, typography, and imagery
- Whether to show a historical quote or flavor text
- Animation/transition from title screen to game
- Exact P&L display format (percentage vs absolute vs both)

### Deferred Ideas (OUT OF SCOPE)
None -- autonomous mode.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRD-01 | Profit/loss per item shown (green/red) before confirming a sale | CargoItem already has `boughtAtPrice`; compare with `MarketGood.currentPrice` in TradePanel row |
| TRD-02 | Total profit/loss preview for the quantity being sold | Multiply per-unit delta by selected quantity; update reactively as quantity stepper changes |
| TRD-03 | Purchase price history shown for each cargo item (where and when bought) | CargoItem has `boughtAtPort`; `boughtAtPrice` is per-unit. Port name resolution via existing port data. Turn info available via transaction_history |
| UI-01 | Entry screen with game description, continue (if save exists), and new game option | New TitleScreen component + `game:hasSave` IPC channel + Shell gating logic |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | (existing) | UI components | Already in use across all renderer components |
| Electron IPC | (existing) | Main-renderer communication | All game data flows through `wrapHandler` + `IPCBridge` |
| better-sqlite3 | (existing) | Persistence layer | `loadGameState` already returns null when no save exists |
| vitest | (existing) | Test framework | Existing test suite uses vitest |

### Supporting
No new libraries needed. All features can be built with existing stack.

## Architecture Patterns

### Recommended File Structure
```
src/
  renderer/
    components/
      TradePanel.tsx          # MODIFY: add P&L indicators per cargo row
      TitleScreen.tsx         # NEW: title screen component
      Shell.tsx               # MODIFY: gate rendering with title screen
  main/
    ipc/
      save.ts                 # MODIFY: add game:hasSave handler
  shared/
    ipc-types.ts              # MODIFY: add hasSave to IPCBridge
  main/
    preload.ts                # MODIFY: expose hasSave channel
```

### Pattern 1: P&L Calculation in TradePanel (Pure UI)

**What:** Calculate profit/loss per unit by comparing `CargoItem.boughtAtPrice` with `MarketGood.currentPrice`. No new data fetching needed.

**When to use:** For TRD-01, TRD-02, TRD-03.

**Key data flow:**
```typescript
// Already available in TradePanel via props:
// - marketGoods: MarketGood[] (has currentPrice per good)
// - inventory: PlayerInventory (has cargoItems with boughtAtPrice, boughtAtPort)

// Per-unit P&L for a given good:
const cargoForGood = inventory.cargoItems.filter(c => c.goodId === good.id);
// Note: player may have bought same good at different prices/ports
// Each CargoItem is a separate batch with its own boughtAtPrice

// Weighted average purchase price across batches:
const totalQty = cargoForGood.reduce((s, c) => s + c.quantity, 0);
const totalCost = cargoForGood.reduce((s, c) => s + c.quantity * c.boughtAtPrice, 0);
const avgPurchasePrice = totalQty > 0 ? totalCost / totalQty : 0;
const profitPerUnit = good.currentPrice - avgPurchasePrice;

// Total P&L for selected quantity:
const totalPL = profitPerUnit * selectedQty;
```

**Display format (recommendation):** Show both absolute and per-unit:
```
+12g/unit (+48g total)   // green
-3g/unit (-15g total)    // red
```

### Pattern 2: Cargo Purchase Provenance Display

**What:** Show where and when each cargo item was purchased.

**Key insight:** `CargoItem` already has `boughtAtPort` (port ID string like 'athens') and `boughtAtPrice`. The port *name* needs resolving -- either by passing port data down or maintaining a simple ID-to-name map.

**Approach:** The `boughtAtPort` stores port IDs. Port ancient names are available via `getAllPorts` / `getPortDetails` IPC. Rather than adding new IPC, use the port data already loaded in Shell (portCoords map exists; extend to include names or pass a lookup function).

**For turn info:** The CONTEXT.md mentions showing "when" purchased. The `CargoItem` type does NOT have a `boughtAtTurn` field. Options:
1. Add `boughtAtTurn` to `CargoItem` interface and populate during buy -- cleanest, requires updating `buyGood` in queries.ts
2. Cross-reference `transaction_history` -- more complex, already loaded by `useTradeState` as `transactions`

**Recommendation:** Option 1 -- add `boughtAtTurn: number` to `CargoItem` in game-types.ts and populate it in the `buyGood` query function. This is a one-line schema change (no DB migration needed since cargo is stored as JSON in game_state).

### Pattern 3: Title Screen Gating

**What:** Show a TitleScreen component before the game loads.

**Current flow:**
1. `Shell` mounts -> `useGameState()` calls `game:load` -> always returns a state (INITIAL_STATE if no save)
2. Game renders immediately

**New flow:**
1. `Shell` mounts -> check `game:hasSave` IPC
2. If result received, show `TitleScreen` with Continue (if save exists) / New Game
3. On Continue: load existing state via `game:load`, transition to game
4. On New Game: reset state (delete save + reinitialize), transition to game

**Implementation:**
```typescript
// In Shell.tsx:
const [screen, setScreen] = useState<'title' | 'game'>('title');
const [hasSave, setHasSave] = useState(false);

useEffect(() => {
  window.api.game.hasSave().then(res => {
    if (res.success) setHasSave(res.data);
  });
}, []);

if (screen === 'title') {
  return <TitleScreen hasSave={hasSave} onContinue={...} onNewGame={...} />;
}
// ... existing Shell rendering
```

**New Game reset:** Need a `game:newGame` IPC handler that:
1. Deletes the `game_state` row (or resets to INITIAL_STATE)
2. Clears `transaction_history` and `journal_entries`
3. Resets `player_inventory` to defaults
4. Returns fresh INITIAL_STATE

### Pattern 4: Port Name Resolution for Cargo Display

**What:** Convert port IDs to display names for purchase provenance.

**Current state:** Shell.tsx already loads ports and builds `portCoords` map. The port data includes `ancientName`.

**Approach:** Build a `portNames` map alongside `portCoords` in Shell, pass to TradePanel. Or simpler: since TradePanel already receives `portName` for the current port, add a `portNames: Record<string, string>` prop.

### Anti-Patterns to Avoid
- **Adding new DB tables for P&L:** The data already exists in CargoItem and MarketGood. Don't over-engineer.
- **Complex FIFO/LIFO sell order logic:** The sell function already handles which CargoItem batches to sell from (queries.ts line 517). P&L display should match the sell order.
- **Blocking on transaction_history for purchase info:** CargoItem has the purchase data directly. Use it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Port ID to name mapping | Custom lookup service | Map from already-loaded port data in Shell | Ports are already fetched on mount |
| P&L color coding | Custom color logic | Simple ternary: `profitPerUnit > 0 ? '#2b5c4a' : '#8b2e2e'` | Matches existing green/red color scheme in codebase |
| Game state reset | Manual SQL cleanup | Single transaction that resets all tables | Atomicity matters |

## Common Pitfalls

### Pitfall 1: Multiple Cargo Batches at Different Prices
**What goes wrong:** Player buys 5 wheat at Athens for 10g, then 3 wheat at Carthage for 15g. Showing P&L per good requires handling multiple purchase prices.
**Why it happens:** CargoItem stores separate batches -- `cargoItems` is an array, not a map.
**How to avoid:** Calculate weighted average purchase price across all batches of the same good, OR show per-batch breakdown.
**Warning signs:** P&L numbers don't match expectations when player bought same good at different ports.

### Pitfall 2: Title Screen Race Condition with useGameState
**What goes wrong:** `useGameState` loads game state on mount. If TitleScreen is shown first but useGameState still fires, the game state loads unnecessarily.
**Why it happens:** Shell currently calls `useGameState()` unconditionally.
**How to avoid:** Only call `useGameState()` after user clicks Continue/New Game, OR gate the IPC call inside the hook with a `shouldLoad` parameter.
**Warning signs:** Network/IPC calls firing before title screen interaction.

### Pitfall 3: New Game Doesn't Clear All Data
**What goes wrong:** Starting a new game leaves orphaned transaction_history, journal_entries, or stale cargo data.
**Why it happens:** Multiple tables store game-related data; clearing just `game_state` is insufficient.
**How to avoid:** The `newGame` handler must clear: `game_state`, `transaction_history`, `journal_entries`. Use a single DB transaction.
**Warning signs:** Journal entries from previous game appearing in new game.

### Pitfall 4: Port Name for 'salvaged' Cargo
**What goes wrong:** Event outcomes can create cargo with `boughtAtPort: 'salvaged'` (see game.ts line 448-449). Port name lookup will fail for this ID.
**Why it happens:** Events use synthetic port IDs not in the ports table.
**How to avoid:** Handle special port IDs in the display: `portNames[portId] ?? portId` with title-casing fallback.
**Warning signs:** "undefined" or crash when displaying cargo from pirate events.

## Code Examples

### P&L Indicator Component
```typescript
// Inline in TradePanel row, after "Carrying: X" line
const avgPrice = totalQty > 0 ? totalCost / totalQty : 0;
const delta = good.currentPrice - avgPrice;
const isProfit = delta > 0;
const totalDelta = delta * qty;

// Display:
<div style={{
  ...SUBTEXT,
  fontSize: '0.7rem',
  color: isProfit ? '#2b5c4a' : delta < 0 ? '#8b2e2e' : '#7a5c45',
  fontWeight: 600,
}}>
  {delta > 0 ? '+' : ''}{Math.round(delta)}g/unit
  ({delta > 0 ? '+' : ''}{Math.round(totalDelta)}g total)
</div>
```

### hasSave IPC Handler
```typescript
// In save.ts:
wrapHandler<boolean>(
  'game:hasSave',
  async () => {
    const row = db.prepare('SELECT 1 FROM game_state WHERE id = 1').get();
    return row !== undefined;
  },
);
```

### New Game Handler
```typescript
// In save.ts or game.ts:
wrapHandler<GameState>(
  'game:newGame',
  async () => {
    const reset = db.transaction(() => {
      db.prepare('DELETE FROM game_state').run();
      db.prepare('DELETE FROM transaction_history').run();
      db.prepare('DELETE FROM journal_entries').run();
      // Re-insert fresh state
      saveGameStateAtomic(db, INITIAL_STATE);
    });
    reset();
    return INITIAL_STATE;
  },
);
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest |
| Config file | vitest uses package.json scripts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRD-01 | P&L per unit shown green/red | unit (pure calc) | `npx vitest run tests/trade/profitLoss.test.ts -t "per-unit"` | Wave 0 |
| TRD-02 | Total P&L updates with quantity | unit (pure calc) | `npx vitest run tests/trade/profitLoss.test.ts -t "total"` | Wave 0 |
| TRD-03 | Purchase history shown | unit (data shape) | `npx vitest run tests/trade/profitLoss.test.ts -t "provenance"` | Wave 0 |
| UI-01 | Title screen with new/continue | unit (hasSave IPC) | `npx vitest run tests/db/save.test.ts -t "hasSave"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- [ ] `tests/trade/profitLoss.test.ts` -- covers TRD-01, TRD-02, TRD-03 (P&L calculation logic)
- [ ] `tests/db/save.test.ts` -- add hasSave and newGame test cases for UI-01

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `CargoItem` interface in `game-types.ts` (lines 54-59) confirms `boughtAtPrice` and `boughtAtPort` fields exist
- Direct codebase inspection: `TradePanel.tsx` receives `marketGoods` (with `currentPrice`) and `inventory` (with `cargoItems`) -- all data for P&L is already available
- Direct codebase inspection: `loadGameState()` in `queries.ts` returns `null` when no save exists -- basis for `hasSave` check
- Direct codebase inspection: `save.ts` line 18 shows `INITIAL_STATE` pattern for fresh games
- Direct codebase inspection: `game.ts` line 448-449 shows `boughtAtPort: 'salvaged'` edge case

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries needed, all existing patterns
- Architecture: HIGH -- straightforward extension of existing patterns (TradePanel props, IPC channels, Shell gating)
- Pitfalls: HIGH -- identified from direct code inspection (multi-batch cargo, salvaged port, race condition)

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable -- no external dependencies changing)

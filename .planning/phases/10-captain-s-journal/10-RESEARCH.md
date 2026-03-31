# Phase 10: Captain's Journal - Research

**Researched:** 2026-03-31
**Domain:** SQLite persistence, Electron IPC, React UI (journal/log component)
**Confidence:** HIGH

## Summary

Phase 10 evolves the existing ephemeral Logbook component into a persistent Captain's Journal backed by SQLite. The current Logbook.tsx stores entries in React component state (useState), meaning all entries are lost on reload. The journal must persist entries across restarts and save/load cycles, auto-log trades/events/arrivals/departures, and allow player-written notes.

The codebase already has all the patterns needed: better-sqlite3 with WAL mode, atomic transactions via `db.transaction()`, the `wrapHandler` IPC contract returning `IPCResponse<T>`, structured logging via `createLogger()`, and the `contextBridge` preload pattern. The existing `transaction_history` table demonstrates the exact INSERT pattern needed. No new libraries are required -- this is purely an integration phase using established patterns.

**Primary recommendation:** Add a `journal_entries` table via schema migration, create query functions following the `buyGood`/`sellGood` pattern, wire two new IPC channels (`journal:getEntries`, `journal:addNote`), inject auto-logging calls into existing trade/event/state-transition handlers, and refactor Logbook.tsx to load entries from the database instead of component state.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- New `journal_entries` SQLite table with columns: id, turn, entry_type, title, body_json, created_at
- Entry types: trade, voyage_event, arrival, departure, note (player-written)
- body_json stores structured data per type (trade: goods/qty/price/port, event: type/outcome, etc.)
- Persisted via existing atomic transaction pattern (db.transaction())
- Evolve existing Logbook.tsx into a persistent journal -- replace component-state entries with DB-backed entries
- Keep existing entry type icons (weather, rumor, arrival, departure, event, trade)
- Add a "Write Note" input at the bottom of the journal for player reflections
- Maintain the pixel-art aesthetic with PressStart2P font, black/beige palette (NOTE: project actually uses Cinzel/Lora parchment aesthetic, not PressStart2P)
- Scrollable list with newest entries at top, grouped by turn/date
- Trade completion (buyGood/sellGood IPC handlers) -> auto-create trade journal entry
- Voyage events (ENCOUNTER -> RESOLVE flow) -> auto-create event journal entry
- State transitions (ARRIVE, SET_SAIL) -> auto-create arrival/departure entries
- Weather entries from getSeasonalWeatherDescription() continue as before
- New IPC channels: journal:getEntries, journal:addNote

### Claude's Discretion
- Exact journal entry formatting and text templates
- Whether to add a journal entry count badge or notification
- Migration strategy for existing Logbook entries vs clean break
- Whether weather/rumor entries should also be persisted or remain ephemeral

### Deferred Ideas (OUT OF SCOPE)
None -- autonomous mode.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| JRN-01 | Journal entries persisted in SQLite (survive restart and save/load) | New `journal_entries` table, loadGameState pattern already handles persistence; entries survive restart by being DB-backed rather than component state |
| JRN-02 | Trades auto-logged (buy/sell with prices, quantities, port) | Insert into journal_entries inside existing `buyGood`/`sellGood` query functions, which already run in db.transaction() |
| JRN-03 | Voyage events auto-logged (encounters, decisions, outcomes) | Insert into journal_entries inside `game:resolveEvent` IPC handler after outcome is applied |
| JRN-04 | Port arrivals and departures auto-logged with calendar dates | Insert into journal_entries in `game:action` handler when action is ARRIVE or SET_SAIL; use existing turnToDate() |
| JRN-05 | Player can write personal notes/reflections in the journal | New `journal:addNote` IPC channel + text input UI in Logbook.tsx |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | 12.6.2 | SQLite persistence | Already in use; synchronous API ideal for atomic journal writes within existing transactions |
| React | 19 | Journal UI component | Already in use; Logbook.tsx is the target component |
| Electron | 35 | IPC bridge | Already in use; wrapHandler + contextBridge pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | - | - | All required infrastructure exists in the codebase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SQLite journal_entries | JSON file | SQLite already in use, JSON would be a second persistence mechanism -- unnecessary complexity |
| Separate journal DB | Same DB file | Single DB file simplifies backup/restore; journal_entries is just another table |

## Architecture Patterns

### Recommended Project Structure
```
src/
  main/
    db/
      schema.ts          # ADD: journal_entries table creation
      queries.ts         # ADD: insertJournalEntry(), getJournalEntries()
    ipc/
      game.ts            # MODIFY: inject journal writes into buy/sell/action/resolve handlers
      journal.ts         # NEW: journal:getEntries, journal:addNote IPC handlers
    preload.ts           # MODIFY: expose journal channels on window.api
    lib/
      logger.ts          # Existing (use for journal module logging)
  shared/
    ipc-types.ts         # MODIFY: add journal types to IPCBridge
    game-types.ts        # MODIFY: add JournalEntry type
  renderer/
    components/
      Logbook.tsx         # MODIFY: replace useState entries with DB-backed entries via IPC
```

### Pattern 1: Journal Entry Insertion (follows buyGood/sellGood pattern)
**What:** Synchronous insert within existing transaction context
**When to use:** Every auto-logged entry (trade, event, arrival, departure)
**Example:**
```typescript
// Source: existing pattern in queries.ts buyGood/sellGood
export function insertJournalEntry(
  db: Database.Database,
  turn: number,
  entryType: 'trade' | 'voyage_event' | 'arrival' | 'departure' | 'note',
  title: string,
  bodyJson: Record<string, unknown>
): void {
  db.prepare(`
    INSERT INTO journal_entries (turn, entry_type, title, body_json, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(turn, entryType, title, JSON.stringify(bodyJson));
}
```

### Pattern 2: IPC Handler Registration (follows wrapHandler pattern)
**What:** New IPC handlers for journal read/write
**When to use:** journal:getEntries, journal:addNote
**Example:**
```typescript
// Source: established pattern in game.ts, save.ts
import { wrapHandler } from '../lib/ipc-wrapper';
import { createLogger } from '../lib/logger';

const log = createLogger('JournalIPC');

export function registerJournalIPCHandlers(db: Database.Database): void {
  wrapHandler<JournalEntry[], [number?]>(
    'journal:getEntries',
    async (limit) => getJournalEntries(db, limit),
  );

  wrapHandler<void, [string, string]>(
    'journal:addNote',
    async (title, text) => {
      const state = loadGameState(db);
      const turn = state?.currentTurn ?? 0;
      insertJournalEntry(db, turn, 'note', title, { text });
      log.info('Player note added', { turn });
    },
    (title, text) => {
      if (!title || typeof title !== 'string') return 'title required';
      if (!text || typeof text !== 'string') return 'text required';
      return null;
    },
  );
}
```

### Pattern 3: Renderer Data Loading (follows useGameState pattern)
**What:** Load journal entries via IPC on component mount and after state updates
**When to use:** Logbook.tsx initialization and refresh
**Example:**
```typescript
// Source: pattern from useGameState.ts, Shell.tsx
const [entries, setEntries] = useState<JournalEntry[]>([]);

useEffect(() => {
  window.api.journal.getEntries().then((res) => {
    if (res.success) setEntries(res.data);
  });
}, []);

// Re-fetch when game state updates (trade, event, arrival, etc.)
useEffect(() => {
  const cleanup = window.api.subscribe('game:updated', () => {
    window.api.journal.getEntries().then((res) => {
      if (res.success) setEntries(res.data);
    });
  });
  return cleanup;
}, []);
```

### Anti-Patterns to Avoid
- **Dual state sources:** Do NOT keep component-state entries alongside DB entries. The Logbook must be fully DB-backed after this phase. Weather/rumor entries that are ephemeral should either be persisted too or generated on-the-fly from turn number (they are deterministic).
- **Separate transaction for journal:** Do NOT create a separate db.transaction() call for journal writes inside buyGood/sellGood. Insert the journal entry INSIDE the existing transaction to maintain atomicity -- if the trade fails, the journal entry should also roll back.
- **IPC round-trip for auto-entries:** Do NOT have the renderer request journal entry creation. The main process should auto-create entries as a side effect of the action that triggers them (buy, sell, resolve event, state transition).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting | Custom date library | Existing `turnToDate()` in Logbook.tsx | Already converts turn numbers to ancient calendar dates |
| Weather text | New weather system | Existing `getSeasonalWeatherDescription()` | Deterministic function already tested in Phase 9 |
| Structured logging | Console.log calls | `createLogger('Journal')` | Project convention from v1.2 |
| IPC validation | Manual try/catch | `wrapHandler` with validator | Project convention from v1.2 |

## Common Pitfalls

### Pitfall 1: Journal entries duplicated on re-render
**What goes wrong:** React useEffect fires multiple times, causing duplicate IPC calls that create duplicate journal entries
**Why it happens:** Auto-logging inside the renderer (e.g., "when gameState changes, call journal:addEntry") is fragile
**How to avoid:** Auto-logging must happen in the main process only. The renderer only reads entries, never creates auto-entries. Only player notes are created from the renderer.
**Warning signs:** Duplicate entries for the same turn/event in the journal

### Pitfall 2: Journal not clearing on New Game
**What goes wrong:** Starting a new game shows journal entries from the previous playthrough
**Why it happens:** journal_entries table is not cleared when a new game starts
**How to avoid:** Add `DELETE FROM journal_entries` to the new game initialization flow (wherever player_inventory and game_state are reset)
**Warning signs:** Old entries appearing after "New Game"

### Pitfall 3: Schema migration breaks existing saves
**What goes wrong:** Existing database files don't have the journal_entries table, causing crashes
**Why it happens:** The schema uses `CREATE TABLE IF NOT EXISTS` (idempotent), but if the table creation is added incorrectly it might fail
**How to avoid:** Follow existing pattern -- add the CREATE TABLE IF NOT EXISTS statement inside the existing `db.transaction()` in schema.ts. This is the same pattern used for all existing tables.
**Warning signs:** "no such table: journal_entries" errors in logs

### Pitfall 4: Font/style mismatch with existing UI
**What goes wrong:** CONTEXT.md mentions PressStart2P pixel-art font, but the actual codebase uses Cinzel/Lora parchment aesthetic
**Why it happens:** CONTEXT.md was auto-generated and may have referenced the wrong project's style
**How to avoid:** Follow the ACTUAL codebase styles in Logbook.tsx and Shell.tsx: Cinzel for headings, Lora for body text, parchment color palette (#fdf8f0 bg, #c4956a border, #5a3e2b text)
**Warning signs:** Visual inconsistency with rest of the app

### Pitfall 5: Journal entry body_json not typed
**What goes wrong:** body_json is stored as TEXT in SQLite but needs structured access in TypeScript
**Why it happens:** JSON parsing without validation
**How to avoid:** Define TypeScript discriminated union types for each entry type's body. Parse with JSON.parse() and cast, but keep the types narrow:
```typescript
type TradeBody = { goodId: string; goodName: string; qty: number; pricePerUnit: number; totalValue: number; portId: string; portName: string; action: 'buy' | 'sell' };
type EventBody = { eventType: string; choiceId: string; outcome: string; goldDelta: number };
type ArrivalBody = { portId: string; portName: string };
type DepartureBody = { portId: string; portName: string; destination: string };
type NoteBody = { text: string };
```
**Warning signs:** Runtime errors accessing body properties

## Code Examples

### Journal Entry Table Schema
```sql
-- Source: follows existing pattern in schema.ts
CREATE TABLE IF NOT EXISTS journal_entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  turn        INTEGER NOT NULL,
  entry_type  TEXT NOT NULL CHECK(entry_type IN ('trade','voyage_event','arrival','departure','note')),
  title       TEXT NOT NULL,
  body_json   TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_turn ON journal_entries (turn);
```

### Trade Auto-Logging (inside existing buyGood transaction)
```typescript
// Source: modification to existing buyGood() in queries.ts
// INSIDE the existing db.transaction() block, after the transaction_history INSERT:
db.prepare(`
  INSERT INTO journal_entries (turn, entry_type, title, body_json, created_at)
  VALUES (?, 'trade', ?, ?, datetime('now'))
`).run(
  turn,
  `Bought ${qty} ${goodName} at ${portName}`,
  JSON.stringify({ goodId, goodName, qty, pricePerUnit, totalValue: totalCost, portId, portName, action: 'buy' })
);
```

### Event Auto-Logging (inside resolveEvent handler)
```typescript
// Source: modification to game:resolveEvent handler in game.ts
// After applyOutcome() and before clearing pendingVoyageEvent:
insertJournalEntry(db, current.currentTurn, 'voyage_event',
  `Encountered: ${event.title}`,
  { eventType: event.type, choiceId, outcome: outcome.message, goldDelta: outcome.goldDelta }
);
```

### Preload Bridge Addition
```typescript
// Source: follows existing pattern in preload.ts
journal: {
  getEntries: (limit?: number) => ipcRenderer!.invoke('journal:getEntries', limit),
  addNote: (title: string, text: string) => ipcRenderer!.invoke('journal:addNote', title, text),
},
```

### IPCBridge Type Addition
```typescript
// Source: follows existing pattern in ipc-types.ts
journal: {
  getEntries: (limit?: number) => Promise<IPCResponse<JournalEntry[]>>;
  addNote: (title: string, text: string) => Promise<IPCResponse<void>>;
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Component-state Logbook | DB-backed journal | Phase 10 | Entries survive restart, can be queried |
| Ephemeral weather/rumor entries | Deterministic generation from turn number | Phase 9 | Weather entries can be regenerated without storage |

**Key design decision -- weather/rumor persistence:**
Weather entries are deterministic (`getSeasonalWeatherDescription(turn)` returns the same text for the same turn number). Rumors are deterministic (`generateRumor(turn)` uses `turn % rumors.length`). Recommendation: do NOT persist these in the journal table. Instead, interleave them at render time by generating them from the turn numbers present in the journal entries. This avoids bloating the journal table with entries that can be computed. The journal table stores only non-deterministic entries: trades, events, arrivals, departures, and player notes.

## Open Questions

1. **Should "New Game" clear journal entries?**
   - What we know: The game has a new game flow that resets game_state and player_inventory
   - What's unclear: Whether journal should carry across games (narrative record) or reset
   - Recommendation: Clear on new game -- the journal is a career record for one playthrough, not cross-game. Add DELETE FROM journal_entries to the new game reset path.

2. **Should weather/rumor entries be persisted?**
   - What we know: Both are deterministic functions of turn number
   - What's unclear: CONTEXT.md says "weather entries continue as before" which implies keeping them ephemeral
   - Recommendation: Keep weather/rumor ephemeral (generated at render time). Interleave with DB entries by turn number for display. This keeps the journal table lean and avoids migrating existing logic.

3. **Entry ordering: newest first or oldest first?**
   - What we know: CONTEXT.md says "newest entries at top"
   - Recommendation: SQL query with `ORDER BY turn DESC, id DESC`. UI renders in that order.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None currently (project has no test suite) |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| JRN-01 | Journal entries persist in SQLite across restart | manual | Restart app, verify entries still present | N/A |
| JRN-02 | Trades auto-logged | manual | Buy/sell a good, check journal | N/A |
| JRN-03 | Voyage events auto-logged | manual | Trigger a voyage event, check journal | N/A |
| JRN-04 | Arrivals/departures logged with dates | manual | Sail to port, check journal for arrival entry with date | N/A |
| JRN-05 | Player can write notes | manual | Type and save a note, verify it appears | N/A |

### Wave 0 Gaps
- No test infrastructure exists in project (noted in PROJECT.md as known gap)
- Manual verification via app interaction is the validation method

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/main/db/schema.ts` -- table creation pattern
- Existing codebase: `src/main/db/queries.ts` -- buyGood/sellGood transaction pattern, getTransactionHistory query pattern
- Existing codebase: `src/main/ipc/game.ts` -- wrapHandler IPC registration, resolveEvent flow
- Existing codebase: `src/main/preload.ts` -- contextBridge exposure pattern
- Existing codebase: `src/shared/ipc-types.ts` -- IPCBridge interface, IPCResponse type
- Existing codebase: `src/renderer/components/Logbook.tsx` -- current component state pattern, LogEntry type, turnToDate(), generateRumor()
- Existing codebase: `src/renderer/components/Shell.tsx` -- Logbook props and rendering context
- Existing codebase: `src/game/state.ts` -- FSM transitions (ARRIVE, SET_SAIL, ENCOUNTER, RESOLVE)
- Existing codebase: `src/game/types.ts` -- GameState discriminated union, GameAction types

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` -- accumulated decisions about IPC patterns, logging conventions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries needed, all patterns exist in codebase
- Architecture: HIGH -- direct extension of existing DB/IPC/UI patterns
- Pitfalls: HIGH -- derived from analysis of actual codebase patterns and state management

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable -- no external dependencies, purely internal patterns)

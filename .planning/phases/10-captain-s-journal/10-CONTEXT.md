# Phase 10: Captain's Journal - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode — all decisions at Claude's discretion)

<domain>
## Phase Boundary

Players build a persistent historical record of their trading career that survives restarts. The journal captures trades, voyages, events, port visits, and player notes — creating a narrative record of the player's journey through the ancient Mediterranean.

Requirements: JRN-01, JRN-02, JRN-03, JRN-04, JRN-05

</domain>

<decisions>
## Implementation Decisions

### Journal Data Model
- New `journal_entries` SQLite table with columns: id, turn, entry_type, title, body_json, created_at
- Entry types: trade, voyage_event, arrival, departure, note (player-written)
- body_json stores structured data per type (trade: goods/qty/price/port, event: type/outcome, etc.)
- Persisted via existing atomic transaction pattern (db.transaction())

### Journal UI
- Evolve existing Logbook.tsx into a persistent journal — replace component-state entries with DB-backed entries
- Keep existing entry type icons (weather, rumor, arrival, departure, event, trade)
- Add a "Write Note" input at the bottom of the journal for player reflections
- Maintain the pixel-art aesthetic with PressStart2P font, black/beige palette
- Scrollable list with newest entries at top, grouped by turn/date

### Integration Points
- Trade completion (buyGood/sellGood IPC handlers) → auto-create trade journal entry
- Voyage events (ENCOUNTER → RESOLVE flow) → auto-create event journal entry
- State transitions (ARRIVE, SET_SAIL) → auto-create arrival/departure entries
- Weather entries from getSeasonalWeatherDescription() continue as before
- New IPC channels: journal:getEntries, journal:addNote

### Claude's Discretion
- Exact journal entry formatting and text templates
- Whether to add a journal entry count badge or notification
- Migration strategy for existing Logbook entries vs clean break
- Whether weather/rumor entries should also be persisted or remain ephemeral

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Logbook.tsx already has LogEntry type with turn/date/text/type fields and icon mapping
- transaction_history table already stores trade data (turn, port, good, action, qty, price)
- turnToDate() converts game turns to ancient calendar dates
- getSeasonalWeatherDescription() provides weather text per turn
- wrapHandler pattern for IPC validation

### Established Patterns
- SQLite with WAL mode, atomic transactions via db.transaction()
- IPC: wrapHandler<ReturnType, [ArgTypes]> → IPCResponse<T>
- Preload contextBridge for secure renderer access
- useEffect + useState hooks for data loading with IPC
- subscribe:game:updated broadcast after state changes

### Integration Points
- buyGood/sellGood handlers in src/main/ipc/game.ts — add journal entry after transaction
- handleAction in src/game/state.ts — state transitions trigger entries
- Shell.tsx orchestrates Logbook rendering with gameState props
- src/main/db/schema.ts — add journal_entries table via migration

</code_context>

<specifics>
## Specific Ideas

No specific requirements — autonomous mode. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — autonomous mode.

</deferred>

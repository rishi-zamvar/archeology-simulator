# Phase 15: Quest System Foundation - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode — all decisions at Claude's discretion)

<domain>
## Phase Boundary

Players can receive, track, and complete quests that observe game state without modifying the game FSM. The quest engine uses an observer pattern — quests react to game events (trades, arrivals, dialogue choices) without adding new GameState variants.

Requirements: QUEST-01, QUEST-02, QUEST-03

</domain>

<decisions>
## Implementation Decisions

### Quest Data Model
- Quest definitions in JSON (resources/data/quests.json) — not TypeScript code
- Quest progress stored in quest_progress SQLite table (already created in Phase 13)
- Quest state: not_started, active, completed, failed
- Quest objectives: conditions that must be met (deliver X to Y, visit Z, trade N units of good)

### Quest Engine Architecture
- Observer pattern: quest engine subscribes to game events, evaluates objectives
- Events observed: trade_completed, port_arrived, dialogue_choice, item_acquired
- No new FSM states — quests are a layer on top of existing game flow
- Quest evaluation runs after each game action in the main process

### Starting Quest (Piraeus)
- Player starts at Piraeus with a commission from Nikias (Athenian merchant)
- Quest: "The Tyrian Commission" — deliver Attic pottery to Tyre, return with Tyrian purple
- Teaches basic trade mechanics while introducing the narrative
- Historically grounded: Athens exported pottery, imported luxury dyes

### Quest UI
- Quest log accessible from the journal/logbook
- Active quest indicator in the UI (subtle, not intrusive)
- Quest completion notifications via toast
- Quest objectives visible in captain's journal

### Claude's Discretion
- Exact quest objective format and evaluation logic
- How quest events are dispatched (pub/sub vs direct calls)
- Whether to add a dedicated quest panel or integrate into existing journal
- Number of objectives per quest

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- quest_progress SQLite table (Phase 13)
- Dialogue engine with effect handlers (Phase 14) — quest_update effect already stubbed
- Captain's journal with insertJournalEntry
- Transaction history for trade tracking
- Port arrival/departure auto-logging

### Established Patterns
- SQLite with better-sqlite3, atomic transactions
- IPC wrapHandler pattern
- JSON data files in resources/data/
- Observer-like pattern: game:updated broadcast after state changes

### Integration Points
- dialogue.ts effect handlers — quest_update effect triggers quest evaluation
- game.ts IPC handlers — trade completion, port arrival, event resolution
- journal.ts — quest milestones logged to journal
- Shell.tsx — quest status display

</code_context>

<specifics>
## Specific Ideas

No specific requirements — autonomous mode.

</specifics>

<deferred>
## Deferred Ideas

None — autonomous mode.

</deferred>

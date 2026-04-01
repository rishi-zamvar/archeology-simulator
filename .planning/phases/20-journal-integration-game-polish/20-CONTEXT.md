# Phase 20: Journal Integration & Game Polish - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode)

<domain>
## Phase Boundary

The game feels complete — journal captures the narrative journey, intro sets the scene, events are richer, and the odyssey has a satisfying conclusion.

Requirements: JRNL-01, JRNL-02, JRNL-03, QUEST-04, POLISH-01, POLISH-02

</domain>

<decisions>
## Implementation Decisions

### Journal Integration
- Quest events, NPC conversations, story milestones logged to captain's journal
- Educational "discoveries" recorded as visually distinct entries (first time learning about a culture/trade good)
- Journal reads as personal history record by end of game
- Max 3 journal entries per port visit to prevent spam

### Intro Sequence
- After "New Game", show a brief intro at Piraeus setting the scene
- Introduce Nikias and the merchant commission
- Historically grounded flavor text about Athens circa 540 BCE
- Auto-start the Tyrian Commission quest

### Win Condition
- Complete the merchant's odyssey — fulfil the final quest objective
- Show a conclusion sequence summarizing the journey
- Display stats: ports visited, goods traded, distance sailed, time elapsed
- Option to continue playing in free mode after winning

### Expanded Events
- Add 10-15 historically accurate voyage events beyond current 24
- Events tied to specific regions/seasons
- Educational content woven into event descriptions

### Claude's Discretion
- Exact intro sequence format (modal vs full-screen)
- Conclusion screen design
- Which new events to add
- Journal entry priority/taxonomy

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- insertJournalEntry in queries.ts
- journal_entries table with entry types
- Logbook.tsx with Quests tab
- TitleScreen.tsx for game entry flow
- events.ts with 24 existing events

### Integration Points
- dialogue.ts effects — journal_entry effect already exists
- quest.ts — quest completion triggers journal entry
- Shell.tsx — intro sequence after new game
- events.ts — add new historically grounded events

</code_context>

<specifics>
No specific requirements — autonomous mode.
</specifics>

<deferred>
None.
</deferred>

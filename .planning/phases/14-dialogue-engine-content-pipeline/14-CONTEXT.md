# Phase 14: Dialogue Engine & Content Pipeline - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

NPCs can deliver branching, condition-gated dialogue loaded from JSON data files — with build-time validation ensuring no broken references. This phase builds the engine and tooling; actual NPC content comes in Phase 17.

Requirements: NPC-02 (NPC dialogue is historically grounded and educational)

</domain>

<decisions>
## Implementation Decisions

### Dialogue Data Format
- Dialogue authored in JSON files under resources/data/dialogue/ (one file per NPC or port)
- Each dialogue file contains a tree of nodes with conditions, responses, and branching
- Node structure: { id, speaker, text, conditions (optional), choices (array of { text, next_node, effects }) }
- Conditions can reference: quest state, reputation level, ports visited, goods carried, turn/season
- Effects can trigger: quest updates, reputation changes, port unlocks, journal entries, trade offers

### Dialogue Node Schema
```json
{
  "npc_id": "nikias",
  "port_id": "athens",
  "nodes": [
    {
      "id": "greeting",
      "speaker": "Nikias",
      "text": "Welcome to Piraeus, captain. The merchant house of Kephalos has need of your services.",
      "conditions": { "quest": { "not_started": "main_quest" } },
      "choices": [
        { "text": "I am at your service.", "next": "quest_offer", "effects": [] },
        { "text": "What sort of work?", "next": "quest_details", "effects": [] }
      ]
    }
  ]
}
```

### Condition Evaluation Engine
- Pure function: evaluateCondition(condition, gameContext) → boolean
- gameContext includes: quest states, reputation scores, visited ports, cargo, turn number, season
- Conditions composable with AND/OR/NOT operators
- Engine lives in src/game/dialogue.ts (pure, testable)

### Dialogue UI Component
- DialogueModal component modeled after EventCard pattern (full-screen overlay)
- Shows NPC portrait (placeholder for now, Phase 17 adds real portraits), speaker name, text, choices
- Choices that fail conditions are hidden (not greyed out — avoid revealing unmet conditions)
- Text displayed with parchment styling matching existing modal patterns
- Cinzel for speaker name, Lora for dialogue text, sepia color palette

### Build-Time Validation
- npm script `data:validate` that reads all JSON dialogue files and checks:
  - All node IDs referenced in choices exist in the same file
  - All quest IDs referenced exist in a quest manifest
  - No orphan nodes (unreachable from any entry point)
  - Required fields present (id, speaker, text)
- Runs as part of `npm run build` (typecheck → validate → build)

### IPC Channels
- `dialogue:getNodes(npcId)` — returns dialogue tree for an NPC
- `dialogue:advanceNode(npcId, nodeId, choiceIndex)` — processes a choice, applies effects, returns next node
- `dialogue:getAvailableNpcs(portId)` — returns NPCs available at current port based on conditions

### Port Content Template
- Define minimum content requirements per port for Phase 16:
  - At least 100-200 words of lore (history, culture, trade)
  - At least 1 NPC
  - At least 5 dialogue nodes per NPC
  - At least 1 historical citation per port

### Claude's Discretion
- Whether to use a single large dialogue file or split per-NPC
- Exact condition operator syntax (JSON-based DSL vs simple key-value)
- Whether to add a dialogue preview/testing tool
- Animation for text appearing (typewriter effect vs instant)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- EventCard.tsx: full-screen modal with title/description/choices pattern — closest to dialogue UI
- TutorialModal.tsx: non-dismissible card with Continue/Skip buttons
- MareClausumModal.tsx: historical context display with action buttons
- npc_dialogue_state table: tracks last_node_id, times_spoken, last_spoken_turn per NPC
- wrapHandler IPC pattern for all handlers
- Parchment styling: Cinzel/Lora fonts, #fdf5e6 bg, #1a0f0a text, #c4956a borders

### Established Patterns
- IPCResponse<T> wrapper for all IPC calls
- better-sqlite3 synchronous queries
- Zustand for UI state management
- cancelled flag pattern for async data loading
- JSON files in resources/data/ for reference content
- INSERT OR IGNORE seeding on app launch

### Integration Points
- src/shared/game-types.ts — add dialogue type definitions
- src/shared/ipc-types.ts — add dialogue IPC channel types
- src/main/ipc/ — new dialogue.ts handler file
- src/main/preload.ts — expose dialogue bridge
- src/renderer/components/ — new DialogueModal.tsx
- src/renderer/components/Shell.tsx — wire DialogueModal into render tree
- resources/data/dialogue/ — new directory for dialogue JSON files
- package.json — add data:validate script

</code_context>

<specifics>
## Specific Ideas

- The dialogue engine should be completely decoupled from the UI — pure functions that can be tested without rendering
- Consider using the same event resolution pattern (IPC call → result → display) for dialogue choices
- A sample dialogue file should be created for testing the engine (even if placeholder content)
- The validation script should produce clear error messages with file:line references

</specifics>

<deferred>
## Deferred Ideas

- Typewriter text animation — add in Phase 20 polish
- NPC portrait display — Phase 17
- Voice acting indicators — out of scope
- Dialogue history/replay — consider for future milestone

</deferred>

# Technology Stack — v2.0 The Merchant's Odyssey

**Project:** Archeology Simulator v2.0
**Researched:** 2026-03-31
**Confidence:** HIGH (core stack validated through v1.3; new features are data/logic layers, not infrastructure)
**Mode:** Incremental — what changes from v1.3 baseline for quest/NPC/lore/reputation systems

## Verdict: No New Runtime Dependencies Required

The v2.0 features — quest state machine, NPC dialogue, expanded port lore, reputation tracking, progressive unlocking — are all data modeling and game logic problems. The existing stack (TypeScript FSM pattern, better-sqlite3, Zustand, React) already provides the right primitives. Adding a dialogue engine or state machine library would be over-engineering for a game with hand-authored, finite content.

| v2.0 Feature | Existing Tech That Covers It | New Library Needed? |
|---|---|---|
| Quest state machine | TypeScript discriminated unions (existing FSM pattern) | NO |
| NPC dialogue trees | JSON data structures + React components | NO |
| Expanded port content (15-25 ports with deep lore) | JSON reference data + existing ports table | NO |
| Reputation/standing system | SQLite columns + pure TypeScript game logic | NO |
| Progressive port unlocking | Game state flags + reputation thresholds | NO |
| Educational lore system | Structured JSON + captain's journal integration | NO |

## Why NOT ink.js / XState / Other Libraries

### ink.js (inkjs 2.2.2) — Narrative Scripting Engine
**What it is:** JavaScript port of Inkle's narrative scripting language. Used by 80 Days, Heaven's Vault. Supports branching dialogue, variables, conditional text, knots/diverts.

**Why not for this project:**
- ink.js shines for **long-form branching narratives** with thousands of nodes where a dedicated scripting language saves author time. This game has ~15-25 NPCs with 3-10 dialogue nodes each — roughly 100-250 total nodes. That's small enough to author as TypeScript data.
- ink.js introduces a **second runtime** (the ink VM) running alongside the game FSM. Debugging two state systems is painful.
- ink.js dialogue state would need to be **serialized separately** from the game's SQLite persistence, creating save/load complexity.
- The game's dialogue is not primarily narrative fiction — it's **educational content delivery** (historical facts, trade tips, quest hooks). Structured JSON with typed fields (loreText, questHook, requiredReputation) is more maintainable than ink script for this use case.

**When ink.js WOULD be right:** If the game had 1000+ dialogue nodes, NPC personality-driven branching, or a dedicated narrative writer who doesn't code. This project has neither.

### XState v5 — State Machine Library
**What it is:** Actor-model state machine library with TypeScript-first design, visual inspector, statecharts.

**Why not for this project:**
- The game already has a **working FSM pattern** using TypeScript discriminated unions (`GameState = IdleState | TradingState | SailingState | EncounteredState`). Adding XState would mean migrating the existing FSM or running two parallel systems.
- XState's value is in **complex concurrent state** (parallel states, delayed transitions, spawned actors). Quest states in this game are sequential: `not_started -> active -> completed`. That's a string enum, not a statechart.
- XState adds **~45KB** to the bundle and its learning curve is steep for the complexity level needed here.
- The visual inspector is appealing but unnecessary — quest states are debuggable with console logs since there are ~10-15 quests total.

**When XState WOULD be right:** If quests had complex parallel objectives, time-based triggers, or dynamic spawning. This game's quests are linear with simple prerequisites.

## Recommended Architecture: Extend Existing Patterns

### Quest System — TypeScript Discriminated Unions + SQLite

Use the same pattern as `GameState`. Quests are data, not code:

```typescript
// Quest states — same pattern as GamePhase
type QuestStatus = 'locked' | 'available' | 'active' | 'completed';

interface Quest {
  id: string;                    // e.g. 'find_tyrian_purple'
  title: string;
  description: string;
  giverNpcId: string;            // which NPC gives this quest
  giverPortId: string;           // where to pick it up
  status: QuestStatus;
  objectives: QuestObjective[];  // ordered steps
  currentObjective: number;      // index into objectives
  rewards: QuestReward;
  prerequisites: string[];       // quest IDs that must be completed first
  requiredReputation?: number;   // minimum reputation to unlock
  loreUnlocks: string[];         // lore entry IDs revealed on completion
}

interface QuestObjective {
  id: string;
  type: 'visit_port' | 'deliver_goods' | 'talk_to_npc' | 'trade_goods' | 'discover_lore';
  targetPortId?: string;
  targetNpcId?: string;
  targetGoodId?: string;
  targetQuantity?: number;
  description: string;           // player-facing text
  completed: boolean;
}
```

**Why this works:** Quests are checked imperatively at action boundaries (arrive at port, complete trade, talk to NPC). The existing `handleAction()` FSM is the natural hook point — add quest-checking logic after each state transition. No new runtime needed.

**SQLite schema addition:**
```sql
CREATE TABLE quest_progress (
  quest_id    TEXT PRIMARY KEY,
  status      TEXT NOT NULL DEFAULT 'locked',
  current_obj INTEGER NOT NULL DEFAULT 0,
  started_at  TEXT,
  completed_at TEXT
);
```

### NPC Dialogue — JSON Data + React Component

NPCs are static data with conditional visibility. No dialogue engine needed:

```typescript
interface NPC {
  id: string;                     // e.g. 'herodotus_halicarnassus'
  name: string;
  title: string;                  // e.g. 'Historian of Halicarnassus'
  portId: string;                 // home port
  portrait?: string;              // optional image path
  dialogueNodes: DialogueNode[];
}

interface DialogueNode {
  id: string;
  text: string;                   // what the NPC says (educational content goes here)
  responses: DialogueResponse[];
  conditions?: DialogueCondition; // when this node is available
}

interface DialogueResponse {
  label: string;                  // player's reply option
  nextNodeId: string | null;      // null = end conversation
  effects?: DialogueEffect[];     // reputation changes, quest triggers, lore reveals
}

interface DialogueCondition {
  minReputation?: number;
  requiredQuests?: string[];      // must be completed
  requiredVisits?: string[];      // ports player must have visited
}

interface DialogueEffect {
  type: 'give_quest' | 'change_reputation' | 'unlock_lore' | 'reveal_port' | 'give_gold';
  value: string | number;         // quest ID, reputation delta, lore ID, port ID, or gold amount
}
```

**Why JSON and not a dialogue scripting language:** The content is primarily educational — historical facts about ancient Mediterranean trade. Each NPC has 3-10 dialogue nodes. The structure is more important than the prose flow. Typed JSON makes it easy to enforce that every dialogue node has proper conditions, effects, and educational content.

**SQLite schema addition:**
```sql
CREATE TABLE npc_dialogue_state (
  npc_id          TEXT PRIMARY KEY,
  last_node_id    TEXT,
  times_spoken    INTEGER NOT NULL DEFAULT 0,
  last_spoken_turn INTEGER
);
```

### Reputation System — Numeric Score + SQLite Column

Reputation is a single integer per region, modified by trade actions, quest completion, and dialogue choices:

```typescript
interface ReputationState {
  overall: number;                           // 0-100
  regional: Record<PortRegion, number>;      // per-region standing
}
```

**SQLite schema addition:**
```sql
-- Add to game_state or as separate table
CREATE TABLE reputation (
  region      TEXT PRIMARY KEY,
  score       INTEGER NOT NULL DEFAULT 0
);
```

**Effects of reputation:**
- Trade price modifiers: `finalPrice = basePrice * (1 - reputation * 0.002)` (up to 20% discount at max reputation)
- NPC dialogue availability: some nodes require `minReputation >= 50`
- Port unlocking: certain ports require regional reputation thresholds
- Quest availability: advanced quests require minimum reputation

### Expanded Port Content — Structured JSON Data Files

Port lore is **reference data** — version-controlled JSON, seeded into SQLite on startup (same pattern as existing ports/goods seed data):

```typescript
interface PortLore {
  portId: string;
  history: string;                // 2-3 paragraph historical summary
  culture: string;                // daily life, customs, religion
  tradeSpecialization: string;    // what this port was known for trading
  notableFacts: string[];         // 3-5 student-friendly facts
  historicalPeriod: string;       // e.g. "Archaic Period (600-480 BCE)"
  primarySources?: string[];     // academic citations (Perseus Digital Library, etc.)
}
```

**Content management approach:** Store lore as JSON files in `src/data/ports/` (one file per port or one combined file). Seed into SQLite `port_lore` table on database initialization. This keeps content version-controlled and diffable while serving it from the same SQLite layer as everything else.

**SQLite schema addition:**
```sql
CREATE TABLE port_lore (
  port_id             TEXT PRIMARY KEY REFERENCES ports(id),
  history             TEXT NOT NULL,
  culture             TEXT NOT NULL,
  trade_specialization TEXT NOT NULL,
  notable_facts_json  TEXT NOT NULL DEFAULT '[]',
  historical_period   TEXT NOT NULL,
  primary_sources_json TEXT
);
```

### Progressive Port Unlocking — Game State Flags

Ports start locked and unlock through reputation, quests, and NPC introductions:

```sql
-- Tracks which ports the player has discovered/unlocked
CREATE TABLE port_access (
  port_id       TEXT PRIMARY KEY REFERENCES ports(id),
  discovered    INTEGER NOT NULL DEFAULT 0,  -- boolean
  discovered_at INTEGER,                      -- turn number
  unlock_method TEXT                          -- 'start' | 'quest' | 'npc' | 'reputation'
);
```

Starting port (Piraeus) is pre-unlocked. Others unlock as the player progresses. Locked ports appear as "?" markers on the map with a fog/parchment overlay.

## Data Architecture: JSON Files vs SQLite

| Data Type | Storage | Why |
|---|---|---|
| Quest definitions | JSON in `src/data/quests.ts` | Static reference data, version-controlled, typed at compile time |
| Quest progress | SQLite `quest_progress` table | Per-save mutable state |
| NPC definitions | JSON in `src/data/npcs.ts` | Static reference data, version-controlled |
| NPC dialogue state | SQLite `npc_dialogue_state` table | Per-save mutable state |
| Port lore | JSON in `src/data/port-lore.ts` | Static reference data, large text blocks |
| Reputation scores | SQLite `reputation` table | Per-save mutable state |
| Port unlock status | SQLite `port_access` table | Per-save mutable state |

**Pattern:** Static definitions in TypeScript files (type-safe, diffable, reviewable). Mutable player progress in SQLite (persistent, queryable, save/load compatible).

## What NOT to Add

| Tempting Addition | Why to Avoid |
|---|---|
| **ink.js / inkjs 2.2.2** | ~100-250 dialogue nodes total. JSON is more maintainable at this scale. ink.js adds a second runtime and separate serialization. |
| **XState v5** | Existing discriminated union FSM works. Quest states are trivially simple (locked/available/active/completed). |
| **Twine / Yarn Spinner** | Designed for narrative games with 1000s of nodes. This game has educational dialogue, not branching fiction. |
| **A CMS or markdown renderer** | Lore is hand-authored, static, and small (~25 ports). No need for a content pipeline. |
| **react-markdown** | Port lore displays in structured UI panels, not free-form markdown. Styled `<p>` and `<ul>` elements suffice. |
| **Framer Motion** | NPC dialogue and quest UI are panel-based. CSS transitions handle fade-in/slide-in. |
| **i18n library** | English-only educational game. Adding i18n infrastructure for one language is pure overhead. |
| **Zustand middleware (immer, persist)** | Game state persists via SQLite IPC, not Zustand. Zustand is UI-only state. Adding middleware creates confusion about what persists where. |

## Version Pinning (Current, Keep As-Is)

No upgrades needed for v2.0 features. All work is at the application layer.

| Package | Installed Version | Upgrade? | Rationale |
|---|---|---|---|
| electron | ^35.7.5 | NO | No Electron-level features needed. |
| react | ^19.0.0 | NO | New components, not new React features. |
| vite | ^7.3.1 | NO | Build tooling unchanged. |
| better-sqlite3 | ^12.6.2 | NO | 5 new tables are trivial. No new SQLite features needed. |
| leaflet | ^1.9.4 | NO | Port markers and fog overlay are native Leaflet. |
| zustand | ^5.0.11 | NO | Add quest/NPC panel state to uiStore. Same pattern. |
| tailwindcss | ^4.2.1 | NO | Styling with existing utility classes. |
| typescript | ^5.7.3 | NO | Discriminated unions and conditional types already available. |

## New Files (No New Packages)

```
src/data/                     <- NEW directory for static game content
  quests.ts                   <- Quest definitions (typed array)
  npcs.ts                     <- NPC definitions with dialogue trees
  port-lore.ts                <- Rich historical content per port

src/game/
  quests.ts                   <- Quest state machine (check/advance/complete)
  reputation.ts               <- Reputation calculation and effects
  npcs.ts                     <- NPC availability and dialogue resolution

src/main/db/schema.ts         <- EXTEND: 5 new tables
src/main/db/queries.ts        <- EXTEND: quest/npc/reputation/lore CRUD
src/main/ipc/quest.ts         <- NEW: quest IPC handlers
src/main/ipc/npc.ts           <- NEW: NPC dialogue IPC handlers
src/main/ipc/lore.ts          <- NEW: port lore IPC handlers

src/shared/game-types.ts      <- EXTEND: Quest, NPC, Reputation, PortLore types
src/shared/ipc-types.ts       <- EXTEND: new IPC channel types

src/renderer/components/
  NPCPanel.tsx                <- NEW: NPC dialogue UI
  QuestLog.tsx                <- NEW: quest tracker overlay
  PortLorePanel.tsx           <- NEW: historical content display
  QuestNotification.tsx       <- NEW: quest state change toasts
```

## Integration Points

### Quest Checking Hooks into Existing FSM

```
Player action (ARRIVE, COMPLETE_TRADE, etc.)
  |
  v
handleAction() — existing FSM transition
  |
  v
checkQuestProgress() — NEW: iterate active quests, check if any objective completed
  |
  v
If objective completed → advance quest, check for quest completion
  |
  v
If quest completed → apply rewards (gold, reputation, port unlocks, lore reveals)
  |
  v
Journal auto-entry for quest milestones (extends existing journal system)
```

### Reputation Modifies Existing Trade System

```
calculateMarketPrice(good, port)      <- existing in economy.ts
  |
  v
getReputationModifier(region)          <- NEW: returns 0.80 to 1.00
  |
  v
finalPrice = basePrice * supplyDemand * reputationModifier
```

### Port Unlocking Modifies Map Rendering

```
useMapPorts() hook                     <- existing
  |
  v
Filter ports by port_access.discovered <- NEW: only show unlocked ports fully
  |
  v
Show locked ports as "?" markers       <- NEW: PortMarker variant
```

## Sources

- Codebase inspection (ground truth): `package.json`, `game-types.ts`, `types.ts`, `state.ts`, `schema.ts`, `engine.ts`, `events.ts`, `uiStore.ts`
- [inkjs npm package](https://www.npmjs.com/package/inkjs) — v2.2.2, evaluated and rejected for this scale
- [XState v5 documentation](https://stately.ai/docs/xstate) — evaluated and rejected; existing FSM pattern sufficient
- [Game Programming Patterns — State](https://gameprogrammingpatterns.com/state.html) — confirms discriminated union FSM is appropriate for this complexity
- [inkle's ink scripting language](https://www.inklestudios.com/ink/) — designed for 1000+ node narratives, overkill here

---

**Bottom line:** v2.0 is a content and game logic milestone. The right tool for 15-25 ports, ~15 quests, and ~20 NPCs is hand-authored TypeScript data with the existing SQLite persistence layer. The stack is already right-sized. Ship content, not dependencies.

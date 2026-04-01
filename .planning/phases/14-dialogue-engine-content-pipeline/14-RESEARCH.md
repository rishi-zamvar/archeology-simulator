# Phase 14: Dialogue Engine & Content Pipeline - Research

**Researched:** 2026-03-31
**Domain:** Dialogue tree engine, JSON data pipeline, build-time validation (TypeScript/Electron)
**Confidence:** HIGH

## Summary

Phase 14 builds the dialogue engine infrastructure: a JSON-based dialogue data format, a pure-function condition evaluator, IPC handlers to serve dialogue data, a DialogueModal UI component, and a build-time validation script. The actual NPC content comes later (Phase 17); this phase delivers the engine and one sample dialogue file for testing.

The existing codebase already has all the prerequisite infrastructure: the `npc_dialogue_state` table (migration v4), the `NpcDialogueState` type in game-types.ts, the `wrapHandler` IPC pattern, the `IPCBridge` type contract, and the EventCard modal pattern that DialogueModal will mirror. The `resources/data/` directory already holds JSON data files (ports.json, goods.json, events.json) that are loaded at startup, establishing the pattern for dialogue JSON files.

**Primary recommendation:** Build the dialogue engine as a pure module at `src/game/dialogue.ts` with zero side effects, consuming JSON dialogue data and game context to produce the next node. Wire via 3 IPC channels through the established `wrapHandler` pattern. Add `data:validate` as a standalone script that runs during `npm run build`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dialogue authored in JSON files under resources/data/dialogue/ (one file per NPC or port)
- Node structure: { id, speaker, text, conditions (optional), choices (array of { text, next_node, effects }) }
- Conditions reference: quest state, reputation level, ports visited, goods carried, turn/season
- Effects trigger: quest updates, reputation changes, port unlocks, journal entries, trade offers
- Pure function: evaluateCondition(condition, gameContext) -> boolean with AND/OR/NOT composability
- Engine lives in src/game/dialogue.ts (pure, testable)
- DialogueModal modeled after EventCard pattern (full-screen overlay)
- Cinzel for speaker name, Lora for dialogue text, sepia color palette (#fdf5e6 bg, #1a0f0a text)
- Choices failing conditions are hidden, not greyed out
- npm script `data:validate` that validates all JSON dialogue files
- Validation runs as part of `npm run build` (typecheck -> validate -> build)
- IPC channels: dialogue:getNodes, dialogue:advanceNode, dialogue:getAvailableNpcs
- Port content template: 100-200 words lore, 1+ NPC, 5+ nodes per NPC, 1+ citation per port

### Claude's Discretion
- Whether to use a single large dialogue file or split per-NPC
- Exact condition operator syntax (JSON-based DSL vs simple key-value)
- Whether to add a dialogue preview/testing tool
- Animation for text appearing (typewriter effect vs instant)

### Deferred Ideas (OUT OF SCOPE)
- Typewriter text animation -- add in Phase 20 polish
- NPC portrait display -- Phase 17
- Voice acting indicators -- out of scope
- Dialogue history/replay -- consider for future milestone
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NPC-02 | NPC dialogue is historically grounded and educational | Dialogue engine loads JSON with condition-gated branching; sample dialogue demonstrates historically grounded content; build-time validation ensures structural integrity; port content template defines minimum educational standards |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | ^12.6.2 | Read/write npc_dialogue_state | Already in project; synchronous queries match existing pattern |
| vitest | (project dev dep) | Unit tests for dialogue engine | Already configured; tests/ directory established |
| TypeScript | (project dev dep) | Type-safe dialogue types | Already configured with strict mode |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fs/path (Node built-in) | N/A | Load JSON dialogue files from resources/data/ | In main process IPC handlers |
| JSON.parse (built-in) | N/A | Parse dialogue JSON | No external parser needed -- JSON is native |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom JSON DSL | Ink (inkle) narrative engine | Ink adds a full scripting language -- overkill for condition-gated branching; custom JSON is simpler and keeps full control |
| Custom JSON DSL | Yarn Spinner | Designed for Unity; no clean TypeScript integration |
| JSON files | YAML files | YAML is more readable but adds a parser dependency; JSON is native to the runtime |

**Installation:** No new packages needed. All dependencies already exist in the project.

## Architecture Patterns

### Recommended Project Structure
```
src/game/
  dialogue.ts          # Pure dialogue engine (evaluateCondition, getNextNode, getAvailableNodes)
src/main/ipc/
  dialogue.ts          # IPC handlers (dialogue:getNodes, dialogue:advanceNode, dialogue:getAvailableNpcs)
src/shared/
  game-types.ts        # Add DialogueNode, DialogueFile, DialogueCondition types
  ipc-types.ts         # Add dialogue section to IPCBridge
src/main/
  preload.ts           # Add dialogue bridge entries
src/renderer/components/
  DialogueModal.tsx    # Full-screen modal for NPC conversation
resources/data/dialogue/
  athens-nikias.json   # Sample dialogue file for testing
scripts/
  validate-dialogue.ts # Build-time validation script
```

### Pattern 1: Pure Dialogue Engine (no side effects)
**What:** The dialogue engine is a collection of pure functions that take dialogue data + game context and return results. No database access, no IPC awareness.
**When to use:** Always -- this is the core architectural decision.
**Example:**
```typescript
// src/game/dialogue.ts

export interface GameContext {
  questProgress: Map<string, QuestStatus>;
  reputation: Map<string, number>;
  visitedPorts: Set<string>;
  cargo: Array<{ goodId: string; quantity: number }>;
  currentTurn: number;
  season: string;
}

export function evaluateCondition(
  condition: DialogueCondition,
  ctx: GameContext
): boolean {
  // Pure function -- no side effects, fully testable
}

export function getAvailableChoices(
  node: DialogueNode,
  ctx: GameContext
): DialogueChoice[] {
  return node.choices.filter(c =>
    !c.conditions || evaluateCondition(c.conditions, ctx)
  );
}
```

### Pattern 2: IPC Handler follows wrapHandler pattern
**What:** All dialogue IPC handlers use the existing `wrapHandler` wrapper. Handlers are pure async functions; the wrapper handles try/catch and IPCResponse wrapping.
**When to use:** All 3 dialogue IPC channels.
**Example:**
```typescript
// src/main/ipc/dialogue.ts
import { wrapHandler } from '../lib/ipc-wrapper';

export function registerDialogueIPCHandlers(db: Database.Database): void {
  wrapHandler<DialogueNode[]>('dialogue:getNodes', async (npcId: string) => {
    const file = loadDialogueFile(npcId);
    return file.nodes;
  }, (npcId) => npcId ? null : 'npcId required');

  wrapHandler<DialogueAdvanceResult>('dialogue:advanceNode',
    async (npcId: string, nodeId: string, choiceIndex: number) => {
      // Load dialogue, build game context from DB, evaluate, apply effects, return next node
    }
  );
}
```

### Pattern 3: Condition DSL as composable JSON predicates
**What:** Conditions are expressed as JSON objects with AND/OR/NOT composition. Simple key-value for leaf conditions, composition operators for complex gates.
**When to use:** Every dialogue node that has conditional visibility.
**Recommendation (Claude's Discretion):** Use a flat predicate object for simple cases and explicit `$and`/`$or`/`$not` operators for composition. This balances readability with power.
```json
{
  "conditions": {
    "$and": [
      { "quest": { "id": "main_quest", "status": "active" } },
      { "reputation": { "region": "greece", "min": 10 } }
    ]
  }
}
```
Simple single-condition nodes skip the operator:
```json
{
  "conditions": { "quest": { "id": "main_quest", "status": "not_started" } }
}
```

### Pattern 4: File-per-NPC (Claude's Discretion recommendation)
**Recommendation:** Use one JSON file per NPC (e.g., `athens-nikias.json`), not one per port. Rationale:
- NPCs have independent dialogue trees; combining them creates unnecessary coupling
- Validation error messages are clearer when scoped to a single NPC
- Phase 17 adds NPCs incrementally -- one file per NPC makes this natural
- File naming: `{port_id}-{npc_id}.json` keeps files sorted by location

### Anti-Patterns to Avoid
- **Inline dialogue in TypeScript:** Pitfall 2 from PITFALLS.md -- content in code is unmaintainable at scale
- **Mutable dialogue state in memory:** Store conversation position in the DB (`npc_dialogue_state` table), not in renderer state. Prevents loss on window reload.
- **Evaluating conditions in the renderer:** All condition evaluation must happen in the main process. The renderer only sees the filtered result (available choices). This prevents players from inspecting hidden choices via DevTools.
- **Circular next references:** A node's choice pointing to itself or creating an infinite loop. The validator must detect cycles.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema validation | Custom field-by-field checks | TypeScript type guards + exhaustive switch | Type guards catch missing fields; the validate script handles reference integrity |
| Dialogue file loading | Custom file walker | `fs.readdirSync` + `JSON.parse` | The resources/data/ pattern already uses this approach (see events.json loading) |
| Effect application | Giant switch statement | Effect handler map (`Record<EffectType, handler>`) | Extensible; each effect type is its own function |

**Key insight:** The dialogue engine is intentionally simple (~200-300 lines). The complexity lives in the content (JSON files), not the code. Resist over-engineering the engine.

## Common Pitfalls

### Pitfall 1: Orphan Nodes and Dead-End Paths
**What goes wrong:** A dialogue node references a `next` ID that does not exist, or a node exists but is unreachable from any entry point. Player hits a dead-end or crashes.
**Why it happens:** Content authors add/remove nodes without updating all references. JSON has no compile-time checking.
**How to avoid:** The `data:validate` script MUST check: (1) every `next` reference resolves to an existing node ID in the same file, (2) every node is reachable from at least one entry point via BFS/DFS from the root node, (3) every terminal node has no choices (explicit end-of-conversation).
**Warning signs:** Any node with 0 incoming references that is not the designated root.

### Pitfall 2: Game Context Stale During Dialogue
**What goes wrong:** Player opens dialogue, the engine evaluates conditions against turn 5 state. Midway through dialogue, an effect changes quest state. Subsequent condition checks still use the stale context.
**Why it happens:** Game context is built once at dialogue start, not refreshed per-node.
**How to avoid:** Rebuild game context from DB after every `dialogue:advanceNode` call that applies effects. The pure engine function takes fresh context each time.
**Warning signs:** Effects that change conditions visible later in the same conversation tree.

### Pitfall 3: Validation Script Not Actually Running
**What goes wrong:** The validate script exists but nobody runs it. Broken references ship to players.
**Why it happens:** Script is not wired into the build chain, or it is wired but skipped during dev.
**How to avoid:** Add `data:validate` to `package.json` scripts. Modify the `build` script to chain: `"build": "tsc --noEmit && npm run data:validate && npm run build:main && npm run build:renderer && electron-builder"`. Make validation fail loudly with non-zero exit code.
**Warning signs:** `npm run build` succeeds even when dialogue files have broken references.

### Pitfall 4: Effect Application Without Idempotency
**What goes wrong:** Player clicks a choice, effect applies (e.g., +10 reputation). Network/IPC hiccup causes retry. Reputation goes to +20.
**Why it happens:** Effects are fire-and-forget without tracking which choices have been applied.
**How to avoid:** Track the current node in `npc_dialogue_state.last_node_id`. Before applying effects, verify the player is advancing FROM the expected node. If `last_node_id` already equals the target node, skip effect application.
**Warning signs:** Duplicate journal entries or reputation jumps during testing.

### Pitfall 5: Condition Type Explosion
**What goes wrong:** Every new game system (quests, reputation, cargo, season, turn) adds its own condition type. The evaluator becomes a growing switch statement that every phase must extend.
**Why it happens:** No unified condition interface.
**How to avoid:** Define all condition types upfront as a discriminated union: `type ConditionType = 'quest' | 'reputation' | 'visited_port' | 'has_cargo' | 'turn_range' | 'season'`. The evaluator dispatches on this union. New types require adding to the union + one handler function. The union is defined once in game-types.ts.
**Warning signs:** Evaluator function exceeds 100 lines.

## Code Examples

### Dialogue JSON File Structure
```json
{
  "npc_id": "nikias",
  "port_id": "athens",
  "root_node": "greeting",
  "nodes": [
    {
      "id": "greeting",
      "speaker": "Nikias",
      "text": "Welcome to Piraeus, captain. The merchant house of Kephalos has need of your services.",
      "conditions": { "quest": { "id": "main_quest", "status": "not_started" } },
      "choices": [
        { "text": "I am at your service.", "next": "quest_offer", "effects": [] },
        { "text": "What sort of work?", "next": "quest_details", "effects": [] }
      ]
    },
    {
      "id": "quest_offer",
      "speaker": "Nikias",
      "text": "We need Tyrian purple from Sidon. The festival of Athena approaches and the priests require new vestments.",
      "choices": [
        {
          "text": "I will sail to Sidon.",
          "next": "quest_accepted",
          "effects": [
            { "type": "quest_update", "questId": "main_quest", "status": "active" },
            { "type": "journal_entry", "title": "Commission from Nikias", "text": "The merchant Nikias of Athens has tasked me with procuring Tyrian purple from the Phoenician city of Sidon." }
          ]
        },
        { "text": "The journey is too dangerous.", "next": "quest_declined", "effects": [] }
      ]
    },
    {
      "id": "quest_accepted",
      "speaker": "Nikias",
      "text": "Excellent. May Poseidon grant you fair winds. You will find the Phoenician dye merchants near the harbor temple.",
      "choices": []
    },
    {
      "id": "quest_declined",
      "speaker": "Nikias",
      "text": "A cautious captain lives longer, I suppose. Return if you change your mind.",
      "choices": []
    },
    {
      "id": "quest_details",
      "speaker": "Nikias",
      "text": "The Phoenicians of Sidon produce the finest purple dye in all the Mediterranean -- extracted from the murex snail. It is worth more than silver by weight.",
      "choices": [
        { "text": "Tell me more about Tyrian purple.", "next": "lore_purple", "effects": [] },
        { "text": "I will fetch it.", "next": "quest_offer", "effects": [] }
      ]
    },
    {
      "id": "lore_purple",
      "speaker": "Nikias",
      "text": "Each murex yields but a single drop. It takes ten thousand shells to dye one garment. The Phoenicians have guarded this secret for centuries. Pliny himself wrote of its magnificence.",
      "choices": [
        { "text": "Fascinating. I will seek it out.", "next": "quest_offer", "effects": [] }
      ]
    }
  ]
}
```

### Type Definitions (for game-types.ts)
```typescript
// Dialogue condition types
export type ConditionType = 'quest' | 'reputation' | 'visited_port' | 'has_cargo' | 'turn_range' | 'season';

export interface QuestCondition { type: 'quest'; id: string; status: QuestStatus | 'not_started'; }
export interface ReputationCondition { type: 'reputation'; region: string; min?: number; max?: number; }
export interface VisitedPortCondition { type: 'visited_port'; portId: string; }
export interface HasCargoCondition { type: 'has_cargo'; goodId: string; minQuantity?: number; }
export interface TurnRangeCondition { type: 'turn_range'; min?: number; max?: number; }
export interface SeasonCondition { type: 'season'; season: string; }

export type DialogueCondition =
  | QuestCondition | ReputationCondition | VisitedPortCondition
  | HasCargoCondition | TurnRangeCondition | SeasonCondition;

export type CompositeCondition =
  | DialogueCondition
  | { $and: CompositeCondition[] }
  | { $or: CompositeCondition[] }
  | { $not: CompositeCondition };

export type EffectType = 'quest_update' | 'reputation_change' | 'port_unlock' | 'journal_entry' | 'trade_offer';

export interface DialogueEffect {
  type: EffectType;
  [key: string]: unknown; // Effect-specific payload
}

export interface DialogueChoice {
  text: string;
  next: string;        // node ID
  effects: DialogueEffect[];
  conditions?: CompositeCondition; // choice-level conditions (hide if unmet)
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  conditions?: CompositeCondition; // node-level conditions (skip if unmet)
  choices: DialogueChoice[];       // empty array = terminal node
}

export interface DialogueFile {
  npc_id: string;
  port_id: string;
  root_node: string;   // ID of the entry node
  nodes: DialogueNode[];
}
```

### Validation Script Pattern
```typescript
// scripts/validate-dialogue.ts
import fs from 'fs';
import path from 'path';

const DIALOGUE_DIR = path.join(__dirname, '../resources/data/dialogue');
let errors: string[] = [];

for (const file of fs.readdirSync(DIALOGUE_DIR)) {
  if (!file.endsWith('.json')) continue;
  const filePath = path.join(DIALOGUE_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const nodeIds = new Set(data.nodes.map((n: any) => n.id));

  // Check root_node exists
  if (!nodeIds.has(data.root_node)) {
    errors.push(`${file}: root_node "${data.root_node}" does not exist`);
  }

  // Check all next references resolve
  for (const node of data.nodes) {
    for (const choice of node.choices ?? []) {
      if (!nodeIds.has(choice.next)) {
        errors.push(`${file}: node "${node.id}" choice references "${choice.next}" which does not exist`);
      }
    }
  }

  // Check for orphan nodes (unreachable from root)
  const reachable = new Set<string>();
  const queue = [data.root_node];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachable.has(current)) continue;
    reachable.add(current);
    const node = data.nodes.find((n: any) => n.id === current);
    if (node) {
      for (const choice of node.choices ?? []) {
        queue.push(choice.next);
      }
    }
  }
  for (const node of data.nodes) {
    if (!reachable.has(node.id)) {
      errors.push(`${file}: node "${node.id}" is unreachable from root`);
    }
  }

  // Check required fields
  for (const node of data.nodes) {
    if (!node.id) errors.push(`${file}: node missing "id"`);
    if (!node.speaker) errors.push(`${file}: node "${node.id}" missing "speaker"`);
    if (!node.text) errors.push(`${file}: node "${node.id}" missing "text"`);
  }
}

if (errors.length > 0) {
  console.error('Dialogue validation failed:');
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
} else {
  console.log(`Dialogue validation passed (${fs.readdirSync(DIALOGUE_DIR).filter(f => f.endsWith('.json')).length} files)`);
}
```

### DialogueModal Component Pattern
```typescript
// Mirrors EventCard.tsx pattern -- full-screen overlay, choice buttons
// Key differences:
// - Speaker name displayed with Cinzel font
// - No event type badge -- instead shows NPC name
// - Choices are hidden when conditions fail (not greyed out)
// - Terminal nodes (empty choices) show "Farewell" dismiss button

interface DialogueModalProps {
  npcId: string;
  initialNode: DialogueNode;
  availableChoices: DialogueChoice[];
  onDismiss: () => void;
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (project dev dep) |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NPC-02 | evaluateCondition returns true/false for each condition type | unit | `npx vitest run tests/game/dialogue.test.ts -t "evaluateCondition"` | Wave 0 |
| NPC-02 | getAvailableChoices filters hidden choices correctly | unit | `npx vitest run tests/game/dialogue.test.ts -t "getAvailableChoices"` | Wave 0 |
| NPC-02 | Composite conditions (AND/OR/NOT) evaluate correctly | unit | `npx vitest run tests/game/dialogue.test.ts -t "composite"` | Wave 0 |
| NPC-02 | advanceNode applies effects and returns next node | unit | `npx vitest run tests/game/dialogue.test.ts -t "advanceNode"` | Wave 0 |
| NPC-02 | Validation script catches broken next references | unit | `npx vitest run tests/game/dialogue-validation.test.ts` | Wave 0 |
| NPC-02 | Validation script catches orphan nodes | unit | `npx vitest run tests/game/dialogue-validation.test.ts -t "orphan"` | Wave 0 |
| NPC-02 | Sample dialogue file passes validation | smoke | `npx tsx scripts/validate-dialogue.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/game/dialogue.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/game/dialogue.test.ts` -- covers evaluateCondition, getAvailableChoices, composite conditions, advanceNode
- [ ] `tests/game/dialogue-validation.test.ts` -- covers validation script logic (broken refs, orphans, missing fields)
- [ ] `resources/data/dialogue/athens-nikias.json` -- sample dialogue file for validation smoke test

## Open Questions

1. **Quest manifest for cross-file validation**
   - What we know: The validator needs to check that quest IDs referenced in conditions exist. Phase 15 (Quest system) will define quests.
   - What's unclear: Does Phase 14 need a quest manifest, or should validation of quest IDs be deferred to Phase 15?
   - Recommendation: Create a minimal `resources/data/quests.json` manifest with just `{ quests: [{ id: "main_quest" }] }` for the sample dialogue. Phase 15 expands it. This prevents the validator from being incomplete.

2. **Effect application scope**
   - What we know: Effects include quest_update, reputation_change, port_unlock, journal_entry, trade_offer. Quest and reputation tables exist. Journal table exists.
   - What's unclear: Should Phase 14 implement ALL effect handlers, or just the infrastructure + the ones testable with existing tables?
   - Recommendation: Implement quest_update, reputation_change, journal_entry (tables exist). Stub port_unlock and trade_offer with TODO comments for their respective phases (19 and 15).

3. **Text animation (Claude's Discretion)**
   - Recommendation: Instant text display for Phase 14. Typewriter effect is explicitly deferred to Phase 20 polish. Keep it simple.

## Sources

### Primary (HIGH confidence)
- Existing codebase: EventCard.tsx, ipc-wrapper.ts, schema.ts, game-types.ts, preload.ts, ipc-types.ts -- direct pattern source
- resources/data/events.json -- established JSON data file pattern
- .planning/research/PITFALLS.md -- Pitfall 2 (dialogue trees) directly informs architecture

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions -- user-locked architecture choices verified against codebase feasibility

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all patterns established in codebase
- Architecture: HIGH - pure engine + IPC + modal pattern directly mirrors existing event system
- Pitfalls: HIGH - Pitfall 2 from domain research directly addresses this phase; additional pitfalls derived from dialogue tree domain knowledge

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable -- no external dependencies to change)

# Phase 15: Quest System Foundation - Research

**Researched:** 2026-03-31
**Domain:** Observer-pattern quest engine, SQLite quest persistence, JSON quest definitions
**Confidence:** HIGH

## Summary

Phase 15 builds a quest engine that observes game actions (trades, port arrivals, dialogue choices) and evaluates quest objectives without modifying the existing FSM. The architecture is well-constrained: quest_progress table already exists (Phase 13 migration v3), the dialogue engine already handles quest_update effects (Phase 14), and the codebase follows established patterns (better-sqlite3, wrapHandler IPC, JSON data files, pure game logic in `src/game/`).

The critical content gap is that the "Tyrian Commission" starting quest requires Tyre as a port and pottery/purple_dye as goods -- none of which exist in the current data. Phase 16 is supposed to add ports and goods, but Phase 15 needs a playable quest. The recommendation is to scope the starting quest to use existing ports and goods (e.g., deliver olive oil from Athens to Alexandria, return with grain) OR add the minimum content (Tyre port + 2 goods) within Phase 15 itself.

**Primary recommendation:** Build a pure quest engine in `src/game/quest.ts` (observer pattern, no side effects), wire it via `src/main/ipc/quest.ts` IPC handlers, expand `resources/data/quests.json` with a full quest definition schema, and add a quest log tab to the existing Logbook or a new panel. Add Tyre + pottery + purple_dye as minimum data to make the Piraeus quest work.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUEST-01 | Main storyline begins at Piraeus with a commission from an Athenian merchant house | Quest engine evaluates objectives; Nikias NPC dialogue triggers quest_update effect to activate quest; quest JSON defines objectives with port/trade conditions |
| QUEST-02 | Quests involve historically plausible merchant activities (deliver goods, source materials, negotiate deals) | Objective types: deliver_cargo (has_cargo at port), visit_port, complete_trade; all map to existing game actions |
| QUEST-03 | Completing quests advances the story and teaches history through gameplay | Quest completion triggers journal entries (existing insertJournalEntry), dialogue tree unlocks via quest conditions (already supported), reputation changes |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

No CLAUDE.md exists at the project root. Constraints derived from STATE.md and established patterns:

- Quest state in separate SQLite tables, NOT GameState JSON (Pitfall 1 from STATE.md)
- Quest system observes game FSM -- no new GameState variants (Pitfall 6 from STATE.md)
- Content phases must cite sources for every historical claim (Pitfall 5)
- Code and content interleaved to prevent building systems without content to test (Pitfall 8)
- BDD test naming: `test_givenX_whenY_thenZ()` (from project memory)
- Vitest test runner (`vitest run`)
- os.Logger via createLogger pattern, zero print() in production
- JSON data files in `resources/data/`
- wrapHandler IPC pattern with validator

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | ^12.6.2 | Quest progress persistence | Already used for all DB operations |
| vitest | (existing) | Quest engine unit tests | Project test runner |
| electron | (existing) | IPC bridge for quest state | Project framework |

### Supporting (No New Dependencies)
No new packages needed. The quest engine is pure TypeScript logic operating on existing infrastructure.

## Architecture Patterns

### Recommended Project Structure
```
src/
  game/
    quest.ts              # Pure quest engine (evaluate objectives, advance state)
  main/
    ipc/
      quest.ts            # IPC handlers (quest:getActive, quest:evaluate, quest:getLog)
    db/
      queries.ts          # Add quest query functions (getQuestProgress, updateQuestProgress)
  renderer/
    components/
      QuestLog.tsx         # Quest log panel (or tab in Logbook)
  shared/
    game-types.ts          # Add QuestDefinition, QuestObjective types
resources/
  data/
    quests.json            # Full quest definitions with objectives
    dialogue/
      nikias-athens.json   # Nikias dialogue that triggers starting quest
```

### Pattern 1: Observer-Pattern Quest Evaluation
**What:** After every game action that changes state (trade, arrival, departure), the quest engine evaluates all active quest objectives against current game context. No new FSM states needed.
**When to use:** Every time `broadcastGameUpdated` fires or trade/arrival effects complete.
**Example:**
```typescript
// src/game/quest.ts — Pure function, no side effects
export interface QuestObjective {
  id: string;
  type: 'deliver_cargo' | 'visit_port' | 'complete_trade' | 'talk_to_npc';
  description: string;
  // Type-specific fields
  portId?: string;        // for visit_port, deliver_cargo
  goodId?: string;        // for deliver_cargo, complete_trade
  minQuantity?: number;   // for deliver_cargo
  npcId?: string;         // for talk_to_npc
  action?: 'buy' | 'sell'; // for complete_trade
}

export interface QuestDefinition {
  id: string;
  name: string;
  description: string;
  objectives: QuestObjective[];
  prerequisites: CompositeCondition | null; // reuse dialogue condition system
  rewards: QuestReward[];
  historicalNote: string; // educational content shown on completion
}

export function evaluateObjective(
  objective: QuestObjective,
  ctx: GameContext
): boolean {
  switch (objective.type) {
    case 'deliver_cargo':
      return ctx.cargo.some(c =>
        c.goodId === objective.goodId &&
        c.quantity >= (objective.minQuantity ?? 1)
      ) && isAtPort(ctx, objective.portId);
    case 'visit_port':
      return ctx.visitedPorts.has(objective.portId!);
    case 'complete_trade':
      // Check transaction_history for matching trade
      return ctx.recentTrades.some(t =>
        t.goodId === objective.goodId &&
        t.portId === objective.portId &&
        (!objective.action || t.action === objective.action)
      );
    default:
      return false;
  }
}
```

### Pattern 2: Quest State Machine (Per-Quest)
**What:** Each quest has its own mini state machine: not_started -> active -> completed/failed. The `current_objective` column in quest_progress tracks which objective index the player is on.
**When to use:** Sequential objectives (deliver pottery to Tyre, THEN return with purple dye).
**Example:**
```typescript
export function advanceQuest(
  quest: QuestDefinition,
  progress: QuestProgress,
  ctx: GameContext
): QuestProgress {
  if (progress.status !== 'active') return progress;

  const currentObj = quest.objectives[progress.currentObjective];
  if (!currentObj) return progress; // safety

  if (evaluateObjective(currentObj, ctx)) {
    const nextIdx = progress.currentObjective + 1;
    if (nextIdx >= quest.objectives.length) {
      return { ...progress, status: 'completed', completedAt: new Date().toISOString() };
    }
    return { ...progress, currentObjective: nextIdx };
  }

  return progress; // no change
}
```

### Pattern 3: Event Dispatch via Post-Action Hook
**What:** Instead of pub/sub, add a `evaluateActiveQuests(db)` call after each state-changing action in game.ts IPC handlers. Simple, debuggable, matches existing broadcastGameUpdated pattern.
**When to use:** After buyGood, sellGood, game:action (ARRIVE), dialogue:advanceNode (quest_update effect).
**Example:**
```typescript
// In game.ts after a trade completes:
const inventory = buyGood(db, portId, goodId, qty);
evaluateActiveQuests(db); // check if any quest objective was just satisfied
broadcastGameUpdated(db);
```

### Anti-Patterns to Avoid
- **Adding quest state to GameState union:** Violates Pitfall 6. Quests are a parallel layer, not FSM states.
- **Evaluating quests in the renderer:** Quest logic must run in the main process (has DB access). Renderer only displays.
- **Hardcoded quest logic in TypeScript:** Quest definitions must be in JSON (quests.json). The engine is generic; quests are data.
- **Complex pub/sub event system:** Overkill for a single-player turn-based game. Direct function calls after actions are simpler and debuggable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Condition evaluation | New condition system for quests | Reuse `evaluateCondition` from `src/game/dialogue.ts` | Already supports quest/reputation/cargo/port/turn/season conditions with $and/$or/$not |
| Journal logging | Custom quest log storage | Reuse `insertJournalEntry` with 'note' type | Journal system already exists and handles display |
| Quest activation via NPC | Custom quest-start mechanism | Reuse dialogue `quest_update` effect | Already implemented in dialogue.ts effect handlers |

**Key insight:** Phase 14 already built the condition evaluation engine and the quest_update effect handler. Phase 15 extends these -- it does not replace them.

## Common Pitfalls

### Pitfall 1: Content Dependency Gap
**What goes wrong:** The "Tyrian Commission" quest requires Tyre (port), attic_pottery (good), and purple_dye (good) -- none exist in current data.
**Why it happens:** Phase 16 adds ports/goods, but Phase 15 needs a playable quest now (Pitfall 8: code and content interleaved).
**How to avoid:** Add minimum content in Phase 15: Tyre port entry in ports.json, attic_pottery + purple_dye in goods.json, port_inventory entries. Keep lore/depth minimal -- Phase 16 will flesh it out.
**Warning signs:** Quest references a portId or goodId that doesn't exist in the database.

### Pitfall 2: Quest Evaluation Timing
**What goes wrong:** Quest objectives are evaluated at the wrong moment, causing objectives to be missed (e.g., checking cargo AFTER a sell empties it).
**Why it happens:** Evaluation order matters: evaluate BEFORE the action modifies state for "have cargo at port" checks, or AFTER for "completed a trade" checks.
**How to avoid:** Define clear semantics per objective type. `deliver_cargo` = "have X at port Y right now" (check on arrival). `complete_trade` = "just sold X at Y" (check after trade).
**Warning signs:** Objectives satisfied but quest doesn't advance; objectives impossible to satisfy.

### Pitfall 3: Quest Progress Not Reset on New Game
**What goes wrong:** Starting a new game preserves quest progress from previous playthrough.
**Why it happens:** quest_progress is already in PLAYER_DATA_TABLES (added Phase 13), but quest evaluation state might be cached in memory.
**How to avoid:** quest_progress table is already cleared by the new-game reset loop. Verify no in-memory quest caches persist across resets.
**Warning signs:** New game shows completed quests.

### Pitfall 4: Overcomplicating the Quest Schema
**What goes wrong:** Building a quest system that supports branching quests, failure conditions, time limits, and complex state -- for a phase that only needs one linear quest.
**Why it happens:** Anticipating future phases instead of building what's needed now.
**How to avoid:** Build for the Piraeus quest: sequential objectives, no failure, no time limit. The schema can be extended later. YAGNI.
**Warning signs:** Quest schema has more fields than the starting quest uses.

### Pitfall 5: Forgetting to Extend GameContext
**What goes wrong:** Quest evaluation needs data not in the current GameContext (e.g., recent trades, current port).
**Why it happens:** GameContext was built for dialogue conditions, not quest evaluation.
**How to avoid:** Extend GameContext with `currentPortId` and `recentTrades` fields. The buildGameContext function in dialogue.ts already reads from DB -- add transaction_history query.
**Warning signs:** Quest objectives that should pass keep failing because context is incomplete.

## Code Examples

### Quest Definition JSON (quests.json)
```json
{
  "quests": [
    {
      "id": "tyrian_commission",
      "name": "The Tyrian Commission",
      "description": "Nikias, a merchant of Athens, asks you to deliver Attic pottery to Tyre and return with Tyrian purple dye.",
      "objectives": [
        {
          "id": "obj_buy_pottery",
          "type": "complete_trade",
          "description": "Purchase Attic pottery at Piraeus",
          "portId": "athens",
          "goodId": "attic_pottery",
          "action": "buy"
        },
        {
          "id": "obj_deliver_pottery",
          "type": "deliver_cargo",
          "description": "Deliver Attic pottery to Tyre",
          "portId": "tyre",
          "goodId": "attic_pottery",
          "minQuantity": 5
        },
        {
          "id": "obj_buy_purple",
          "type": "complete_trade",
          "description": "Purchase Tyrian purple dye at Tyre",
          "portId": "tyre",
          "goodId": "purple_dye",
          "action": "buy"
        },
        {
          "id": "obj_return_purple",
          "type": "deliver_cargo",
          "description": "Return with Tyrian purple to Piraeus",
          "portId": "athens",
          "goodId": "purple_dye",
          "minQuantity": 3
        }
      ],
      "prerequisites": null,
      "rewards": [
        { "type": "reputation_change", "region": "greece", "delta": 10 },
        { "type": "journal_entry", "title": "The Tyrian Commission Complete", "text": "Nikias is pleased with the Tyrian purple. The rich dye, extracted from murex sea snails by Phoenician artisans, will fetch a handsome price at the Athenian agora." }
      ],
      "historicalNote": "Tyrian purple (porphyra) was the most prized dye in the ancient Mediterranean, worth more than gold by weight. Produced from the mucus of Bolinus brandaris sea snails, it took 10,000 snails to produce 1 gram of dye. Athens exported fine pottery (especially red-figure and black-figure ware) across the Mediterranean, making pottery-for-dye a historically plausible trade."
    }
  ]
}
```

### Quest IPC Handlers Pattern
```typescript
// src/main/ipc/quest.ts
export function registerQuestIPCHandlers(db: Database.Database): void {
  wrapHandler('quest:getActive', async () => {
    return getActiveQuests(db);
  });

  wrapHandler<QuestProgress[], []>('quest:evaluateAll', async () => {
    const ctx = buildGameContext(db); // reuse from dialogue.ts
    return evaluateActiveQuests(db, ctx);
  });
}
```

### Minimum Content Data (Tyre port + new goods)
```json
// Add to ports.json
{
  "id": "tyre",
  "ancient_name": "Tyros",
  "modern_name": "Tyre",
  "lat": 33.2705,
  "lng": 35.2038,
  "region": "levant",
  "description": "Island fortress city of the Phoenicians, famed for its purple dye and seafaring merchants.",
  "pleiades_id": "678437"
}

// Add to goods.json
{ "id": "attic_pottery", "name": "Attic Pottery", "base_price": 25, "description": "Fine Athenian pottery decorated with red-figure scenes of mythology and daily life." },
{ "id": "purple_dye", "name": "Tyrian Purple", "base_price": 80, "description": "Rare dye extracted from murex sea snails, worth more than gold by weight." }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Quest state in GameState JSON | Quest state in separate SQLite table | Phase 13 (v2.0 design) | Quest mutations don't touch FSM; simpler separation of concerns |
| Custom condition system per feature | Shared CompositeCondition DSL | Phase 14 | Quests reuse dialogue conditions for prerequisites |
| quest_update as stub effect | quest_update writes to quest_progress | Phase 14 (partially) | Already inserts/upserts status; needs extension for objective tracking |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (existing) |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run tests/game/quest.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUEST-01 | Quest activates via dialogue effect, tracks in quest_progress | unit | `npx vitest run tests/game/quest.test.ts -t "activate"` | Wave 0 |
| QUEST-01 | Piraeus starting quest playable end-to-end | integration | `npx vitest run tests/game/quest-integration.test.ts` | Wave 0 |
| QUEST-02 | deliver_cargo objective evaluates correctly | unit | `npx vitest run tests/game/quest.test.ts -t "deliver_cargo"` | Wave 0 |
| QUEST-02 | complete_trade objective evaluates correctly | unit | `npx vitest run tests/game/quest.test.ts -t "complete_trade"` | Wave 0 |
| QUEST-02 | visit_port objective evaluates correctly | unit | `npx vitest run tests/game/quest.test.ts -t "visit_port"` | Wave 0 |
| QUEST-03 | Quest completion triggers journal entry + reputation | unit | `npx vitest run tests/game/quest.test.ts -t "completion"` | Wave 0 |
| QUEST-03 | Quest completion unlocks next dialogue branch | unit | `npx vitest run tests/game/quest.test.ts -t "advances story"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/game/quest.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/game/quest.test.ts` -- covers QUEST-01, QUEST-02, QUEST-03 (pure engine)
- [ ] `tests/game/quest-integration.test.ts` -- covers end-to-end Piraeus quest with DB

## Open Questions

1. **Quest Objective Ordering: Strict Sequential vs. Flexible**
   - What we know: The Piraeus quest has a natural sequence (buy pottery -> sail to Tyre -> sell pottery -> buy purple -> return). The `current_objective` column supports sequential.
   - What's unclear: Should ALL quests enforce strict ordering, or should some allow objectives in any order?
   - Recommendation: Build sequential-only for Phase 15. Add a `sequential: boolean` flag to the schema for future flexibility.

2. **Quest UI Placement**
   - What we know: The Logbook exists as a top-center dropdown. Quest log could be a tab within it or a separate panel.
   - What's unclear: CONTEXT.md says "Quest log accessible from the journal/logbook" -- suggesting integration with existing Logbook.
   - Recommendation: Add a "Quests" tab to the Logbook component. Keeps UI clean and reuses existing dropdown mechanism.

3. **How Many Ports/Goods to Add**
   - What we know: Current data has 5 ports, 3 goods. The starting quest needs Tyre + 2 goods minimum.
   - What's unclear: Should Phase 15 add just Tyre, or more ports to make the quest feel part of a larger world?
   - Recommendation: Add only Tyre + attic_pottery + purple_dye. Phase 16 handles the broader world expansion. Adding more here would overlap with Phase 16's scope.

## Sources

### Primary (HIGH confidence)
- `src/main/db/schema.ts` -- quest_progress table definition (migration v3)
- `src/main/ipc/dialogue.ts` -- quest_update effect handler, buildGameContext
- `src/game/dialogue.ts` -- evaluateCondition, GameContext interface
- `src/shared/game-types.ts` -- QuestStatus, QuestProgress, DialogueEffect types
- `src/main/ipc/game.ts` -- game action handlers, broadcastGameUpdated pattern
- `src/game/types.ts` -- GameState FSM (4 variants, no quest states)
- `resources/data/quests.json` -- existing stub with single entry
- `resources/data/ports.json` -- current 5 ports (Athens, Alexandria, Carthage, Rome, Antioch)
- `resources/data/goods.json` -- current 3 goods (grain, olive_oil, wine)

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` -- Phase dependencies and success criteria
- `.planning/STATE.md` -- accumulated decisions and pitfalls

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all patterns established in prior phases
- Architecture: HIGH - observer pattern clearly specified in CONTEXT.md, existing code supports it
- Pitfalls: HIGH - content gap identified by examining actual data files
- Quest content: MEDIUM - historical accuracy of Tyrian Commission needs source verification during implementation

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable -- no external dependencies changing)

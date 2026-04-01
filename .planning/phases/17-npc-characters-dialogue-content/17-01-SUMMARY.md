---
phase: 17-npc-characters-dialogue-content
plan: 01
subsystem: content
tags: [npc, dialogue, quests, svg, historical-content, game-data]

requires:
  - phase: 14-dialogue-engine-content-pipeline
    provides: dialogue engine, condition evaluation, dialogue JSON schema
  - phase: 15-quest-system-foundation
    provides: quest engine, quest objectives, GameContext, buildGameContext

provides:
  - 4 NPC dialogue trees (Taharqa, Elissa, Hanno, Aziru) with 13-14 nodes each
  - 4 NPC-initiated quests with talk_to_npc + trade objectives
  - talk_to_npc objective wired to npc_dialogue_state via GameContext
  - 5 SVG portrait silhouettes for UI integration
  - 8 port_unlock effects revealing 6 new ports through dialogue

affects: [18-npc-ui-integration, 19-port-unlocking, 20-reputation-effects]

tech-stack:
  added: []
  patterns: [conditional-entry-nodes-for-dialogue-state-branching]

key-files:
  created:
    - resources/data/dialogue/memphis-taharqa.json
    - resources/data/dialogue/carthage-elissa.json
    - resources/data/dialogue/ostia-hanno.json
    - resources/data/dialogue/tyre-aziru.json
    - resources/portraits/nikias.svg
    - resources/portraits/taharqa.svg
    - resources/portraits/elissa.svg
    - resources/portraits/hanno.svg
    - resources/portraits/aziru.svg
  modified:
    - resources/data/quests.json
    - src/game/dialogue.ts
    - src/game/quest.ts
    - src/main/ipc/dialogue.ts
    - tests/game/quest.test.ts
    - tests/game/dialogue.test.ts
    - scripts/validate-dialogue.ts

key-decisions:
  - "Adapted quest goods to use existing IDs (grain, wine, olive_oil) since silver/cedar not in goods.json"
  - "Fixed validator BFS to treat nodes with conditions as alternate entry points (existing athens-nikias.json was failing)"
  - "Used timesSpoken (camelCase) in GameContext matching NpcDialogueState interface convention"

patterns-established:
  - "Conditional entry nodes: dialogue files use multiple root-level nodes with quest conditions for state-dependent greetings"
  - "NPC dialogue pattern: greeting/greeting_active/greeting_complete nodes + quest_offer/lore branches"

requirements-completed: [NPC-01, NPC-03, NPC-04]

duration: 8min
completed: 2026-04-01
---

# Phase 17 Plan 01: NPC Characters and Dialogue Content Summary

**4 historically grounded NPCs at Memphis, Carthage, Ostia, and Tyre with branching dialogue trees, NPC-initiated quests, port_unlock effects revealing 6 ports, and talk_to_npc objective wired to npc_dialogue_state**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-01T18:08:46Z
- **Completed:** 2026-04-01T18:16:25Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- 4 NPC dialogue trees with 13-14 nodes each, historically grounded in 540-530 BCE with citations to Herodotus, Aubet, Boardman, Braudel, and Livy
- 4 new quests (nile_grain, pillars_of_melqart, roman_tribute, cedar_of_lebanon) with talk_to_npc + trade objectives
- talk_to_npc objective evaluation wired through GameContext.npcDialogueState, replacing Phase 15 stub
- 5 SVG portrait silhouettes with distinct colors and culturally appropriate headwear
- 8 port_unlock effects across all NPCs revealing naukratis, alexandria, gadir, emporion, taras, syracuse, byblos, sidon

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 4 NPC dialogue JSON files and NPC-initiated quests** - `1324ec5` (feat)
2. **Task 2: Wire talk_to_npc objective and create NPC portrait SVGs** - `96c1100` (feat)

## Files Created/Modified
- `resources/data/dialogue/memphis-taharqa.json` - Taharqa (Memphis): Egyptian grain trader, 14 nodes, Nile flood cycle lore
- `resources/data/dialogue/carthage-elissa.json` - Elissa (Carthage): Phoenician captain, 13 nodes, Phoenician alphabet/trade lore
- `resources/data/dialogue/ostia-hanno.json` - Hanno (Ostia): Roman customs official, 13 nodes, early Republic/Etruscan lore
- `resources/data/dialogue/tyre-aziru.json` - Aziru (Tyre): Phoenician merchant, 14 nodes, purple dye/glass-making lore
- `resources/data/quests.json` - 5 quests total (1 original + 4 new NPC-initiated)
- `src/game/dialogue.ts` - Added npcDialogueState to GameContext interface
- `src/game/quest.ts` - Replaced talk_to_npc stub with real evaluation
- `src/main/ipc/dialogue.ts` - Populated npcDialogueState from npc_dialogue_state table
- `tests/game/quest.test.ts` - Added 4 talk_to_npc tests, updated makeContext helper
- `tests/game/dialogue.test.ts` - Updated makeContext helper with npcDialogueState
- `scripts/validate-dialogue.ts` - Fixed BFS reachability to handle conditional entry nodes
- `resources/portraits/*.svg` - 5 NPC portrait silhouettes (nikias, taharqa, elissa, hanno, aziru)

## Decisions Made
- Adapted quest goods to use existing IDs (grain, wine, olive_oil) since silver and cedar goods do not exist in goods.json. Quest narratives reference historical goods but objectives use available tradeable goods.
- Fixed validator BFS reachability check to treat nodes with top-level conditions as alternate entry points. The existing athens-nikias.json was failing validation due to unreachable greeting_active/greeting_complete nodes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed dialogue validator BFS reachability for conditional entry nodes**
- **Found during:** Task 1 (dialogue validation)
- **Issue:** Validator flagged nodes with conditions (greeting_active, greeting_complete) as unreachable from root, but these serve as alternate entry points based on quest state. The existing athens-nikias.json also failed validation.
- **Fix:** Modified BFS to seed queue with all nodes that have conditions, treating them as valid entry points.
- **Files modified:** scripts/validate-dialogue.ts
- **Verification:** All 5 dialogue files pass validation; dialogue-validation.test.ts still passes (9 tests)
- **Committed in:** 1324ec5 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Adapted quest goods to available trade goods**
- **Found during:** Task 1 (quest creation)
- **Issue:** Plan specified silver and cedar goods for quests, but only grain, olive_oil, wine, attic_pottery, and purple_dye exist in goods.json. Quests referencing non-existent goods would silently fail.
- **Fix:** Used existing goods (grain for Taharqa, wine for Elissa/Aziru, olive_oil for Hanno) while keeping historical narrative context in dialogue text.
- **Files modified:** resources/data/quests.json
- **Verification:** All quest objectives reference valid goods; quests.json has 5 entries
- **Committed in:** 1324ec5 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both auto-fixes necessary for correctness. Validator fix resolves a pre-existing issue. Goods adaptation prevents silent quest failures. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 5 NPC dialogue trees validated and ready for UI integration
- talk_to_npc objective fully wired -- quests can now require NPC conversations
- SVG portraits ready for dialogue UI panel
- port_unlock effects exist in dialogue but port_unlock handler is still stubbed (Phase 19)

## Self-Check: PASSED

All 9 created files verified. Both commit hashes (1324ec5, 96c1100) confirmed in git log.

---
*Phase: 17-npc-characters-dialogue-content*
*Completed: 2026-04-01*

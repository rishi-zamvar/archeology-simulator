# Domain Pitfalls — v2.0 The Merchant's Odyssey

**Domain:** Adding narrative quest system, NPC dialogue, progressive port unlocking, reputation, and educational lore to an existing Electron + React + SQLite turn-based trade game
**Researched:** 2026-03-31
**Confidence:** HIGH (verified against existing codebase architecture + game design domain patterns)

---

## Critical Pitfalls

Mistakes that cause rewrites, break existing functionality, or undermine the educational mission.

### Pitfall 1: Quest State Stored in the Game State JSON Blob Creates an Unmigrateable Monster

**What goes wrong:**
The current `game_state` table stores a single `state_json TEXT` column containing the serialized `GameState` discriminated union (schema.ts:26-31). Developers naturally extend this blob to include quest progress: `activeQuests`, `completedQuests`, `questFlags`, `npcRelationships`, `reputation`. The blob grows from ~200 bytes to 5-20KB. Every quest addition requires a new optional field. Save migration becomes a nested-object nightmare because quest state has its own internal state machine (inactive/active/completed/failed) embedded inside the game FSM state. A quest can be mid-progress when the player saves during sailing — now the save file must capture both the sailing FSM state AND the quest FSM state, creating cross-cutting concerns in a single JSON blob.

**Why it happens:**
The existing pattern for adding state is "add optional fields to GameState" (see `departurePortId?`, `route?`, `tutorialPhase?` on SailingState — types.ts:48-50). This worked for small additions but does not scale to a quest system with dozens of quests, each with their own progress tracking.

**Consequences:**
- Save files become fragile — one malformed quest entry corrupts the entire game state
- Type safety erodes: `GameState & { quests?: Quest[] }` is technically a discriminated union but practically a god object
- Migration functions grow exponentially — each new quest requires a new migration path for every prior save version
- `isValidGameState()` (save.ts:23-29) becomes an ever-expanding validation function that can never be complete
- Testing requires constructing increasingly complex state fixtures

**Prevention:**
1. Store quest state in a SEPARATE SQLite table: `quest_progress (quest_id TEXT PRIMARY KEY, status TEXT, progress_json TEXT, started_at TEXT, completed_at TEXT)`. Keep `GameState` lean — it tracks FSM state (idle/trading/sailing/encountered), not narrative state.
2. Store reputation in its own table: `reputation (faction_id TEXT PRIMARY KEY, value INTEGER, updated_at TEXT)`.
3. Store NPC state in its own table: `npc_state (npc_id TEXT PRIMARY KEY, met BOOLEAN, dialogue_flags_json TEXT)`.
4. The `game:newGame` handler (save.ts:84-98) already demonstrates the pattern: `DELETE FROM` each table. New tables follow the same reset pattern.
5. Add a `save_version INTEGER DEFAULT 1` column to `game_state` to track schema version separately from content.

**Detection:**
- `GameState` type definition exceeds 50 lines
- `isValidGameState()` has more than 10 checks
- Save/load tests require quest-specific fixtures
- Migration functions have nested conditionals for quest sub-states

**Phase to address:** First phase (quest system foundation) — this is the single most important architectural decision for v2.0.

---

### Pitfall 2: Dialogue Trees Become Unmaintainable When Hardcoded in TypeScript

**What goes wrong:**
Developers write NPC dialogue as TypeScript objects or switch statements: `if (npc === 'phoenician_merchant' && quest === 'find_purple_dye' && reputation >= 50) { return "Ah, you seek Tyrian purple..." }`. With 15-25 ports, 3-5 NPCs per port, and branching dialogue, this produces thousands of lines of deeply nested conditionals. After 3 weeks, nobody can trace why a specific line appears. Dialogue updates require a full rebuild. Writers (if any) cannot contribute without TypeScript knowledge. Conditional logic (quest prerequisites, reputation gates, prior conversation flags) is tangled with content.

**Why it happens:**
The existing codebase follows a pattern of inline data — the `EVENTS` array in events.ts is 28,750 bytes of hardcoded event definitions. This works for 24 voyage events but does not scale to hundreds of dialogue nodes with conditions, branches, and state tracking.

**Consequences:**
- Content changes require code changes, which require rebuilds and risk introducing bugs
- Dialogue logic is untestable without rendering the entire game
- Impossible to validate narrative consistency (does every quest have a resolution path?)
- No tooling for visualizing conversation flow
- Duplicate text across branches (the classic dialogue tree duplication problem)

**Prevention:**
1. Store dialogue in JSON data files, not TypeScript code: `data/dialogue/piraeus.json`, `data/dialogue/carthage.json`. Each file defines a dialogue graph with nodes, edges, and conditions.
2. Use a flat node-based format, not a tree:
   ```json
   {
     "id": "phoenician_intro_1",
     "speaker": "Hanno",
     "text": "Welcome to Carthage, Greek. Your reputation precedes you.",
     "conditions": [{ "type": "reputation", "faction": "phoenician", "min": 20 }],
     "choices": [
       { "text": "I seek Tyrian purple.", "next": "purple_quest_offer" },
       { "text": "What goods move through here?", "next": "trade_info" }
     ]
   }
   ```
3. Build a minimal dialogue engine (~200 lines) that loads JSON, evaluates conditions against game state, and returns the next node. This is testable in isolation.
4. Conditions reference game state via a simple predicate system (`reputation >= X`, `quest.status === 'active'`, `hasVisited('tyre')`), not arbitrary code.
5. Validate dialogue graphs at build time: every `next` reference must point to an existing node, every quest-gating condition must reference a defined quest.

**Detection:**
- Dialogue-related TypeScript files exceed 500 lines
- Inline string literals for NPC speech in component or handler code
- No way to enumerate all possible dialogue paths for a given NPC
- Content creators need developer assistance to change a single line

**Phase to address:** NPC dialogue system phase — the data format decision must precede any content authoring.

---

### Pitfall 3: Progressive Port Unlocking Breaks the Existing Open Map

**What goes wrong:**
The current game has 25 ports, all accessible from turn 1. `getReachablePorts()` (voyage.ts) returns ports based on distance/route constraints, not unlock status. Progressive unlocking means some ports are hidden or inaccessible until the player earns reputation, completes quests, or meets NPCs who reveal them. But the Leaflet map renders all ports from the `ports` table (seeded at startup). If unlocking is a renderer-side filter (hide port markers for locked ports), but the game engine still allows sailing there, the player can reach locked ports by modifying the IPC call. If unlocking is engine-side, `getReachablePorts()` needs access to quest/reputation state, creating tight coupling between systems.

**Why it happens:**
The current architecture separates concerns cleanly: ports are static data, economy is dynamic data, game state is FSM state. Progressive unlocking violates this separation — it makes port access dependent on narrative state, economic state (reputation), and game progress simultaneously.

**Consequences:**
- Locked ports visible on map (spoilers) OR invisible on map (players don't know they exist — no motivation to unlock them)
- Engine-side enforcement requires quest/reputation queries in voyage.ts, coupling navigation to narrative
- Tutorial starts at Piraeus but all other ports are reachable — if you lock them, the tutorial breaks for saves that started before unlocking was added
- Map feels empty if too many ports are locked at start; progression feels meaningless if too few are locked

**Prevention:**
1. Use a "fog of knowledge" model, not hard locks. All ports exist on the map (labeled with ancient names). The player can see them but visiting an unknown port shows a generic "You arrive at an unfamiliar harbor" scene with limited trade options. Unlocking a port means getting its FULL experience (NPCs, quests, lore, specialized goods).
2. Add a `port_status` table: `(port_id TEXT, status TEXT CHECK(status IN ('unknown','discovered','unlocked')), discovered_at INTEGER)`. Default all 25 existing ports to `discovered` for backward compat. New ports added in v2.0 default to `unknown`.
3. `getReachablePorts()` returns all ports as before. A separate `getPortExperience(portId)` function checks unlock status and returns the appropriate depth of content.
4. Start the player with Piraeus + 3-4 nearby ports unlocked. NPCs at unlocked ports reveal adjacent ports. This creates natural geographic progression without artificial gates.
5. Never prevent sailing to a port — only limit what happens when you arrive. This preserves the open-world feel while rewarding exploration.

**Detection:**
- Playtest: player feels trapped with nothing to do because too many ports are locked
- Playtest: player unlocks everything in 30 minutes because unlocking is too easy
- Old saves have no port_status records — game crashes or treats all ports as locked
- `getReachablePorts()` has quest/reputation imports

**Phase to address:** Port content/unlocking phase — design the unlock model BEFORE authoring port-specific content.

---

### Pitfall 4: Save Game Compatibility Breaks for Every New System

**What goes wrong:**
v2.0 adds 4-6 new systems (quests, NPCs, reputation, port unlocking, dialogue flags, expanded journal). Each system needs persistence. The current migration approach is ad-hoc: `try { ALTER TABLE ... ADD COLUMN } catch { /* already exists */ }` (schema.ts:57-60) and optional fields with runtime defaults (save.ts:36-39). This worked for one or two additions but with 4-6 new tables and multiple new columns, the initialization code becomes a sequence of try/catch blocks that is untestable, un-orderable, and silently swallows real errors.

**Why it happens:**
There is no migration system. `initializeDatabase()` (schema.ts:14-170) runs `CREATE TABLE IF NOT EXISTS` for every table on every launch. Schema changes are handled by catching `ALTER TABLE` errors. There is no concept of "database version" — no way to know which migrations have already run, no way to run them in order, no way to roll one back.

**Consequences:**
- Silent failures: a migration error is caught and ignored, leaving the database in a half-migrated state
- Ordering matters: if table B has a foreign key to table A, and table A's migration fails silently, table B's creation fails loudly
- Players who upgrade from v1.3 to v2.0 see undefined behavior if any migration fails
- Testing requires simulating every possible prior database state (v1.0, v1.1, v1.2, v1.3)
- `game:newGame` must know about every table to reset (save.ts:87-93) — easy to forget a new one

**Prevention:**
1. Implement a simple version-based migration system:
   ```sql
   CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);
   INSERT OR IGNORE INTO schema_version VALUES (0);
   ```
2. Migration functions: `const migrations = [v1_initial, v2_quests, v3_reputation, ...]`. On startup, read current version, run all migrations after it, update version.
3. Each migration is a function that takes `db` and runs in a transaction. If it fails, the transaction rolls back and the app shows a meaningful error, not a silent catch.
4. Remove all `try { ALTER TABLE } catch {}` blocks. Migrations are explicit and ordered.
5. `game:newGame` should drop-and-recreate player-data tables (not reference tables like ports/goods), resetting schema_version for player data only.

**Detection:**
- More than 2 `try/catch` blocks around ALTER TABLE statements
- `initializeDatabase()` exceeds 100 lines
- Save files from older versions cause silent data loss
- `game:newGame` does not reset a newly added table

**Phase to address:** First phase of v2.0 — migration system must exist before adding any new tables.

---

### Pitfall 5: Historical Content Prioritizes Volume Over Accuracy, Undermining Educational Value

**What goes wrong:**
The v2.0 scope calls for "rich port experiences with deep historical content" across 15-25 ports. Developer writes 500 words of historical lore per port, 3-5 NPC backstories, 10+ dialogue lines each. Total: 50,000+ words of historical content. Without domain expertise or source verification, the content contains anachronisms (iron coinage in 800 BCE, paper maps, crops not yet cultivated in a region), misattributions (Greek customs at Phoenician ports), and presentism (modern values projected onto ancient peoples). An educator uses the game in class, students cite an inaccuracy in a paper, the educational credibility is destroyed.

**Why it happens:**
Writing historically grounded content for the 600-900 BCE Mediterranean requires specialized knowledge. LLM-generated content (including from Claude) will confidently produce plausible-sounding but wrong details. The project constraints say "no AI-generated imagery" but don't yet address AI-generated text accuracy. The temptation is to ship more content faster, but shallow content across 25 ports is worse than deep content at 10 ports.

**Consequences:**
- Educators distrust the game after finding one significant error
- Students learn wrong "facts" about ancient civilizations
- Historical communities criticize the project publicly
- Rework cost is enormous — rewriting lore after it's been threaded through quests and dialogue

**Prevention:**
1. Fewer ports, more depth. Start with 8-10 ports where source material is strong: Piraeus, Corinth, Carthage, Tyre, Sidon, Memphis, Syracuse, Massalia. Add ports only when content meets a quality bar.
2. Every historical claim in dialogue/lore must cite a source. Add a `sources` field to dialogue JSON: `"sources": ["Herodotus, Histories 4.152", "Pleiades 658378"]`. This forces research and enables verification.
3. Use primary source references (Herodotus, Thucydides, archaeological records) not general knowledge. The Met Museum API, Pleiades gazetteer, and Perseus Digital Library are already in the project's constraints — use them for text content too.
4. Flag uncertainty: if a historical detail is uncertain, say so in-game: "Scholars believe..." not "The Phoenicians did X." This is educationally honest and avoids false authority.
5. Time-bound the setting: 600-900 BCE is 300 years. Pick a narrower window (e.g., 550-500 BCE, the age of Polycrates and early Athenian trade expansion) to reduce the surface area of possible anachronisms.
6. Review cycle: before shipping a port's content, verify every named person/event/custom against at least one academic source.

**Detection:**
- Port descriptions mention technologies, crops, or political structures from the wrong century
- NPC dialogue uses modern idioms or values ("democracy" at Carthage, "human rights")
- No source citations in the content data files
- All 25 ports have content but none has been fact-checked

**Phase to address:** Content authoring phases — establish the sourcing standard BEFORE writing the first port's lore.

---

## Moderate Pitfalls

Mistakes that cause delays, rework, or degrade the player experience.

### Pitfall 6: Quest System Creates a Second FSM That Conflicts With the Game FSM

**What goes wrong:**
The game already has a clean FSM: idle -> trading -> sailing -> encountered (state.ts). Quests introduce their own state machine: inactive -> active -> (subtask1_complete, subtask2_complete, ...) -> completed/failed. These two FSMs interact: a quest might require the player to be in a specific game state (e.g., "trade at Tyre" requires `trading` state at port `tyre`). If the quest FSM checks game state directly, the two systems become tightly coupled. If a quest advances the game FSM (auto-completes a trade, forces sailing), it violates the single-action dispatch model.

**Why it happens:**
The game FSM is elegant because it's small (4 states, ~8 transitions). Quest systems inherently need more states and cross-cutting transitions. Developers try to extend the game FSM with quest states (adding `questing` as a 5th state) or embed quest logic in existing transitions.

**Consequences:**
- `handleAction()` (state.ts:59-173) becomes a 500-line function with quest-specific branches
- The exhaustive `never` check at the end fails as new states are added, breaking existing tests
- Quest transitions can leave the game in impossible states (idle but mid-quest-dialogue)
- Two FSMs disagreeing: quest says "go to Tyre" but game FSM is in `encountered` state and can't navigate

**Prevention:**
1. Keep the game FSM untouched. Do not add new GameState variants for quests.
2. Quest state is a parallel system that OBSERVES game state transitions but does not CONTROL them. When the game dispatches `ARRIVE` at Tyre, the quest system listens and updates quest progress. The game FSM does not know about quests.
3. Use an event/observer pattern: game actions emit events, quest system subscribes. `onGameAction('ARRIVE', (state) => checkQuestProgress(state.destination))`.
4. Quest-triggered UI (dialogue, quest offers) appears as an overlay on top of the existing port/trading screens, not as a new game state.
5. The only integration point is: when rendering a port, check quest state to decide which NPCs/dialogue to show. This is a read-only query, not a state mutation.

**Detection:**
- New entries in the `GameState` union type for quest-related states
- `handleAction()` imports quest modules
- Quest code directly calls `handleAction()` to advance game state
- Tests for game FSM require quest fixtures

**Phase to address:** Quest system architecture phase — define the observation pattern before implementing any quests.

---

### Pitfall 7: Reputation System Creates Unrecoverable Dead Ends

**What goes wrong:**
Reputation affects trade prices and NPC access. Developer implements: Phoenician reputation < -20 means NPCs at Tyre/Sidon/Carthage refuse to talk. Player accidentally angers Phoenicians early (bad dialogue choice, attacked Phoenician ship in event). Now they cannot access 3 major ports' quest content, which gates access to other ports. The player is softlocked — they can technically keep trading at Greek ports but can never complete the Odyssey.

**Why it happens:**
Reputation systems feel natural in RPGs where there are dozens of factions and many paths to completion. In a 15-25 port educational game with a specific narrative arc, negative reputation can close off content that is REQUIRED for progression. The game is not an open sandbox — it has a designed educational journey.

**Consequences:**
- Player softlocked 4 hours into the game with no way forward
- Educational content at locked ports is never seen
- Players learn to game the system (always pick the "nice" option) instead of exploring authentic historical tensions
- Save-scumming becomes the meta-strategy, undermining the turn-based thoughtfulness

**Prevention:**
1. Reputation should MODIFY experiences, not GATE them. Low Phoenician reputation means higher prices at Tyre and grumpier NPCs, not locked doors. Every port must be completable at any reputation level.
2. If gating is necessary, provide recovery paths: an NPC who offers a "redemption quest" to restore reputation. Never require more than 2 successful trades to recover from any negative reputation.
3. Reputation floor: no faction drops below -50 (on a -100 to +100 scale), and at -50 the player can still access all content with a price penalty, not a content lock.
4. Test the critical path: verify that the main quest line is completable with MINIMUM reputation at every faction. If any quest requires reputation > 0 at a specific faction, there MUST be a way to earn that reputation without completing the quests it gates.
5. Show reputation impacts BEFORE the player commits: "This choice will lower Phoenician standing by 10." No hidden consequences.

**Detection:**
- Playtest: player cannot find a way to complete the main quest
- Any dialogue node has a condition `reputation >= X` without an alternative path
- No reputation recovery mechanic exists
- Reputation changes are hidden from the player

**Phase to address:** Reputation system phase — design recovery paths alongside the initial system.

---

### Pitfall 8: Content Authoring Bottleneck Causes Feature Creep in Code

**What goes wrong:**
The developer builds the quest engine, dialogue system, reputation system, and port unlocking in the first 3 phases. Then realizes they need to write content for 15-25 ports: lore, NPCs, dialogue trees, quest chains, trade good descriptions, historical context. This is 80% of the work. Rather than doing the slow content authoring, the developer keeps adding code features: ship upgrades, commodity chains, crew management, weather events, mini-games. The system has 10 features and 2 ports with content. The game is a beautifully engineered empty world.

**Why it happens:**
Writing code is satisfying and has clear completion signals (tests pass, feature works). Writing historical content is slow, requires research, and has no clear "done" signal. The PROJECT.md already lists future features (commodity chains, ship progression, crew management) that are tempting to pull forward. Feature creep is the #1 killer of indie game projects.

**Consequences:**
- 10 systems, 2 finished ports — the game feels like a tech demo
- Systems interact in unexpected ways because each was built without content to test against
- Scope doubles, timeline doubles, motivation drops
- The educational value comes from CONTENT, not code — a beautifully architected empty game teaches nothing

**Prevention:**
1. Content-first milestone gates: no new code feature begins until at least 5 ports have full content (lore, NPCs, dialogue, quests). This forces content pacing.
2. The v2.0 scope says 15-25 ports. Commit to 10 ports for v2.0 MVP. Additional ports are v2.1. Write this down and do not change it.
3. Build the content pipeline early: JSON data format, validation script, sample port. Then author 2 ports fully before building the next code system. Real content reveals what the system actually needs.
4. Track code features vs content completion separately. If the ratio is >3:1 (3 code features per 1 complete port), stop coding and write content.
5. Keep the "Out of Scope" list in PROJECT.md updated and RESIST moving items to Active mid-milestone.

**Detection:**
- More than 3 code PRs between content PRs
- Any code feature added that is not in the v2.0 milestone scope
- The phrase "while I'm at it, I might as well add..."
- Features from the "Out of Scope" list appearing in code

**Phase to address:** All phases — this is a process discipline issue, not a technical one. The roadmap should interleave code and content phases.

---

### Pitfall 9: NPC Data Model Lacks Versioning and Becomes Stale

**What goes wrong:**
NPC dialogue references game state: "I hear you traded well in Corinth" (checks transaction_history for Corinth trades). Developer writes 50 NPC dialogue lines referencing specific ports, goods, quests. Then a port is renamed, a good is removed, or a quest is restructured. The dialogue references are now broken — NPC says "I hear you completed the amber quest" but the amber quest was renamed to "Baltic trade route." No tooling catches this because dialogue references are string-based, not type-checked.

**Why it happens:**
Dialogue content references game entities by string ID. There is no foreign key enforcement between dialogue JSON and the ports/goods/quests tables. The events.ts file already shows this pattern — event descriptions reference port names and goods by string, with no compile-time or runtime validation.

**Prevention:**
1. Build a validation script that runs at build time: parse all dialogue JSON, extract every referenced entity ID (port, good, quest, NPC), verify each exists in the corresponding data file.
2. Use consistent ID conventions: port IDs match `ports` table, good IDs match `goods` table, quest IDs match quest definitions. Document the convention.
3. Add a `data:validate` npm script that CI runs. It fails if any dialogue references a nonexistent entity.
4. When renaming or removing an entity, the validation script catches all broken references immediately.

**Detection:**
- NPC mentions a port/good/quest that doesn't exist
- Dialogue condition checks a quest ID that was renamed
- No build-time validation of content references

**Phase to address:** Content pipeline phase — validation must exist before bulk content authoring begins.

---

### Pitfall 10: Journal Integration With Quests Creates Entry Spam

**What goes wrong:**
The captain's journal (v1.3) auto-logs trades, arrivals, departures, and voyage events. v2.0 adds quest progress, NPC conversations, reputation changes, port discoveries, and lore entries. Every quest step, every NPC interaction, every reputation change generates a journal entry. A single port visit produces 8-12 journal entries: arrival, NPC greeting, quest offer, quest accepted, trade, reputation change, lore discovery, departure. The journal becomes an unreadable wall of text. The educational content (lore entries) is buried under mechanical entries (reputation +5, quest step 2/7 complete).

**Why it happens:**
The existing journal pattern logs everything (journal.ts creates entries for every game action). Extending this to quest/NPC/reputation events follows the same pattern. Each system independently decides to log, with no central curation.

**Consequences:**
- Players stop reading the journal because it's overwhelming
- Educational lore entries are invisible among mechanical updates
- Journal pagination (recommended in v1.3 PITFALLS) helps performance but not readability
- The journal's educational purpose is defeated by noise

**Prevention:**
1. Categorize journal entries with display priority: `NARRATIVE` (lore, historical context — always shown), `QUEST` (quest milestones — shown), `MECHANICAL` (reputation changes, minor updates — collapsed/hidden by default).
2. Add a filter/tab system to the journal: "Story" (narrative + quest), "Trades" (existing trade entries), "All" (everything).
3. Batch related entries: "At Carthage, you met Hanno, accepted the Purple Trade quest, and traded olive oil for a profit of 45g" — one entry, not four.
4. Quest progress updates should only journal MILESTONES, not every substep. "Found the source of Tyrian purple at Tyre" is worth logging. "Quest step 3 of 7 complete" is not.
5. Rate-limit: no more than 3 journal entries per port visit.

**Detection:**
- A single port visit generates more than 5 journal entries
- Players skip the journal entirely during playtesting
- Lore/educational entries require scrolling past mechanical entries to find

**Phase to address:** Journal integration phase — define the entry taxonomy before connecting new systems to the journal.

---

## Minor Pitfalls

Annoyances that are fixable but worth preventing.

### Pitfall 11: Reputation UI Obscures Rather Than Teaches

**What goes wrong:**
Reputation displayed as a number (Phoenician: 47/100) is meaningless to students. They optimize for number-go-up without understanding what the number represents historically. The educational value — that Mediterranean trade depended on relationships, xenia (guest-friendship), and cultural trust — is lost behind a game mechanic.

**Prevention:**
1. Show reputation as a qualitative descriptor, not a number: "Trusted trader" not "72/100". Map ranges to historically flavored labels: "Stranger," "Known merchant," "Friend of the harbor," "Proxenos" (official guest-friend).
2. Show the WHY: "Phoenician traders remember your fair dealing at Tyre" not just "+5 reputation."
3. Use historically grounded consequences: better reputation = access to private markets, insider trade tips, cheaper harbor fees. Frame these as social relationships, not stat bonuses.

**Phase to address:** Reputation UI phase.

---

### Pitfall 12: Port Content Inconsistency Across Authors/Sessions

**What goes wrong:**
Writing lore for 10+ ports across multiple development sessions produces inconsistent tone, depth, and accuracy. Piraeus gets 2000 words of researched content because it was written first. Port #9 gets 200 words of generic text because the developer was tired. Some ports reference a specific year (550 BCE), others are vague ("the ancient world"). NPCs at some ports have 10 dialogue nodes; at others, 2.

**Prevention:**
1. Create a port content template that defines minimum requirements: 1 historical paragraph (100-200 words), 2 NPCs with 5+ dialogue nodes each, 1 quest hook, 3 trade-relevant historical details, 1 source citation per historical claim.
2. Write all port summaries first (one paragraph each for all 10 ports), then deepen. This ensures consistent breadth before variable depth.
3. Consistent temporal framing: pick one decade (e.g., 540-530 BCE) and write all content from that perspective. Reference the same historical events across ports (Persian expansion, Phoenician trade networks).

**Phase to address:** Content authoring phases — template before writing.

---

### Pitfall 13: Dialogue Engine Performance With Large Conversation Graphs

**What goes wrong:**
Each port loads its dialogue JSON, evaluates conditions for every node to determine available options, and queries multiple tables (reputation, quest_progress, npc_state, transaction_history) per condition. With 10+ NPCs and 50+ nodes per port, this becomes a noticeable delay on port arrival — especially since better-sqlite3 is synchronous and runs on the main process.

**Prevention:**
1. Pre-compute available dialogue on port arrival, not on each interaction. Cache the result until game state changes.
2. Keep condition evaluation simple: reputation lookups and boolean flags, not complex queries against transaction_history.
3. Dialogue JSON should be loaded once at app startup (it's static data), not read from disk on every port visit.
4. If performance is still an issue, move condition evaluation to a worker thread. But this is unlikely with <100 nodes per port.

**Phase to address:** Dialogue engine phase — profile after implementing, optimize only if needed.

---

## Integration Pitfalls

Mistakes when connecting v2.0 features to the existing v1.3 systems.

### Integration 1: Quest Progress + Weather System Interaction

**What goes wrong:**
A quest says "Deliver grain to Memphis within 5 turns." The weather system adds +3 turns to the voyage because it's winter (mare clausum season). The player fails the quest through no fault of their own — the weather system didn't exist when the quest was designed. Quest deadlines and weather modifiers are independent systems that create unfair interactions.

**Prevention:**
1. No hard turn deadlines on quests. Use soft urgency: "The grain shipment is needed soon" but no automatic failure after N turns. Ancient trade was slow — deadlines are ahistorical anyway.
2. If time pressure is needed, express it in seasons, not turns: "Deliver before the mare clausum." This integrates naturally with the weather system and teaches the concept.
3. Test every quest with worst-case weather: does it remain completable if every voyage takes maximum duration?

---

### Integration 2: Port Unlocking + Existing 25 Ports

**What goes wrong:**
v1.3 has 25 ports, all accessible. v2.0 wants progressive unlocking. If the unlock system defaults new saves to "all 25 locked," the early game is empty. If it defaults to "all 25 unlocked," there's nothing to progressively unlock. If it treats old saves as "all unlocked" and new saves as "mostly locked," the two experiences diverge dramatically — bug reports become uninterpretable because they depend on save vintage.

**Prevention:**
1. Distinguish between v1.x ports (always unlocked) and v2.0 ports (require discovery). The 25 existing ports are "known" by default. New ports added in v2.0 require discovery.
2. For new games, start with 5 ports unlocked (Piraeus + immediate neighbors), 20 existing ports as "discovered" (visible on map, basic trading available), and new v2.0 ports as "unknown."
3. For loaded v1.x saves, treat all 25 ports as "unlocked" (full experience). New v2.0 ports are "unknown." Migration: `INSERT INTO port_status SELECT id, 'unlocked' FROM ports WHERE NOT EXISTS (SELECT 1 FROM port_status WHERE port_id = ports.id)`.

---

### Integration 3: Reputation + Existing Economy System

**What goes wrong:**
Reputation modifies trade prices (high reputation = better prices). The economy system (economy.ts) already has supply/demand pricing. If reputation applies a flat modifier on top of supply/demand pricing, the two systems can produce absurd results: a glut of wheat (supply >> demand, price = 1g) with a reputation bonus could produce a negative price, or a scarce good with a reputation penalty could exceed any reasonable price.

**Prevention:**
1. Reputation modifies prices as a percentage, not a flat amount: +/- 5% per reputation tier, capped at +/- 20%.
2. Apply reputation modifier AFTER supply/demand calculation, as a final multiplier. This preserves the economic model's integrity.
3. Floor all prices at 1g and cap at 5x base price. No economic condition should produce prices outside this range.
4. Test: what happens when maximum reputation bonus meets minimum supply/demand price? What about minimum reputation penalty with maximum price?

---

### Integration 4: New Game Reset Must Cover All New Tables

**What goes wrong:**
`game:newGame` (save.ts:84-98) deletes from `game_state`, `transaction_history`, `journal_entries`, and `player_inventory`. It does NOT delete from quest_progress, npc_state, reputation, or port_status because those tables don't exist yet. When they're added, developers forget to update the reset handler. Player starts a "new game" and has quest progress from a previous playthrough.

**Prevention:**
1. Maintain a `PLAYER_DATA_TABLES` constant: `['game_state', 'transaction_history', 'journal_entries', 'player_inventory', 'quest_progress', 'npc_state', 'reputation', 'port_status']`. The reset handler iterates this list.
2. Reference data tables (ports, goods, port_inventory, curated_images) are NOT reset. They are seeded once.
3. Add a test: `game:newGame` should leave zero rows in every player data table except `game_state` (which gets the initial state) and `player_inventory` (which gets defaults).
4. Every PR that adds a new player-data table must also add it to the reset list and the test.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Quest Foundation | Quest state bloats GameState JSON blob | Separate quest tables, keep FSM lean (Pitfall 1) |
| Quest Foundation | Quest FSM conflicts with game FSM | Observer pattern, no new GameState variants (Pitfall 6) |
| Quest Foundation | No migration system for new tables | Version-based migration before any new tables (Pitfall 4) |
| Dialogue System | Dialogue hardcoded in TypeScript | JSON data files with condition predicates (Pitfall 2) |
| Dialogue System | Broken references to renamed entities | Build-time validation script (Pitfall 9) |
| Port Content | Volume over accuracy | Fewer ports, cited sources, quality gate (Pitfall 5) |
| Port Content | Inconsistent depth across ports | Content template with minimums (Pitfall 12) |
| Port Unlocking | Breaks open map feel | Fog of knowledge, not hard locks (Pitfall 3) |
| Port Unlocking | Old saves vs new saves diverge | Tier system: unknown/discovered/unlocked (Integration 2) |
| Reputation | Unrecoverable dead ends | Modify not gate, recovery paths, reputation floor (Pitfall 7) |
| Reputation | Breaks economy edge cases | Percentage modifier, price floor/cap (Integration 3) |
| Journal Integration | Entry spam drowns educational content | Priority taxonomy, entry batching, rate limit (Pitfall 10) |
| All Phases | Feature creep over content authoring | Content-first gates, interleaved phases (Pitfall 8) |
| All Phases | New game reset misses new tables | PLAYER_DATA_TABLES constant + test (Integration 4) |

---

## "Looks Done But Isn't" Checklist for v2.0

- [ ] **Save Compatibility:** v1.3 saves load in v2.0 with all new systems defaulted correctly
- [ ] **Save Compatibility:** Migration system exists with version tracking, not try/catch ALTER TABLE
- [ ] **Quest System:** Quest state stored in separate table, not in GameState JSON
- [ ] **Quest System:** Game FSM unchanged — no new state variants added for quests
- [ ] **Quest System:** Main quest completable with minimum reputation at all factions
- [ ] **Dialogue:** All dialogue in JSON data files, not TypeScript code
- [ ] **Dialogue:** Build-time validation catches broken entity references
- [ ] **Dialogue:** Every NPC dialogue node has a valid `next` pointer or is a terminal node
- [ ] **Port Unlocking:** Player can sail to any port, even undiscovered ones
- [ ] **Port Unlocking:** Old saves treat all 25 existing ports as unlocked
- [ ] **Reputation:** No faction reputation gates required content
- [ ] **Reputation:** Recovery path exists for every possible reputation state
- [ ] **Reputation:** Price modifier capped at +/- 20%, prices floored at 1g
- [ ] **Content:** Every historical claim cites at least one source
- [ ] **Content:** No anachronisms (technologies, crops, political structures from wrong century)
- [ ] **Content:** All 10 target ports meet the content template minimums
- [ ] **Journal:** Port visit generates no more than 3 journal entries
- [ ] **Journal:** Educational lore entries are visually distinct from mechanical entries
- [ ] **New Game:** Reset handler covers ALL player data tables
- [ ] **New Game:** Test verifies zero player data rows after reset (except defaults)

---

## Sources

- Codebase analysis: `src/game/state.ts`, `src/game/types.ts`, `src/shared/game-types.ts` — FSM architecture
- Codebase analysis: `src/main/db/schema.ts` — database schema, migration patterns
- Codebase analysis: `src/main/ipc/save.ts` — save/load, new game reset, validation
- Codebase analysis: `src/game/events.ts` — inline content pattern (28KB events file)
- [Building a Quest System (HackerNoon)](https://hackernoon.com/building-a-quest-system-cf7f1d3da132) — quest FSM patterns
- [Implementing a Scalable Quest System (Better Programming)](https://betterprogramming.pub/implementing-a-scalable-quest-system-7f36ea4cfe22) — data-driven quest architecture
- [Branching Dialogue Nightmare (StoryFlow)](https://storyflow-editor.com/blog/branching-dialogue-nightmare-how-to-fix/) — dialogue tree maintainability
- [The Poor Man's Dialogue Tree (Gamedeveloper.com)](https://www.gamedeveloper.com/programming/the-poor-man-s-dialogue-tree) — flat node format over tree hierarchy
- [How to Write Branching Dialogue Without Code (NarrativeFlow)](https://narrativeflow.dev/blog/how-to-write-branching-dialogue-without-code-and-actually-keep-it-organized/) — content/code separation
- [Game-based Learning, History, and Authenticity (Filament Games)](https://www.filamentgames.com/blog/game-based-learning-history-and-authenticity/) — authenticity vs accuracy
- [Considering Evidence-Based Validity of Historical Games (Gaming the Past)](https://gamingthepast.net/2026/03/23/considering-the-evidence-based-validity-of-a-historical-game-defensible-models-and-why-we-should-care/) — educational game standards
- [Beating Feature Creep (Gamedeveloper.com)](https://www.gamedeveloper.com/business/beating-feature-creep) — scope management
- [Avoiding Feature Creep in Game Development (Medium)](https://medium.com/@bjr29/avoiding-feature-creep-in-game-development-a292f006688a) — content vs code pacing
- [Designing the Reputation System of Loop: The Distress Call (Medium)](https://medium.com/@Advenworks/designing-the-reputation-system-of-the-narrative-game-loop-the-distress-call-da63f2112b68) — reputation dead-end prevention
- [The Pitfalls of Meta Game Design (Gamedeveloper.com)](https://www.gamedeveloper.com/design/the-pitfalls-of-meta-game-design) — progression system over-gating
- [GameDev.net — Save Data Through Versions](https://gamedev.net/forums/topic/702903-how-to-transfer-save-data-through-versions/) — migration patterns
- [Unity Forums — Backward Compatible Save Files](https://discussions.unity.com/t/backward-compatible-save-files/779866) — versioned migration
- [Game Saves Compatibility (AGS Manual)](https://adventuregamestudio.github.io/ags-manual/GameSavesCompatibility.html) — additive-only schema changes

---

*Pitfalls research for: Archeology Simulator v2.0 — The Merchant's Odyssey*
*Researched: 2026-03-31*

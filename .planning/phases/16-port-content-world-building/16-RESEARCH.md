# Phase 16: Port Content & World Building - Research

**Researched:** 2026-03-31
**Domain:** Historical content authoring, data seeding, UI display
**Confidence:** HIGH

## Summary

Phase 16 is primarily a **content and data wiring** phase, not a systems-building phase. The codebase already has most infrastructure in place: 25 ports are seeded in `queries.ts` with cultural descriptions, 10 trade goods exist with regional supply/demand matrices, the `port_lore` table was created in migration v6, and the `PortLore` TypeScript interface is defined in `game-types.ts`. The `PortInfoPanel` already renders `culturalDescription` when present.

The main gaps are: (1) the `port_lore` table has no seed function and no query/IPC layer, (2) ambient descriptions do not exist in any schema or type, (3) `ports.json` is stale (6 entries vs 25 seeded ports), (4) sea routes only cover the original 6 ports leaving 19 ports with direct-line fallback, and (5) no UI exists for displaying lore sections or ambient arrival text.

**Primary recommendation:** Populate port_lore with cited historical content, add an ambient_description column (migration v8), wire lore + ambient data through IPC to the UI, update ports.json to match seed data, and add critical sea route waypoints for new ports.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Each port has a JSON data file with: lore (100-200 words), cultural description, regional trade specializations, ambient description (sights/sounds/smells), historical citations
- Port lore sections teach real history: Phoenician alphabet, Athenian democracy, Egyptian grain trade, Carthaginian maritime empire, etc.
- Temporal framing: circa 540-530 BCE (late Archaic period)
- All historical claims must be citable to real sources
- New ports to add: Corinth, Miletus, Knossos, Sidon, Byblos, Memphis, Syracuse, Taras/Tarentum, Massalia, Gades, Emporion, Cyrene, Leptis Magna (most already seeded)
- Regional trade goods historically accurate per region
- Each port gets a unique arrival ambient description
- Ambient displayed on first arrival and in port info panel

### Claude's Discretion
- Exact port selection (aim for 15-20 total)
- Level of historical detail per port
- How to structure the lore JSON schema
- Which trade goods to add vs defer
- Sea route waypoints for new ports

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PORT-01 | Each port displays rich historical lore -- culture, customs, religion, daily life | port_lore table exists (migration v6) with history, culture, trade_specialization, notable_facts_json, primary_sources_json columns. Needs seed data + query functions + IPC + UI panel |
| PORT-02 | Regional trade goods historically accurate | 10 goods already seeded with per-port supply/demand in seedPortInventory. Context specifies additional goods (cedar, papyrus, linen, garum, silphium, ivory) -- evaluate whether to add or map to existing |
| PORT-03 | Player can read "Port Lore" sections teaching real ancient history | PortLore interface exists in game-types.ts. Needs IPC handler, UI tab/section in PortInfoPanel or PortScene, and cited content |
| PORT-04 | World expanded to 15-25 historically important ports | 25 ports already seeded in queries.ts. ports.json has only 6 (stale). Need to sync and verify coverage |
| POLISH-03 | Port-specific ambient descriptions (sights, sounds, smells) | No ambient_description field exists anywhere. Need migration, type extension, seed data, and arrival display logic |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | (already installed) | Port lore + ambient seeding | Existing DB layer, INSERT OR IGNORE pattern |
| React | (already installed) | Lore display UI components | Existing renderer framework |
| Electron IPC | (already installed) | Bridge lore queries to renderer | Existing IPC pattern |

### Supporting
No new libraries needed. This is a content + wiring phase using existing infrastructure.

## Architecture Patterns

### Existing Data Flow (follow exactly)
```
ports.json (reference) --> seedPorts() --> ports table --> IPC handler --> React component
                                          port_lore table (v6 migration, empty)
                                          port_inventory table
```

### Pattern 1: Reference Data Seeding
**What:** Seed functions use `INSERT OR IGNORE` in a transaction, called on every app launch
**When to use:** All port lore and ambient data
**Example:**
```typescript
// Follow seedPorts() pattern in queries.ts
export function seedPortLore(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO port_lore (port_id, history, culture, trade_specialization, notable_facts_json, historical_period, primary_sources_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  // ... lore data array ...
  const seedAll = db.transaction(() => { ... });
  seedAll();
}
```

### Pattern 2: IPC Handler for Read-Only Data
**What:** Register IPC handler in game.ts, query DB, return typed result
**When to use:** Fetching port lore for display
**Example:**
```typescript
// Follow getPortDetails pattern
ipcMain.handle('game:getPortLore', async (_event, portId: string) => {
  const lore = getPortLore(db, portId);
  return { success: true, data: lore };
});
```

### Pattern 3: UI Display Section
**What:** Conditional render block in PortInfoPanel with Cinzel headings and Lora body text
**When to use:** Showing lore sections, ambient text
**Example:** See existing `culturalDescription` render block at line 217-245 of PortInfoPanel.tsx

### Recommended Content Structure

The port_lore table already has the right schema. Use it as-is:

```
port_lore:
  port_id              TEXT PRIMARY KEY   -- FK to ports.id
  history              TEXT               -- 100-200 word historical narrative
  culture              TEXT               -- customs, religion, daily life
  trade_specialization TEXT               -- what this port is known for trading
  notable_facts_json   TEXT               -- JSON array of 2-4 "did you know" facts
  historical_period    TEXT               -- "circa 540-530 BCE" for all
  primary_sources_json TEXT               -- JSON array of source citations
```

For ambient descriptions, add a column to the ports table (not port_lore, since it's displayed at arrival alongside port name):

```sql
-- Migration v8
ALTER TABLE ports ADD COLUMN ambient_description TEXT;
```

### Anti-Patterns to Avoid
- **Separate JSON files per port for lore:** The existing pattern seeds lore inline in queries.ts. Don't create 25 separate JSON files -- it contradicts the established seeding pattern.
- **Putting ambient descriptions in port_lore:** Ambient text is displayed at arrival (port-level concern), not in the lore panel. Keep it on the ports table.
- **Adding new goods without port_inventory entries:** Every new good_id needs supply/demand rows for all 25 ports or the market screen breaks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Historical citations | Custom citation format | Simple string array in primary_sources_json | Author-title-date strings are sufficient for educational game |
| Lore display layout | New component from scratch | Extend PortInfoPanel with lore sections | Matches existing Cinzel/Lora parchment theme |
| Arrival notifications | Custom notification system | Journal entry of type 'arrival' (already exists) + inline ambient text in PortScene | Journal already logs arrivals |

## Common Pitfalls

### Pitfall 1: ports.json vs seedPorts() Divergence
**What goes wrong:** ports.json has 6 entries, seedPorts() has 25. Code that reads ports.json directly will have stale data.
**Why it happens:** ports.json was the original source, then seedPorts() was expanded without updating the JSON.
**How to avoid:** Either update ports.json to match seedPorts() or confirm nothing reads ports.json at runtime (seed functions use inline data). If ports.json is only for reference/validation, update it for consistency.
**Warning signs:** Port counts differ between JSON file and database.

### Pitfall 2: Historical Anachronisms (540-530 BCE Temporal Frame)
**What goes wrong:** Content references events/entities that don't exist yet in 540 BCE -- Library of Alexandria (331 BCE), Roman Empire, Colossus of Rhodes (280 BCE).
**Why it happens:** Existing cultural descriptions already contain anachronisms (Alexandria "founded by Alexander" in 331 BCE is 200 years after game timeframe; Ostia "Roman Empire" references). The game is set circa 540-530 BCE.
**How to avoid:** New lore content MUST be temporally consistent. For existing ports whose real history starts later (Alexandria, Ostia), frame them as pre-existing settlements or proto-ports. Acknowledge the anachronism footnote style.
**Warning signs:** References to Alexander, Roman Empire, Hellenistic period, events after 530 BCE.

### Pitfall 3: Uncitable Historical Claims (STATE.md Pitfall 5)
**What goes wrong:** Making claims about ancient trade that sound plausible but have no scholarly backing.
**Why it happens:** It's easy to "sound historical" without actually citing sources.
**How to avoid:** Every port lore entry must include primary_sources_json with at least 1-2 real scholarly references. Good sources: Herodotus, Thucydides, Braudel's "The Mediterranean", Horden & Purcell's "The Corrupting Sea", specific Pleiades entries.
**Warning signs:** Lore text with no sources, vague attributions like "historians believe".

### Pitfall 4: INSERT OR IGNORE Won't Update Existing Rows
**What goes wrong:** Adding lore data via INSERT OR IGNORE to a table where rows already exist -- data never updates.
**Why it happens:** The port_lore table was created in migration v6 but never populated. If any rows were inserted by testing, INSERT OR IGNORE silently skips them.
**How to avoid:** Follow the seedPorts() pattern which uses both INSERT OR IGNORE for new rows AND a separate UPDATE for backfilling specific columns on existing rows.

### Pitfall 5: Sea Route Gaps Cause Ships to Cross Land
**What goes wrong:** New ports without explicit sea routes use the direct-line fallback, which may path through landmasses.
**Why it happens:** ROUTE_WAYPOINTS only defines routes for the original 6 ports (10 routes total). The 19 newer ports have no entries.
**How to avoid:** Add waypoint routes for any new port pairs where direct lines would cross land. Prioritize routes from major hubs (Athens, Carthage, Alexandria, Tyre) to all ports.

### Pitfall 6: Migration Numbering
**What goes wrong:** Adding migration v8 when v8 might be claimed by another in-flight phase.
**Why it happens:** Multiple phases adding migrations concurrently.
**How to avoid:** Check current MIGRATIONS array length (currently 7 migrations, indices 0-6). The next migration is index 7 (v8). Verify no other phase claims this slot.

## Code Examples

### Existing Port Type (game-types.ts line 19-29)
```typescript
export interface Port {
  id: string;
  ancientName: string;
  modernName: string;
  lat: number;
  lng: number;
  region: PortRegion;
  description: string;
  pleiadesId?: string;
  culturalDescription?: string;
}
```

### Existing PortLore Type (game-types.ts line 199-207)
```typescript
export interface PortLore {
  portId: string;
  history: string;
  culture: string;
  tradeSpecialization: string;
  notableFacts: string[];
  historicalPeriod: string;
  primarySources: string[];
}
```

### Port Table Schema (includes cultural_description, no ambient yet)
```sql
CREATE TABLE ports (
  id                   TEXT PRIMARY KEY,
  ancient_name         TEXT NOT NULL,
  modern_name          TEXT NOT NULL,
  lat                  REAL NOT NULL,
  lng                  REAL NOT NULL,
  region               TEXT NOT NULL,
  description          TEXT NOT NULL,
  pleiades_id          TEXT,
  cultural_description TEXT
);
```

### Port Lore Table Schema (migration v6, currently empty)
```sql
CREATE TABLE port_lore (
  port_id              TEXT PRIMARY KEY,
  history              TEXT,
  culture              TEXT,
  trade_specialization TEXT,
  notable_facts_json   TEXT,
  historical_period    TEXT,
  primary_sources_json TEXT
);
```

### Existing Sea Waypoints (sea-routes.ts)
10 pre-defined routes covering original 6-port network. New ports need additional route entries.

### PortInfoPanel Cultural Description Display (line 217-245)
Renders under "Historical Context" heading with Cinzel/Lora fonts, parchment styling. New lore sections should follow same pattern.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ports.json as source of truth | seedPorts() inline data as source of truth | v1.3+ | ports.json is stale (6 entries vs 25 seeded) |
| 6 ports | 25 ports seeded | Phase 13+ | All 25 ports exist in DB with cultural descriptions |
| No lore table | port_lore table created | Migration v6 | Schema exists but unpopulated |

## Existing Port Coverage Audit

### Already Seeded (25 ports in queries.ts)
**Greece (8):** athens, corinth, sparta, miletos, ephesos, byzantion, rhodes, knossos
**Italy (4):** syracuse, massalia, taras, ostia
**North Africa (3):** carthage, utica, leptis
**Egypt (3):** alexandria, naukratis, memphis
**Levant (5):** tyre, sidon, byblos, kition, salamis_cy
**Iberia (2):** emporion, gadir

### CONTEXT.md Requested Ports vs Current
| Requested | Status | Notes |
|-----------|--------|-------|
| Corinth | Already seeded | corinth |
| Miletus | Already seeded | miletos |
| Knossos (Crete) | Already seeded | knossos |
| Sidon | Already seeded | sidon |
| Byblos | Already seeded | byblos |
| Memphis | Already seeded | memphis |
| Syracuse | Already seeded | syracuse |
| Taras/Tarentum | Already seeded | taras |
| Massalia | Already seeded | massalia |
| Gades (Cadiz) | Already seeded | gadir |
| Emporion | Already seeded | emporion |
| Cyrene | NOT seeded | Needs adding |
| Leptis Magna | Already seeded | leptis |

**Gap:** Only Cyrene is missing from the requested list. Consider adding it or deferring since 25 ports already exceeds the 15-25 target.

### Trade Goods Coverage
| Good (current) | Maps to CONTEXT.md Requirement |
|----------------|-------------------------------|
| wheat | Egypt grain |
| olive_oil | Greek olive oil |
| wine | Greek/Italian wine |
| textiles | Covers linen loosely |
| spices | Eastern spices |
| bronze | Cypriot copper/bronze |
| timber | Cedar wood |
| pottery | Generic pottery |
| attic_pottery | Attic black-figure pottery |
| purple_dye | Tyrian purple |

**CONTEXT.md goods not directly mapped:** papyrus, honey, glass, incense, gold, iron, wool, silver, tin, salt, garum, ivory, silphium. Decision: these could be added as new goods or deferred to a trade goods expansion phase. Adding all 13 would require 25x13 = 325 new port_inventory rows.

## Open Questions

1. **How many new goods to add?**
   - What we know: 10 goods exist with full port_inventory matrices. CONTEXT.md lists 13+ additional goods.
   - What's unclear: Adding all 13 goods is a significant data entry task (325+ inventory rows).
   - Recommendation: Add 3-5 signature goods (papyrus, silver, glass, garum, silphium) that most differentiate regions. Defer others.

2. **Should ports.json be updated or deprecated?**
   - What we know: ports.json has 6 entries, seedPorts() has 25. No code currently reads ports.json at runtime (seed uses inline data).
   - What's unclear: Whether ports.json serves any build-time validation purpose.
   - Recommendation: Update ports.json to match seeded data for documentation consistency, or add a comment that it's superseded.

3. **How to handle temporal anachronisms in existing descriptions?**
   - What we know: Several existing descriptions reference post-540 BCE events (Alexandria founded 331 BCE, Colossus of Rhodes 280 BCE).
   - What's unclear: Whether to rewrite existing descriptions or accept them as artistic license.
   - Recommendation: New lore should be temporally accurate. Add a `historicalPeriod: "circa 540-530 BCE"` note. Accept existing descriptions as-is (they're already shipped).

4. **Sea route coverage for 25 ports**
   - What we know: 10 routes cover original 6 ports. 19 ports use direct-line fallback.
   - What's unclear: Which new routes cross land and need waypoints.
   - Recommendation: Add routes from major hubs to all ports. Focus on routes that clearly cross land (e.g., Gadir to any eastern port must go through Strait of Gibraltar).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PORT-01 | Port lore data seeded for all ports | unit | `npx vitest run src/main/db/__tests__/port-lore.test.ts -t "seeds lore"` | Wave 0 |
| PORT-02 | Trade goods match regional specialization | unit | `npx vitest run src/main/db/__tests__/port-inventory.test.ts -t "regional goods"` | Wave 0 |
| PORT-03 | Port lore retrievable via IPC | unit | `npx vitest run src/main/ipc/__tests__/game.test.ts -t "getPortLore"` | Wave 0 |
| PORT-04 | 15+ ports exist in seed data | unit | `npx vitest run src/main/db/__tests__/queries.test.ts -t "port count"` | Wave 0 |
| POLISH-03 | Ambient descriptions seeded for all ports | unit | `npx vitest run src/main/db/__tests__/port-lore.test.ts -t "ambient"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/main/db/__tests__/port-lore.test.ts` -- covers PORT-01, POLISH-03
- [ ] Test for port count >= 15 -- covers PORT-04
- [ ] Test for lore IPC handler -- covers PORT-03

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/main/db/schema.ts` (migrations v1-v7)
- Codebase analysis: `src/main/db/queries.ts` (seedPorts with 25 ports, seedGoods with 10 goods, seedPortInventory with full matrices)
- Codebase analysis: `src/shared/game-types.ts` (Port, PortLore, PortRegion types)
- Codebase analysis: `src/game/sea-routes.ts` (10 routes, 11 waypoints)
- Codebase analysis: `src/renderer/components/PortInfoPanel.tsx` (existing lore display pattern)

### Secondary (MEDIUM confidence)
- Historical period accuracy (540-530 BCE) -- based on project CONTEXT.md decisions
- Pleiades IDs -- already present in seed data, verified format

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries needed, all patterns established
- Architecture: HIGH -- existing seeding, IPC, and UI patterns fully documented in codebase
- Pitfalls: HIGH -- based on direct codebase analysis (ports.json divergence, anachronisms, migration numbering)
- Content accuracy: MEDIUM -- historical claims need per-port scholarly verification during implementation

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable -- content phase, no dependency churn)

# Feature Landscape: v1.3 Gameplay Depth & Polish

**Domain:** Turn-based ancient Mediterranean trade simulator (educational)
**Researched:** 2026-03-31
**Focus:** Seasonal weather, captain's journal, sailing animation, trade profit/loss display
**Confidence:** HIGH (verified against codebase, historical sources, and game design patterns)

## Existing Foundation (What v1.3 Builds On)

Before detailing new features, here is what already exists and what each v1.3 feature hooks into:

| Existing System | Current State | v1.3 Feature That Extends It |
|----------------|---------------|------------------------------|
| `voyage.ts` — haversine distance, turn-based duration | Calculates distance/turns, no season awareness | Seasonal weather |
| `events.ts` — 24 events, 70% roll, weighted types | Flat probability, no season modifiers | Seasonal weather |
| `Logbook.tsx` — dropdown journal with weather/rumor/arrival entries | Component state only, pseudo-random weather text, not persisted | Captain's journal |
| `ShipMarker.tsx` — leaflet.motion polyline animation | 5s fixed duration, animates from departure to destination, fires ARRIVE on end | Sailing animation (already exists, needs polish) |
| `ProfitDisplay.tsx` — ledger with gold, profit/loss, recent trades | Shows overall P/L and transaction history, no per-good profit indicator | Trade profit/loss display |
| `TradePanel.tsx` — buy/sell UI with quantity stepper | Shows current price, no comparison to purchase price | Trade profit/loss display |
| `CargoItem` type — tracks `boughtAtPrice` and `boughtAtPort` | Data already available for profit calculation | Trade profit/loss display |
| `turnToDate()` in Logbook — Athenian month names, turn-to-date mapping | Turn 0 = 1 Hekatombaion 480 BCE, cycles through 12 months | Seasonal weather (season derivable from turn) |

## Feature 1: Seasonal Weather System

### What It Is

A system where the current game month/season affects voyage safety and travel time. Historical Mediterranean sailing had a defined "sailing season" (roughly May-October) and a dangerous "mare clausum" period (November-March) when open-sea navigation was officially closed.

### Expected Behavior in Similar Games

**How trade sims handle seasons:**

1. **Calendar display** -- Player always sees the current season/month. The existing `turnToDate()` already provides this.
2. **Voyage duration modifier** -- Winter voyages take longer (storms, sheltering). Summer voyages are fastest. Typical modifier: 1.0x summer, 1.3x spring/autumn, 1.8x winter.
3. **Event probability modifier** -- Storm events more likely in winter (40-50% vs 25% in summer). Calm events more likely in summer.
4. **Route-specific danger** -- Some routes are more dangerous in certain seasons (e.g., open-sea crossings in winter vs coastal routes year-round). Historically, coastal navigation continued in winter while open-water was suspended.
5. **Visual/narrative feedback** -- Weather descriptions change by season. The existing Logbook already generates weather text but it cycles through a fixed array by turn number, not by season.
6. **Warning before sailing** -- When selecting a winter destination, the game warns: "The seas are closed (mare clausum). This voyage is dangerous." Player can still sail but is informed of the risk.

### Historical Accuracy (HIGH confidence)

Per Vegetius and confirmed by multiple academic sources:

| Period | Months | Safety Level | Game Effect |
|--------|--------|--------------|-------------|
| **Mare Apertum** (open sea) | June-September | Safe | Normal speed, low storm chance (15-20%) |
| **Shoulder season** | April-May, October | Uncertain | +30% travel time, moderate storm chance (30%) |
| **Mare Clausum** (closed sea) | November-March | Dangerous | +80% travel time, high storm chance (50%), warning dialog |

### Complexity: MEDIUM

**What makes it medium, not low:**
- Requires modifying `calculateVoyageDuration()` to accept season parameter
- Requires modifying `rollVoyageEvent()` to weight by season
- Requires a `getSeason(turn: number)` utility (straightforward from existing `turnToDate()`)
- Requires UI warning when sailing in dangerous season
- Does NOT require new FSM states, new IPC channels, or database changes

**Dependencies on existing code:**
- `voyage.ts`: Add season multiplier to `calculateVoyageDuration()`
- `events.ts`: Season-aware `EVENT_WEIGHTS` in `rollVoyageEvent()`
- `Logbook.tsx`: Season-aware weather text (replace turn-cycling with season-appropriate descriptions)
- Port selection UI: Warning badge/text for mare clausum sailings

### Implementation Recommendation

Add a `Season` type and `getSeason()` function. Modify `calculateVoyageDuration` and `rollVoyageEvent` to accept an optional season parameter (backward-compatible). Add a visual season indicator near the existing date display in the Logbook title bar.

Do NOT build a complex wind simulation. The educational value is in the binary "safe season vs dangerous season" concept, not in simulating actual wind vectors. Keep it simple: season modifies two numbers (duration multiplier and storm weight).

---

## Feature 2: Captain's Journal

### What It Is

A persistent, narrative log that records the player's voyages, trades, events, and optionally player-written reflections. Serves dual purpose: gameplay record and pedagogical reflection tool.

### What Already Exists

The `Logbook.tsx` component is already 80% of the way there:
- Tracks weather, rumors, arrivals, departures, events, trades
- Uses Athenian calendar dates
- Collapsible dropdown UI at top of map
- Has entry type icons

**What it lacks (and what v1.3 should add):**

| Gap | Why It Matters | Complexity |
|-----|---------------|------------|
| **Not persisted** -- entries stored in React component state, lost on reload | Loses the educational narrative across sessions | MEDIUM (needs SQLite table + IPC) |
| **No trade entries** -- buy/sell transactions not logged | Students can't review their trade decisions | LOW (hook into existing buy/sell handlers) |
| **No event outcome entries** -- voyage events resolved but outcomes not logged | Students can't see consequences of choices | LOW (hook into event resolution) |
| **No player reflection** -- no way for students to write notes | Missing the metacognitive "why did I do that" reflection | LOW (text input + save) |
| **No export** -- can't share journal with teacher | Limits classroom use | LOW (copy-to-clipboard or text file export) |

### Expected Behavior in Similar Games

**Oregon Trail (gold standard for educational game journaling):**
- Automatic log of all events with dates
- Player can review past entries
- Modern versions include an interactive journal with historical context

**Educational game research findings:**
- Reflection mechanisms like journaling support learning during gameplay (not just post-gameplay)
- Prompts work better than blank text fields: "What surprised you about prices at this port?" vs "Write your thoughts"
- Short prompts (1-2 sentences) match student attention spans

### UX Pattern Recommendation

1. **Auto-entries** (no user action required): Arrivals, departures, trades, event outcomes, season changes. These form the narrative backbone.
2. **Prompted reflections** (optional, triggered at key moments):
   - After a profitable/losing trade: "You made/lost X gold. Why do you think prices were different here?"
   - After a storm event: "Would you make the same choice again? Why?"
   - After visiting a new region: "What was different about trading in [region]?"
3. **Journal panel** (replaces current Logbook dropdown with a proper side panel or modal):
   - Scrollable timeline of all entries
   - Filter by type (trades, events, reflections)
   - Export button (plain text or copy to clipboard)

### Complexity: MEDIUM

The hard part is persistence (SQLite table for journal entries, IPC for read/write). The UI is straightforward given the existing Logbook pattern. Prompted reflections are the highest-value addition but also the simplest to implement (modal with text input after certain game actions).

**Dependencies:**
- SQLite: New `journal_entries` table (id, turn, date, type, text, is_player_note)
- IPC: `journal:getEntries`, `journal:addNote` channels
- Existing Logbook.tsx: Refactor from component state to SQLite-backed
- Game engine: Hook auto-entries into existing action handlers

---

## Feature 3: Sailing Animation

### What Already Exists

`ShipMarker.tsx` already implements a sailing animation using `leaflet.motion`:
- SVG ship icon (boat with sail, parchment-themed)
- Animates along polyline from departure to destination
- Fixed 5-second duration
- Fires `ARRIVE` action on animation end, then auto-transitions to port scene

### What v1.3 Should Improve

This feature is labeled "active ship animation during sailing" in the milestone goals, but the animation already works. The question is: what needs polishing?

| Improvement | Value | Complexity |
|-------------|-------|------------|
| **Dashed route line** -- show the planned route as a dashed line on the map before/during sailing | Gives geographic context; students see the actual path | LOW |
| **Duration proportional to distance** -- longer voyages animate longer (not fixed 5s) | Teaches distance intuitively; feels more realistic | LOW (scale duration by `durationTurns`) |
| **Wake/trail effect** -- leave a fading trail behind the ship | Visual feedback of path traveled | LOW (CSS on polyline) |
| **Pan map to follow ship** -- map view follows the ship during animation | Prevents ship animating off-screen | LOW (`map.panTo()` on motion events) |
| **Event interruption** -- if an event triggers mid-voyage, pause animation and show event card | Currently events fire after arrival; mid-voyage events add drama | MEDIUM (requires splitting voyage into segments) |

### Expected Behavior in Similar Games

**Map-based sailing games typically show:**
1. A visible route line (dashed or dotted) between origin and destination
2. Ship marker moving along the route at a speed proportional to distance
3. Map panning to keep the ship in view
4. Some form of "voyage progress" indicator (day X of Y)

**Anti-pattern to avoid:**
- Instant teleportation (no animation at all) -- breaks immersion
- Real-time-length animations (30+ seconds) -- boring, students lose attention
- Complex 3D ship renders -- scope explosion, breaks parchment aesthetic

### Complexity: LOW-MEDIUM

The foundation exists. This is polish work on an already-functional component. The hardest improvement would be mid-voyage event interruption (pausing animation, showing event, resuming), but that is optional and can be deferred.

**Recommended scope for v1.3:**
1. Dashed route line (LOW)
2. Duration scaled to distance (LOW)
3. Map follows ship (LOW)

**Defer:** Mid-voyage event interruption, wake effects.

**Dependencies:**
- `ShipMarker.tsx`: Modify duration calculation, add polyline visibility
- `MapArea.tsx`: No changes needed (ShipMarker is already a child)
- `voyage.ts`: Duration already calculated, just pass it through

---

## Feature 4: Trade Profit/Loss Display

### What Already Exists

- `ProfitDisplay.tsx`: Shows overall profit (current gold - 500 starting gold) and last 10 transactions with BUY/SELL labels, quantities, and total values
- `TradePanel.tsx`: Shows current market price per good, buy/sell buttons, quantity stepper
- `CargoItem` type: Already tracks `boughtAtPrice` and `boughtAtPort` per cargo item

### What Is Missing

The milestone goal is: "Profit/loss indicator on trade panel showing price difference before confirming a sale."

This is a **pre-confirmation profit preview** -- before the player clicks "Sell," they see how much profit or loss they would make compared to what they paid.

### Expected Behavior in Trading Games

**Standard pattern in trade simulation UIs:**

1. **Inline profit indicator** next to the sell button:
   - "Sell 5x Wheat: +120g profit" (green) or "-30g loss" (red)
   - Calculated as: `(currentPrice - boughtAtPrice) * quantity`

2. **Per-good profit annotation** in cargo hold:
   - Each cargo item shows: "Bought at 40g in Athens" and "Current value: 55g (+38%)"
   - Color-coded: green for profitable, red for loss, neutral for break-even

3. **Tooltip or hover detail** on the sell button:
   - "Bought 5 Wheat at 40g each in Athens (200g total). Sell here for 55g each (275g total). Profit: +75g"

4. **Color-coded price comparison** in the market listing:
   - If the player carries a good, show the current price with an up/down arrow compared to purchase price

### UX Recommendation

The simplest high-impact approach: add an inline profit/loss indicator below the Sell button in `TradePanel.tsx`. The data is already available (`CargoItem.boughtAtPrice` vs `MarketGood.currentPrice`).

**Display format:**
```
Sell 3x Wheat for 165g  [+45g profit]   // green
Sell 2x Bronze for 80g  [-20g loss]     // red  
Sell 1x Wine for 50g    [break even]    // neutral
```

**Edge cases to handle:**
- Player bought the same good at different prices in different ports (FIFO or average cost? Recommend FIFO -- oldest purchased sold first, matches `CargoItem` array order)
- Player has no cargo of that type (sell button already disabled, no indicator needed)
- Quantity exceeds a single purchase batch (may span multiple `CargoItem` entries at different prices)

### Complexity: LOW

This is the simplest v1.3 feature. All data already exists. It is purely a UI calculation using `CargoItem.boughtAtPrice` and `MarketGood.currentPrice`. No new IPC, no database changes, no game engine changes.

**Dependencies:**
- `TradePanel.tsx`: Add profit calculation inline
- `CargoItem` type: Already has `boughtAtPrice` (no changes needed)
- Potentially `CargoHold.tsx`: Add current-value annotation per item

---

## Feature Classification

### Table Stakes (Expected for v1.3)

These are what players will expect given the milestone promise of "gameplay depth."

| Feature | Why Expected | Complexity | Existing Foundation |
|---------|--------------|------------|---------------------|
| **Trade profit/loss indicator** | Players need to see if a sale is profitable BEFORE committing | LOW | `CargoItem.boughtAtPrice` already tracked |
| **Journal persistence** | Losing journal on reload breaks the narrative | MEDIUM | Logbook component exists, needs SQLite backing |
| **Season display** | If weather affects gameplay, player must see the current season | LOW | `turnToDate()` already maps turns to months |

### Differentiators (Set Product Apart)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Seasonal voyage modifiers** | Teaches historical sailing constraints; no competitor has this in educational context | MEDIUM | Unique educational angle: "why didn't ancient ships sail in winter?" |
| **Prompted journal reflections** | Forces metacognition; bridges simulation to essay/discussion | LOW | Key pedagogical differentiator per educational game research |
| **Route line on map** | Geographic literacy; students see actual Mediterranean distances | LOW | Visual teaching tool, not just decoration |

### Anti-Features (Do NOT Build)

| Anti-Feature | Why Tempting | Why Wrong for This Project | Do Instead |
|--------------|-------------|---------------------------|------------|
| **Real-time wind simulation** | "More realistic" | Students do not learn more from watching a wind arrow; adds complexity without pedagogical value; breaks turn-based pacing | Binary season system (safe/dangerous) with percentage modifiers |
| **Detailed weather forecast** | "Let players plan around weather" | Adds cognitive load; students should learn "winter = dangerous" not "3-day forecast says NW winds at 15 knots" | Simple season indicator + warning when sailing in mare clausum |
| **Journal with rich text / images** | "More immersive" | Scope explosion; plain text with type icons is sufficient for reflection; rich text editor is a product unto itself | Plain text entries with entry-type filtering |
| **Animated ship battles** | "Pirates should have combat animation" | Combat is not the learning goal; current choice-based pirate events teach risk assessment without animation overhead | Keep existing choice-based event cards for pirate encounters |
| **Per-route profit optimization hints** | "Help students find best trades" | Undermines discovery learning; students should figure out profitable routes themselves | Show profit/loss on current trade only, not route suggestions |
| **3D or complex ship animation** | "Looks better" | Breaks parchment aesthetic; SVG ship icon is appropriate for the art style; 3D requires WebGL/Three.js dependency | Polish existing SVG ship with route line and proportional speed |

## Feature Dependencies (v1.3 Scope)

```
Independent (can build in parallel):
    [Trade Profit/Loss Display]    -- Pure UI, no engine changes
    [Sailing Animation Polish]     -- Pure UI, ShipMarker changes only

Sequential (must build in order):
    [Season Utility] getSeason(turn)
        |
        ├──> [Seasonal Voyage Modifiers] -- modifies calculateVoyageDuration
        ├──> [Seasonal Event Weights] -- modifies rollVoyageEvent  
        └──> [Season Display] -- UI indicator in Logbook title bar
    
    [Journal SQLite Table]
        |
        ├──> [Journal IPC Channels]
        |       |
        |       └──> [Journal Persistence] -- refactor Logbook from state to SQLite
        |
        └──> [Trade Auto-Logging] -- hook buy/sell into journal
                |
                └──> [Prompted Reflections] -- modal after key events
```

## Phase Ordering Recommendation

Based on dependencies and complexity:

**Phase 1: Trade Profit/Loss + Season Utility (independent, unblocks later phases)**
- Trade profit/loss is lowest complexity, highest immediate player value
- Season utility (`getSeason`, `Season` type) is a pure function that unblocks all weather features

**Phase 2: Seasonal Weather System (builds on season utility)**
- Voyage duration modifiers
- Event weight modifiers  
- Season display in UI
- Mare clausum warning dialog

**Phase 3: Captain's Journal Persistence (independent track)**
- SQLite table + IPC
- Refactor Logbook to read from database
- Auto-log trades and event outcomes

**Phase 4: Sailing Animation Polish + Journal Reflections (finishing touches)**
- Route line, proportional duration, map follow
- Prompted reflection modals after key game moments

## Sources

### Historical Sailing Seasons
- [Mare Clausum? Sailing Seasons in the Mediterranean in Early Antiquity (Tammuz, 2005)](https://www.researchgate.net/publication/233200035_Mare_clausum_Sailing_Seasons_in_the_Mediterranean_in_Early_Antiquity) -- Vegetius dates, mare clausum periods (HIGH confidence)
- [The Ancient Sailing Season (Beresford, 2013)](https://www.academia.edu/10928681/The_Ancient_Sailing_Season_2013_) -- Comprehensive treatment of seasonal navigation (HIGH confidence)
- [Seaborne Trade in the Roman Empire](https://www.ancient-history-sites.com/roman/context/economy/seaborne-trade/) -- Grain routes, seasonal logistics (MEDIUM confidence)
- [Mare Clausum: How Romans Managed Extreme Storms](https://romanempiretimes.com/mare-clausum-how-romans-managed-extreme-storms-floods-and-monsoons/) -- Practical enforcement of sailing bans (MEDIUM confidence)

### Game Design Patterns
- [Leaflet.Motion](https://github.com/Igor-Vladyka/leaflet.motion) -- Animation plugin already used in ShipMarker.tsx (HIGH confidence, verified in codebase)
- [Leaflet.AnimatedMarker](https://github.com/openplans/Leaflet.AnimatedMarker) -- Alternative animation approach (MEDIUM confidence)
- [Interactive Boat Map (Daniel Fourquet)](https://www.danielfourquet.com/blog/2018/08/31/interactive-boat-map/) -- Turn-based boat movement on Leaflet (MEDIUM confidence)

### Educational Game Reflection
- [Reflective Game Design (MDPI, 2023)](https://www.mdpi.com/2227-7102/13/12/1204) -- Reflection mechanisms during gameplay, not just post-play (HIGH confidence)
- [Captain's Log: Self-Reflection Tech (Malcolm Ocean)](https://malcolmocean.com/2017/11/captains-log-ultra-simple-tech-for-self-reflection/) -- Prompted journaling pattern (MEDIUM confidence)
- [Oregon Trail Gameplay (StrategyWiki)](https://strategywiki.org/wiki/The_Oregon_Trail/Gameplay) -- Journal mechanic in educational games (HIGH confidence)

### Trade UI Patterns
- [Trading Dashboard UI/UX Design (Medium)](https://medium.com/@deepshikha.singh_8561/case-study-trading-investment-dashboard-ui-ux-design-c4a040f6ddf4) -- Color-coded P/L indicators (MEDIUM confidence)
- [Designing User Interface in Trading Software (Devexperts)](https://devexperts.com/blog/ui/) -- Confirmation patterns, P/L display (MEDIUM confidence)

---

**Research notes:**
- The sailing animation is the most "already done" feature. ShipMarker.tsx works; v1.3 is polish, not creation.
- Trade profit/loss is the lowest-hanging fruit: all data exists, it is pure UI math.
- Seasonal weather has the highest educational value but requires touching game engine code (voyage.ts, events.ts).
- Captain's journal persistence is the most architecturally involved (new SQLite table, IPC channels) but the existing Logbook.tsx provides the UI template.
- The Logbook already uses Athenian month names, which means seasons are implicitly present in the date system. The season utility just needs to formalize what month maps to what season.

**Confidence levels:**
- HIGH for trade profit/loss (verified against codebase: CargoItem.boughtAtPrice exists, calculation is trivial)
- HIGH for seasonal weather historical data (multiple academic sources agree on Vegetius dates)
- HIGH for sailing animation (verified: ShipMarker.tsx already functional with leaflet.motion)
- MEDIUM for journal persistence patterns (educational game research supports prompted reflection, but specific implementation depends on SQLite schema decisions)

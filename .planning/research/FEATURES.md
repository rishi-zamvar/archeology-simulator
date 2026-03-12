# Feature Landscape: Ancient Mediterranean Trade Simulator

**Domain:** Educational historical trade simulation game for students (grades 6-12)
**Researched:** 2026-03-12
**Confidence:** HIGH (verified against Oregon Trail, Patrician, Port Royale, and educational game research)

## Feature Landscape

### Table Stakes (Users Expect These)

Features students and educators assume exist. Missing these = product feels broken as a trade sim.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Interactive map with ports** | Trade sims require visible geography; students expect to see where they're trading | MEDIUM | ~40-60 ports as scoped; needs zoom, pan, visual feedback for selection |
| **Trade mechanics (buy/sell)** | Core loop of trade sims; students expect to profit/lose based on decisions | MEDIUM | Supply/demand fluctuates based on city production and consumption; must include quantity and price mechanics |
| **Ship/inventory management** | Core constraint in trade sims; students expect cargo limits and capacity planning | LOW | Visual feedback of what's loaded, remaining space, weight/value tradeoff |
| **Economic feedback (profit/loss)** | Students need to see consequences of their decisions; tracks learning outcomes | LOW | Display: current capital, transaction history, profit margins per route |
| **Clear objectives/win conditions** | Students expect to know what success looks like; required for learning scaffolding | LOW | Scoped as "open-ended sandbox" but needs default learning goals (reach profit target, visit X ports, etc.) |
| **Tutorial/onboarding** | Students lack domain knowledge; must learn controls and game concepts | MEDIUM | Guided first voyage teaching map navigation, buy/sell, inventory; should be skippable for educators |
| **Pause/save/load** | Students need to manage session length; required for classroom use | LOW | Save multiple playthroughs; educators need to show student progress |
| **Resource/town names visible** | Immersion and learning; students need to know what goods are traded, not abstract symbols | LOW | Parchment-style labels, commodity names (wheat, wine, purple dye, papyrus, etc.) |
| **Visual feedback on decisions** | Pedagogically essential; students learn from consequences | LOW | Price changes visible when buying/selling; supply depletion shown on map; events logged |
| **Accessible UI for students** | Table stakes for educational software; must work on school hardware | MEDIUM | Clear buttons, readable fonts, no reliance on hover/swipe gestures exclusive to tablets |

### Differentiators (Competitive Advantage)

Features that set this product apart. Not required, but valuable for a history curriculum game.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Historical parchment aesthetic** | Immersion + accessibility; warm cream palette + pixel art makes learning feel special, not like a spreadsheet | MEDIUM | Cohesive visual theme; not photorealistic but artifact-appropriate |
| **Captain's Journal reflection tool** | Pedagogical: forces metacognition ("What decisions did I make? Why?"); bridges simulation to essay writing | MEDIUM | Prompt-based journal entries tied to game events; exportable for assignments; mirrors Oregon Trail's learning design philosophy |
| **Seasonal/weather mechanics** | Educational + strategic depth; teaches historical constraints (winter sailing dangerous); not in competing games | MEDIUM | Wind patterns, storm seasons tied to real Mediterranean history; impacts profitability but learnable |
| **Cultural encounter narratives** | Distinguishes from pure economics sim; addresses "learn about people" goal; supports humanities learning | LOW-MEDIUM | Short text encounters (~2-3 sentences) at each port explaining local culture, trade goods, historical context; doesn't require voice acting |
| **Dynamic political factions** | Adds strategic complexity + teaches power dynamics; makes history feel alive | MEDIUM | Greek, Phoenician, Etruscan, Egyptian factions with shifting relationships; neutral/friendly/hostile affect prices and safety |
| **Historical ship progression** | Educational + reward loop; students unlock better ships as they progress | LOW | Tied to in-game wealth or time periods (600 BCE → 700 BCE); visual upgrade feedback motivates continued play |
| **Museum-style artifact images** | Immersion + learning; real museum photos of historical trade goods makes it feel authentic | LOW | Database of ~30-40 artifact images linked to trade goods; sourced from open-access museum collections |
| **Consequence-driven narrative** | Oregon Trail's strength; player choices trigger events that teach systems thinking | MEDIUM | Example: Over-trade wine → oversupply crashes prices. Fail to stock food → crew gets sick. Creates "aha" learning moments |
| **Teacher dashboard/analytics** | Enables classroom use; educators can see learning outcomes | MEDIUM-HIGH | Track: routes taken, profit margins, goods traded, time spent, journal reflections; exportable per student |
| **Historical accuracy grounded in sources** | Trust signal for educators; game mechanics are based on real ancient trade patterns | LOW | Document design decisions in-game tooltip ("Why wind?"); cite sources in teacher guide |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems in educational trade sims.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| **Real-time sailing/continuous gameplay** | "Feels more immersive" | Incompatible with classroom pacing; breaks focus during lessons; overwhelms learners with simultaneous decisions; makes failures feel unfair instead of learning moments | Turn-based model: students control pacing, can pause/reflect between decisions; proven effective in Oregon Trail |
| **Hyper-realistic economics (actual inflation modeling)** | "More authentic"; instructors want complex econ sim | Requires expertise to balance; student misunderstanding of hypercomplex systems teaches wrong lessons; mask learning with mechanics busywork | Simplified supply/demand: fewer variables students must track; "good enough" accuracy supports learning goals |
| **Multiplayer/PvP trading** | "More engaging socially"; sounds fun | Introduces toxicity risk; unfair play/grief mechanics; breaks historical learning for competitive focus; requires server infrastructure; classroom tech constraints | Single-player with optional co-op discussion; students compare routes/strategies after-game |
| **Procedural generation of ports** | "Infinite replayability"; devs like technical complexity | Students lose historical anchoring ("which port is Alexandria?"); breaks narrative/culture learning; adds implementation overhead; randomness teaches "maps are random" not "trade followed patterns" | Curated 40-60 port map: historically accurate, aesthetically consistent, learnable |
| **Full ship customization/building** | Players like ownership; "feels like tycoon sim" | Scope explosion; distracts from trade mechanics; requires 3D modeling; students spend time decorating, not learning economics | Simple visual progression: 3-4 ship types (canoe→merchant→galley→merchant fleet); earned through play |
| **Persistent character leveling/stats** | "Progression feels rewarding" | Confuses game mechanic with learning outcome; students optimize builds instead of understanding trade; makes early game frustrating until leveled | Skills unlock through story (age/wealth) not XP grinding; all students can trade effectively from turn 1 |
| **Achievements/trophy system** | "Gamification" is popular | Distracts from learning goals; students pursue badges, not understanding; creates multiple conflicting objectives; educators find them annoying in classroom | Learning milestones instead: "Complete 5 trades," "Visit 20 ports," "Earn 1000 gold" — tied to learning, not ego |
| **Randomized events** | "Adds drama and replayability" | If too frequent, teaches chaos not systems; if too rare, boring; wrong tuning breaks learning ("I got shipwrecked for no reason"); hard to teach from | Consequence-driven events: predictable given player choices; "You overloaded the ship → broken axle" (fair, teachable) |
| **Detailed crew management (individual sailor stats)** | Sounds immersive; "adds depth" | Overwhelming for students new to trade; not central to trade learning goal; induces empathy paralysis ("don't want my crew to die"); implementation heavy | Abstracted crew health: bought food = crew healthy = more cargo capacity; visible mechanic without character management overhead |
| **NPC merchant competitors with AI** | "Makes economy feel alive" | AI balancing is hard; creates unfair play perception; students blame game not their strategy; induces analysis paralysis watching AI trades; adds complexity | Static NPC traders: set prices based on supply/demand formula, not AI; predictable enough to learn from |

## Feature Dependencies

```
Core Loop (must build first):
    [Interactive Map + Ports]
        ├──requires──> [Viewport/Navigation]
        └──requires──> [Visual Port Information]

    [Trade Mechanics]
        ├──requires──> [Inventory System]
        ├──requires──> [Supply/Demand Economy]
        └──requires──> [Buy/Sell UI]

    [Ship Management]
        ├──requires──> [Inventory System]
        └──enhances──> [Trade Mechanics]

Learning Loop (enhances core):
    [Captain's Journal]
        └──requires──> [Core Loop working]

    [Economic Feedback Display]
        ├──requires──> [Trade Mechanics]
        └──enhances──> [Learning Outcomes]

    [Historical Context/Narrative]
        ├──requires──> [Port Data + Names]
        └──enhances──> [Immersion + Learning]

Advanced Systems (non-blocking):
    [Political Factions]
        └──affects──> [Trading Conditions/Prices]

    [Seasonal/Weather]
        └──affects──> [Route Safety + Profitability]

    [Ship Progression]
        └──tied to──> [Accumulated Wealth]

    [Teacher Dashboard]
        └──requires──> [Game State Logging]
        └──conflicts with──> [Privacy (handle with parental consent)]
```

### Dependency Notes

- **[Map] requires [Navigation]:** Students can't trade without seeing where they are. Viewport (zoom, pan) is prerequisite.
- **[Trade] requires [Inventory]:** Can't buy/sell without tracking what you own. Inventory is core.
- **[Supply/Demand] requires [Economy Model]:** Prices must change based on city production. If skipped, trading becomes random luck not learning.
- **[Journal] enhances [Trade]:** Works standalone but most valuable when tied to game events (e.g., "You lost money on this trade—why?").
- **[Weather] conflicts with [Casual Play]:** If too punishing, frustrates new players. Must tune so it teaches (predictable consequences) not punishes.
- **[Factions] enhances [Politics]:** Works without them but loses "system thinking" teaching opportunity. Lower priority than core loop.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept and deliver core educational value.

- [ ] **Interactive parchment map** with 40-60 Mediterranean ports (navigable, labeled, visually distinct)
- [ ] **Trade core loop**: buy low/sell high at different ports; prices fluctuate based on supply/demand
- [ ] **Inventory system** with cargo limits and capacity visualization
- [ ] **Economic feedback**: running profit/loss display, transaction history
- [ ] **Turn-based navigation**: players explicitly choose next port (not real-time)
- [ ] **Tutorial onboarding**: guided first voyage teaching controls and trade concepts
- [ ] **Save/load system**: supports classroom sessions and showing progress
- [ ] **Port names and commodity labels**: no abstract symbols; uses real goods (wheat, wine, purple dye, etc.)
- [ ] **Captain's Journal**: simple text prompts after trades ("What surprised you? What would you do differently?")
- [ ] **Basic visual feedback**: price changes, supply visualization, decision consequences logged
- [ ] **Historical port data**: realistic supply/demand patterns based on actual ancient Mediterranean trade (wheat from Egypt, wine from Greece, purple dye from Phoenicia, etc.)

### Add After Validation (v1.x)

Features to add once core is working and educator feedback confirms value.

- [ ] **Seasonal sailing mechanics**: winter is dangerous, affects profitability and safety
- [ ] **Political factions**: Greek, Phoenician, Egyptian, Etruscan; relationships affect prices and safety
- [ ] **Cultural encounter narratives**: 2-3 sentence flavor text at each port explaining what's there and why it matters
- [ ] **Ship progression**: unlock better ship types as wealth increases (visual reward loop)
- [ ] **Museum artifact images**: real photos of trade goods from open-access collections linked to commodities
- [ ] **Weather/event system**: storms, calm seas, trade opportunities; consequences are teachable not random
- [ ] **Teacher dashboard**: analytics view showing student routes, profits, learning outcomes

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Multiplayer modes**: co-op trading discussions or comparing strategies (complex to scaffold educationally)
- [ ] **Historical scenarios**: "you are a Greek merchant in 650 BCE" with specific constraints (requires scenario design expertise)
- [ ] **Advanced economy**: inflation/deflation modeling, banking, lending (risk of over-complexity obscuring learning)
- [ ] **Procedurally-generated ports**: infinite replayability (loses historical anchoring and immersion)
- [ ] **Mobile app port**: web-first MVP; iOS/Android after validation (infrastructure cost vs. payoff unclear)
- [ ] **Narrative branching**: "your choices affect which ports welcome you" (risk of scope explosion)
- [ ] **VR/AR experiences**: immersive archaeological site visits (compelling but expensive and untested pedagogically with this game)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Interactive map + ports | HIGH | MEDIUM | P1 |
| Trade core loop (buy/sell) | HIGH | MEDIUM | P1 |
| Inventory system | HIGH | LOW | P1 |
| Economic feedback display | HIGH | LOW | P1 |
| Turn-based navigation | HIGH | MEDIUM | P1 |
| Tutorial/onboarding | HIGH | MEDIUM | P1 |
| Save/load | HIGH | LOW | P1 |
| Port names & commodity labels | HIGH | LOW | P1 |
| Captain's Journal (basic) | MEDIUM | MEDIUM | P2 |
| Historical port data accuracy | MEDIUM | LOW | P1 |
| Seasonal sailing | MEDIUM | MEDIUM | P2 |
| Political factions | MEDIUM | MEDIUM | P2 |
| Cultural narratives | MEDIUM | LOW | P2 |
| Ship progression | MEDIUM | LOW | P2 |
| Museum artifact images | MEDIUM | LOW | P2 |
| Weather/event system | MEDIUM | MEDIUM | P2 |
| Teacher dashboard | MEDIUM | HIGH | P3 |
| Procedural generation | LOW | HIGH | P3 |
| Multiplayer modes | LOW | HIGH | P3 |
| Advanced economy | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch — validates core concept and delivers learning value
- P2: Should have post-launch — significantly enhance learning and engagement
- P3: Nice to have post-validation — only if product-market fit confirmed and team bandwidth available

## Feature Learning Outcomes

### What Each Feature Teaches

Understanding the pedagogical goal of each feature ensures design serves learning, not just entertainment.

| Feature | Learning Outcome | Why It Matters |
|---------|------------------|----------------|
| **Trade core loop** | Economic principle: supply/demand affects price; opportunity cost | Foundation of ancient Mediterranean history |
| **Cargo limits** | Resource constraint thinking; real-world limitation students must navigate | Teaches why ancient merchants didn't buy all goods (risk) |
| **Port differences** | Geography + cultural specialization; not all places make all things | Reinforces ancient trade was *necessary*, not optional |
| **Seasonal sailing** | Historical causation; human choices constrained by environment | Winter was deadly; explains routing patterns |
| **Political factions** | Power dynamics; trade didn't happen in political vacuum | Phoenician dominance, Greek expansion, Egyptian stability |
| **Captain's Journal** | Metacognition; reflection on decisions; transfer to writing | Students internalize learning, can articulate reasoning |
| **Consequence system** | Systems thinking; one action has multiple effects | "My greed crashed prices. Now I'm stuck." = Deep learning |
| **Economic feedback** | Quantitative reasoning; students see math in action | Profit/loss is tangible, not abstract |
| **Cultural narratives** | Empathy + cultural awareness; people behind the trades | Not just facts, but why people lived how they did |
| **Museum artifacts** | Visual/tactile learning; real objects ground abstraction | Photos are engaging; validates "these goods existed" |

## Competitor Feature Analysis

| Feature | Oregon Trail | Patrician | Port Royale 4 | Our Approach |
|---------|--------------|-----------|---------------|--------------|
| **Trade loop** | Minimal (hunt/trade with other parties) | Core mechanic | Core mechanic | Core mechanic (Mediterranean-focused) |
| **Map interaction** | Linear route (no choice) | Navigable with route editor | Navigable Caribbean | Navigable Mediterranean; curated 40-60 ports |
| **Consequence-driven events** | Heavily (dysentery, broken axles) | Moderate (reputation affects trades) | Mild (storms, pirates) | Moderate-to-heavy; tied to player choices not RNG |
| **Learning scaffold** | Tutorial weak by modern standards | None (tutorial assumes players know trade sims) | None | Guided first voyage; skippable for educators |
| **Reflection tool** | None | None | None | **Captain's Journal** (differentiator) |
| **Historical accuracy** | Excellent (based on research) | Good (Hanseatic League accurate) | Moderate (Caribbean + colonial) | High (ancient Mediterranean trade patterns) |
| **Educational intent** | Explicit (learning objectives documented) | Commercial game, used educationally | Commercial game, used educationally | Explicit (designed for grades 6-12 history) |
| **Teacher tools** | Lesson plans available | None | None | **Dashboard for tracking student progress** (v1.x) |
| **Cultural narratives** | Minimal | Minimal | Minimal | **Built-in cultural encounters** (differentiator) |
| **Visual polish** | Crude by modern standards | Good (early 2000s) | Good (current gen) | Art-forward (pixel art + parchment aesthetic) |
| **Saves/sessions** | Yes (required for classroom) | Yes | Yes | Yes (required for classroom) |

**Analysis:** Our differentiators are **reflection-first design** (Captain's Journal), **cultural immersion** (narrative encounters + museum artifacts), and **explicit pedagogical scaffolding** (tutorial + teacher tools). We're not trying to out-sim Patrician's complexity—we're teaching history *through* trade, not just economics.

## Sources

### Core Game Design
- [Patrician: Procedural Storytelling](https://saveorquit.com/2020/10/16/article-patrician-and-the-art-of-procedural-storytelling/) — Shows how economic mechanics can teach systemic thinking
- [Oregon Trail Game Design](https://methodshop.com/oregon-trail-manual-secrets/) — Revealed 40-page manual documenting sophisticated consequence systems; proof that educational games can be mechanically deep
- [Top 5 Games Like Old Market Simulator](https://www.premiumcdkeys.com/en-us/blogs/game-news/top-5-best-games-similar-to-old-market-simulator) — Trade simulation ecosystem overview

### Educational Game Design
- [Educational Game Design Best Practices (2026)](https://nipsapp.com/how-to-develop-and-design-an-educational-game/) — Adaptive learning, clear objectives, multi-platform accessibility
- [Gamification in Learning (2026)](https://www.gocadmium.com/resources/gamification-in-learning-2026) — Progress tracking, badges, feedback loops; pitfalls of gamification over pedagogy
- [Educational Games: Learning Outcomes & Student Engagement (2026)](https://online.siue.edu/degrees/education/msed/instructional-technology/learning-games-and-simulations/) — Systematic review of what makes educational games effective
- [The Effect of Digital Educational Games on Motivation](https://pmc.ncbi.nlm.nih.gov/articles/PMC10783726/) — Feedback, engagement, and reward systems; 40-60% participation increase documented

### Simulation & Historical Learning
- [Simulation Games in History Education](https://teachinghistory.org/nhec-blog/25117) — Jeremiah McCall on why accuracy ≠ learning; critique and discussion matter more
- [Historical Accuracy vs. Playability Tradeoff](https://gamingthepast.net/theory-practice/bibliography/) — Games teach systems thinking even when imperfect
- [Ancient Civilizations Learning with Games](https://www.middleweb.com/44517/ancient-civilizations-come-alive-with-games/) — What works in classroom settings

### Museum & Artifact Learning
- [Game-Based Learning in Museums (2025)](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2025.1576207/full) — Immersive design, artifact collection as learning, location-based AR
- [Interactive Museum: Video Games as History Lessons](https://journals.sagepub.com/doi/10.1177/2042753019834957) — Artifact immersion, narrative design for cultural learning
- [Learning Curiosity Through Play in Museums (2025)](https://dl.acm.org/doi/10.1145/3706598.3713164) — Set collection mechanics teach classification; visual immersion

### Game Pacing & Difficulty
- [Game Narrative Pacing (2025)](https://www.numberanalytics.com/blog/mastering-pacing-game-narrative) — Balancing action, dialogue, quiet moments; adaptive difficulty
- [UI Strategy Game Design](https://www.gamedeveloper.com/game-developer/ui-strategy-game-design-dos-and-don-ts) — Windowed interface, status bars, resource tracking; applicable to our parchment UI

### Game Economy Design
- [Designing Game Economies: Inflation & Balance (2026)](https://medium.com/@msahinn21/designing-game-economies-inflation-resource-management-and-balance-fa1e6c894670) — Sinks and faucets; avoiding deflation spirals
- [Economics Education Games](https://economics-games.com/games) — Trade simulations for learning economic principles

### Anti-Patterns & Pitfalls
- [Common Mistakes in Educational Game Design](https://nipsapp.com/how-to-develop-and-design-an-educational-game/) — Weak pedagogical alignment; gamification without learning
- [Scope Creep in Game Development](https://www.codecks.io/blog/2025/how-to-avoid-scope-creep-in-game-development/) — Simulation bloat; feature creep destroys focused design
- [Feature Creep](https://en.wikipedia.org/wiki/Feature_creep) — "Giant simulations that let you do anything never work; becomes bloated and homogenous"

### Turn-Based Strategy Design
- [How to Make Turn-Based Strategy Games](https://www.kodeco.com/2925-how-to-make-a-turn-based-strategy-game-part-1) — UI patterns, fog of war, resource management
- [Best Turn-Based Strategy Games (2026)](https://championsofgods.com/best-turn-based-strategy-games/) — Design patterns and player expectations

---

**Research notes:**
- Oregon Trail remains the gold standard for educational game design; its consequence system is the model we should follow.
- Patrician proves that trade simulations can teach economic systems implicitly through mechanics (not explicit lessons).
- Educational research (2025-2026) emphasizes that gamification without clear learning alignment fails; metrics matter.
- Museum game research shows artifact collection and cultural immersion are powerful learning vectors often missing from trade sims.
- Historical accuracy is less important than **teachability**; flaws that provoke student critique are features, not bugs.
- Teacher support (tutorial, dashboard, lesson plans) is the difference between "cool game" and "adopted by schools."

**Confidence levels:**
- HIGH for table stakes (verified against Oregon Trail, Patrician, educational game research)
- HIGH for anti-features (validated against scope creep and educational pitfalls literature)
- MEDIUM for differentiators (based on gaps in competitor analysis + emerging research on museum games and reflection tools)
- HIGH for learning outcomes (backed by educational game effectiveness research)

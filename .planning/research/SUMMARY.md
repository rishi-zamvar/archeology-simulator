# Project Research Summary

**Project:** Archeology Simulator (Ancient Mediterranean Trade)
**Domain:** Educational turn-based strategy game (Electron + React)
**Researched:** 2026-03-12
**Confidence:** HIGH

## Executive Summary

This is an educational turn-based trading simulation designed for grades 6-12 history students, similar in learning design to Oregon Trail but focused on ancient Mediterranean trade systems. The recommended approach is a modern Electron + React desktop application with a carefully curated (not procedurally generated) map of 40-60 Mediterranean ports, turn-based gameplay (not real-time), and a distinctive Captain's Journal reflection tool that bridges gameplay to writing assignments — positioning it as pedagogically intentional rather than just entertainment.

The stack is well-established: Electron 41.0 + React 19 + Vite for rapid iteration, better-sqlite3 for local persistence, Zustand for UI state, and Leaflet for map rendering. This combination is proven for desktop games in 2026 and avoids common pitfalls of over-architecture. The critical architectural decision is enforcing main-process authority: all game logic and state mutations happen in Electron's main process, with the React renderer as a thin display layer communicating via IPC. This prevents cheating, simplifies save/load, and enables robust offline play.

The main risk category is platform-specific infrastructure: native module compilation hell, Leaflet performance at scale with animations, and external museum API reliability. These are preventable with upfront infrastructure validation (Phase 1) and careful caching/degradation strategies for API failures. The research is HIGH confidence across stack, architecture, and pitfalls because it's grounded in official documentation and proven patterns; features research is HIGH confidence because it's validated against Oregon Trail, Patrician, and educational game literature.

## Key Findings

### Recommended Stack

Electron 41.0.0 + React 19.2.4 + Vite 8.3.0 is the standard modern choice for desktop games in 2026. The stack is optimized for **security** (enforced main/renderer separation), **performance** (Vite's instant HMR, better-sqlite3's synchronous API), and **educational context** (TypeScript for game logic safety, clear separation of concerns).

**Core technologies:**
- **Electron 41.0.0**: Desktop runtime (Chromium + Node 24.14) — industry standard, cross-platform, simplifies distribution via Electron Forge
- **React 19.2.4**: UI rendering — excellent ecosystem, large community, standard for interactive apps in 2026
- **Vite 8.3.0**: Build tool — 10-50x faster than webpack, native ES modules, hot module replacement for instant feedback
- **better-sqlite3 12.7.0**: Local game state storage — synchronous API (game-friendly), fastest SQLite for Node.js, Electron-native, March 2026 verified
- **Zustand 5.0.11**: Client-side state (UI only) — lightweight, minimal boilerplate, perfect for game UI without over-engineering Redux
- **Leaflet 1.9.4 + react-leaflet v5**: Interactive map rendering — battle-tested, lightweight, supports custom tiles and marker clustering
- **Tailwind CSS 3.x**: UI styling — rapid development, works seamlessly with Electron, custom theme support for parchment aesthetic
- **Howler.js 2.x**: Audio abstraction — reliable cross-browser support, simplifies Web Audio API usage

**What NOT to use**: Avoid Create React App (Electron Forge replaces it), Webpack (slower than Vite), Remote Module in Electron (deprecated security risk), NodeIntegration in renderer (XSS vulnerability), classic Redux (overkill for this game), CSS-in-JS at runtime (performance hit on desktop). See STACK.md for detailed alternatives considered.

### Expected Features

Research validates Oregon Trail-style learning design: consequence-driven mechanics, clear objectives, and pedagogical scaffolding separate this from pure economic simulations like Patrician.

**Must have (table stakes) — v1 launch:**
- Interactive parchment map with 40-60 Mediterranean ports (navigable, labeled, visually distinct)
- Trade core loop: buy low/sell high at different ports with supply/demand fluctuation
- Inventory system with cargo limits and capacity visualization
- Economic feedback: running profit/loss, transaction history
- Turn-based navigation (player explicitly chooses next port, not real-time)
- Tutorial onboarding: guided first voyage teaching controls and trade concepts
- Save/load system: supports classroom sessions and progress tracking
- Port names and commodity labels: real goods (wheat, wine, purple dye, papyrus) not abstract symbols
- Captain's Journal: text prompts after trades ("What surprised you?") forcing metacognition — **differentiator**
- Historical port data: realistic supply/demand based on actual Mediterranean trade patterns

**Should have (competitive advantage) — v1.x post-validation:**
- Seasonal sailing mechanics: winter is dangerous, affects profitability and safety
- Political factions: Greek, Phoenician, Egyptian, Etruscan; relationships affect prices and safety
- Cultural encounter narratives: 2-3 sentence flavor text explaining local culture and trade goods
- Ship progression: visual reward loop earning better ships through wealth
- Museum artifact images: real photos of trade goods from open-access museum collections
- Historical accuracy grounded in sources: document design decisions, cite sources in tooltips
- Teacher dashboard: analytics tracking student routes, profits, learning outcomes (requires privacy handling)

**Defer (v2+) — avoid in v1:**
- Real-time sailing (incompatible with classroom pacing; Oregon Trail proved turn-based works)
- Hyper-realistic economics modeling (too complex, masks learning; simplified supply/demand is better)
- Multiplayer/PvP trading (toxicity risk, breaks historical learning focus)
- Procedural generation of ports (students lose historical anchoring; curated map is intentional)
- Persistent character leveling (confuses game mechanic with learning outcome; Oregon Trail avoided this)
- Detailed crew management with individual sailor stats (overwhelming for students; abstracted crew health is sufficient)
- NPC merchant competitors with AI (hard to balance; static NPC traders with formula-based prices are predictable and teachable)

**Feature dependencies**: Core loop (map + trade mechanics) must come first. Tutorial builds on core loop. Journal works but is most valuable when tied to game events. Seasonal/factions/narratives enhance but don't block. Teacher dashboard requires game state logging but is non-blocking.

### Architecture Approach

Standard Electron + React pattern: **main process owns all game state and business logic** (GameEngine class using command pattern for actions), **renderer is stateless display layer** (React components emit commands via IPC, receive computed state back). This is non-negotiable for turn-based games: prevents cheating, enables deterministic undo/replay, simplifies save/load, and works offline trivially.

**Major components:**
1. **GameEngine (main process)**: Core game simulation, turn flow, command execution, economy simulation, state persistence via SQLite
2. **IPC Bridge (preload script + ipcMain handlers)**: Secure, controlled API exposure; all state mutations via ipcRenderer.invoke() → ipcMain.handle()
3. **React Component Tree (renderer)**: Renders UI; MapPanel (Leaflet), SidePanel (events/info), InventoryUI, EventCard dialogs
4. **Zustand Stores (renderer)**: UI state only (selected port, panel visibility, map viewport) — game state lives in main process
5. **SQLite Database Layer (main)**: Persistent game saves, save slots, session data; accessed synchronously from main process (no IPC needed)
6. **React Leaflet Map**: Declarative map management; markers emit commands via click handlers

**Build order matters**: Foundation (Electron + IPC + SQLite) → GameEngine (turn logic, economy) → UI Components (rendering) → API Integration (museums) → Polish (audio, animations). Game logic must exist before UI can display it.

See ARCHITECTURE.md for detailed patterns: command pattern for actions, main-process authority, React Leaflet safe marker updates, preload script for security, Zustand for UI state only, turn execution flow, persistence flow.

### Critical Pitfalls

Five pitfalls from research could cause rewrites or deployment failures if missed. Prevention is cheaper than recovery.

1. **Native Module Compilation Hell** (CRITICAL, Phase 1)
   - SQLite and other native modules must be compiled per platform (Windows/macOS/Linux). Dev builds succeed, packaged apps fail with "NODE_MODULE_VERSION mismatch" or "unable to open database."
   - **Prevention**: Identify native deps early (sqlite3, better-sqlite3), use pre-built binaries via node-pre-gyp, set up CI/CD for multi-platform builds (GitHub Actions), test packaging on all three platforms before shipping. **This must be validated in Phase 1 before building core data layer.**

2. **Leaflet Performance Cliff at Scale** (CRITICAL, Phase 2)
   - Map renders fine with 50 markers. At 500+ markers or animated ships, panning becomes laggy. At 2000+ markers, app freezes (5 FPS). Each marker is a DOM node; Leaflet can't animate 100+ DOM nodes simultaneously.
   - **Prevention**: Early prototype with realistic marker count (1000s), implement marker clustering for static markers, use Canvas rendering for animated ships, only render markers in viewport + buffer zone. Avoid marker zoom animation. Test performance early in Phase 2, don't defer to polish phase.

3. **Museum API Rate Limits + Downtime** (CRITICAL, Phase 3)
   - Met Museum API has strict rate limits (10-100 req/min), variable uptime. App makes 5+ API calls per turn; at 50 concurrent players, hits 429 (Too Many Requests) immediately. No recovery strategy → game breaks.
   - **Prevention**: Implement exponential backoff with jitter, respect X-RateLimit-* headers, cache museum metadata locally (never refetch same object), pre-fetch during idle time, degrade gracefully (serve cached data if API fails), show "offline" badge for stale data. Test under load before launch: simulate 50+ concurrent players, measure actual rate limits by hand, hardcode safe request rate.

4. **Game State Complexity Explodes Midway** (CRITICAL, Phase 1-2)
   - Simple state (turn, board) balloons with features (factions, reputation, crew, economy, weather). By Phase 5, state has 50+ boolean flags, nested 5 levels deep, mutations in 20 places. One bug cascades through 5 systems.
   - **Prevention**: Use Finite State Machine pattern (explicit states: WAITING_FOR_PLAYER → RESOLVING_ACTION → UPDATING_ECONOMY, etc.), never use boolean flags, use immutable state (each action returns new state), decouple systems with events/subscribers. Write unit tests for every state transition. This must be right in Phase 1; refactoring mid-project is extremely expensive.

5. **Offline/Online Sync Becomes Unrecoverable** (CRITICAL, Phase 4 if offline mode planned)
   - Player caches data, makes moves offline, goes online but server has progressed. Simple sync fails: conflicts, data loss, impossible states, sync loops.
   - **Prevention**: Design explicit conflict resolution strategy BEFORE implementing (OT/CRDT, server-wins, merge logic). Fetch server version before applying local changes. Implement versioning/timestamps. Use delta sync (only changed records). Add observability: log all sync operations, provide admin tools to inspect sync state. Note: For MVP, consider deferring offline mode to Phase 4+; single-player works offline trivially without sync complexity.

**Moderate pitfalls** (Phase 2-3): Electron IPC communication bottleneck (batch messages, profile early), app bundle bloat (set size targets early, lazy load assets), cross-platform UX inconsistencies (test on Windows/macOS/Linux every phase), museum data staleness (implement data staleness tracking, background refresh).

See PITFALLS.md for detailed recovery strategies, security mistakes (never enable NodeIntegration, store credentials in Keychain), UX pitfalls (loading indicators, offline badges), and "looks done but isn't" checklist.

## Implications for Roadmap

Based on research, suggested phase structure (5-6 phases):

### Phase 1: Foundation (Weeks 1-2)
**Rationale:** Infrastructure must be proven before building game logic. Native modules and IPC patterns are prerequisites; testing these early saves weeks of rework if compilation/communication fails.

**Delivers:**
- Electron main/renderer boilerplate with Vite
- SQLite connection + schema with migrations
- IPC bridge with preload script and contextBridge (secure API design)
- Zustand stores (empty, structure only)
- Basic React app shell (parchment theme, system fonts)
- CI/CD for multi-platform builds

**Addresses pitfalls:**
- Validates native module compilation on Windows/macOS/Linux (prevents Pitfall 1)
- Establishes security boundary (preload script) early (prevents IPC injection attacks)
- Sets bundle size target, measures baseline (prevents Pitfall 7)
- Tests cross-platform UX patterns (prevents Pitfall 8)

**Uses from STACK.md:**
- Electron 41, React 19, Vite 8, better-sqlite3 12, TypeScript 5
- Electron Forge for packaging
- Tailwind + CSS Modules for styling

**Research flags:** Standard patterns for 2026. No deeper research needed. Verify Electron 41 + better-sqlite3 integration in test project.

---

### Phase 2: Game Engine + Turn-Based Core (Weeks 3-5)
**Rationale:** Game logic must exist before UI can display it. This phase implements the turn flow, command pattern, and economy simulation that drives all gameplay.

**Delivers:**
- GameEngine class with turn-based command execution
- GameState types and interfaces (Turn, Action, Port, Faction, Ship)
- IPC handlers for action execution (main process authority)
- SQLite persistence layer for saves
- Basic economy simulation (supply/demand formula)
- Navigation logic (turn-based movement, not real-time)

**Addresses pitfalls:**
- Implements Finite State Machine for game state (prevents Pitfall 4)
- Profiles IPC latency with realistic turn complexity (prevents Pitfall 6)
- Tests state undo/replay and serialization (ensures robust save/load)

**Uses from STACK.md:**
- TypeScript with strict mode for type safety
- better-sqlite3 for persistence

**Implements from ARCHITECTURE.md:**
- Command pattern for actions
- Main process as game authority
- Turn execution flow
- State management strategy

**Features from FEATURES.md:**
- Port navigation logic
- Trade core loop mechanics
- Inventory system
- Basic economic feedback

**Research flags:** None. Turn-based game architecture is well-documented. Standard patterns.

---

### Phase 3: UI + Map Rendering (Weeks 6-8)
**Rationale:** Once game logic works, render it. Map is complex (Leaflet + markers); performance testing here prevents scaling issues later.

**Delivers:**
- MapPanel with React Leaflet (Leaflet 1.9.4, react-leaflet v5)
- Port markers with click handlers
- SidePanel for event cards, info display
- Inventory UI with cargo visualization
- Economic feedback panels (profit/loss, transaction history)
- Tutorial/onboarding UI
- Save/load UI

**Addresses pitfalls:**
- Prototypes with realistic marker count (100+ ports, animated ships) to identify performance cliff early (prevents Pitfall 2)
- Profiles React re-renders with deep state
- Tests Leaflet marker clustering strategy if 1000+ markers needed
- Implements memo() on marker components to prevent re-renders on map pan

**Uses from STACK.md:**
- React 19 with hooks
- Leaflet 1.9.4 + react-leaflet v5
- Tailwind CSS for layout
- CSS Modules for component-scoped styles

**Implements from ARCHITECTURE.md:**
- React Leaflet with command sink (markers emit commands via handlers)
- useGameEngine hook for IPC integration
- Zustand for UI state (selected port, panel visibility, map viewport)
- Component responsibility separation

**Features from FEATURES.md:**
- Interactive map with ports
- Visual feedback on decisions
- Ship/inventory management UI
- Tutorial interface

**Research flags:** Performance optimization for Leaflet at scale. If 200+ markers cause lag, pivot to canvas-based rendering or clustering strategy. Profile early with real data (1000+ markers), don't defer to Phase 5.

---

### Phase 4: Museum API Integration + External Data (Weeks 9-11)
**Rationale:** External data (museum artifacts, historical port info) adds flavor and educational value. Implement caching and rate-limit handling here to prevent API downtime from breaking the game.

**Delivers:**
- Met Museum API integration (artifact metadata, images)
- British Museum API fallback
- Pleiades geocoding for port data (coordinates, historical context)
- TanStack Query for caching, retries, deduplication
- Rate limit detection and exponential backoff
- Graceful degradation when APIs fail
- Data staleness tracking (refresh every 30 days)

**Addresses pitfalls:**
- Implements rate-limit handling and graceful degradation (prevents Pitfall 3)
- Caches museum data locally to avoid repeated API calls
- Monitors data freshness, background refresh (prevents Pitfall 9)

**Uses from STACK.md:**
- node-fetch or built-in fetch for HTTP
- TanStack Query for caching
- Howler.js for audio integration (can happen here or Phase 5)

**Implements from ARCHITECTURE.md:**
- External API integration flow
- TanStack Query as caching layer
- Main process as single fetch point for Pleiades data

**Features from FEATURES.md:**
- Museum artifact images
- Historical port data accuracy
- Cultural encounter narratives (can be hardcoded or API-sourced)

**Research flags:** Museum API rate limits and uptime behavior needs validation. Test by hand: how many requests per minute before 429? What's average response time? Build guardrails based on findings. Potential for deeper research: if museum data becomes critical, investigate CRDT sync strategies for multi-user scenarios (Phase 5+).

---

### Phase 5: Seasonal/Political Systems + Advanced Features (Weeks 12-14)
**Rationale:** Core game is playable after Phase 4. This phase adds strategic depth: seasonal sailing, political factions, consequence-driven events. These enhance learning without blocking gameplay.

**Delivers:**
- Seasonal sailing mechanics (wind patterns, storm risk, season affects profitability)
- Political faction system (Greek, Phoenician, Egyptian, Etruscan; relationships affect prices and safety)
- Consequence-driven events (tied to player choices, not RNG)
- Ship progression (visual rewards from accumulated wealth)
- Captain's Journal deep implementation (link entries to game events, exportable for assignments)
- Audio system (ambient background music, sound effects on trades/events)

**Addresses pitfalls:**
- Implements consequence system carefully to teach causation, not random chaos
- Balances seasonal difficulty so it teaches, not punishes new players

**Uses from STACK.md:**
- Howler.js for audio effects
- Web Audio API for ambient soundscape

**Features from FEATURES.md:**
- Seasonal sailing
- Political factions
- Cultural narratives (can be hardcoded in port data)
- Ship progression
- Captain's Journal
- Consequence-driven narrative

**Research flags:** Seasonal/faction balancing for pedagogical goals needs validation with educators. Consider playtesting with target age group (grades 6-12) to ensure difficulty curve supports learning, not frustration. May need to revisit consequence tuning after feedback.

---

### Phase 6: Teacher Dashboard + Polish (Weeks 15-17)
**Rationale:** Once core game is solid and has educator feedback, add admin/analytics features and final polish for launch.

**Delivers:**
- Teacher dashboard: track student routes, profits, learning outcomes
- Privacy handling (parental consent, data anonymization if cloud-based)
- Analytics export (CSV/JSON per student)
- Cross-platform testing and fixes
- Visual polish: animations, transitions, audio improvements
- Accessibility audit (screen readers, keyboard navigation)
- Documentation: tutorial, lesson plans, design justification for educators

**Addresses pitfalls:**
- Final cross-platform testing catches platform-specific UX issues (prevents Pitfall 8)
- Bundle size optimization before launch (prevent Pitfall 7)
- Final security audit (prevent security mistakes from PITFALLS.md)

**Features from FEATURES.md:**
- Teacher dashboard (analytics)
- Historical accuracy documentation

**Research flags:** Teacher adoption barriers need research. Does dashboard require server backend or local file export? Privacy/COPPA compliance for K-12 users. May need legal review for classroom licensing.

---

### Phase Ordering Rationale

1. **Foundation first**: Infrastructure (Electron, IPC, SQLite) is prerequisite for everything. Native module compilation hell must be caught before building on it. Cross-platform testing upfront saves rework.

2. **GameEngine before UI**: Game logic must be complete and testable independently. UI is display layer. Building UI before engine creates tight coupling.

3. **Map before APIs**: Visual gameplay is more important than external data. Museum images are nice-to-have; core trade loop works without them. Implement Leaflet performance strategy early because it affects architecture decisions.

4. **APIs before advanced features**: External data (museums, pleiades) should be working before adding factions/seasonal systems, which depend on data accuracy. Rate-limit handling is infrastructure that affects subsequent layers.

5. **Advanced features before teacher tools**: Students can learn from core game without faction politics or seasonal sailing. Teacher dashboard is analysis layer on top of working game.

6. **Polish at end**: Cross-platform testing, accessibility, documentation happen after core is solid. No point polishing features that might be redesigned.

**Why not waterfall?** Each phase includes verification: Phase 1 validates infrastructure, Phase 2 validates game logic, Phase 3 validates UI/performance. If a phase reveals problems, early discovery is cheap; late discovery is expensive.

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 4 (Museum APIs):** External API behavior under load, actual rate limits, uptime guarantees. Run load test with 50+ concurrent requests. Reach out to museum API maintainers to ask: What's safe request rate? Do they deprecate APIs? How do we handle schema changes?

- **Phase 5 (Seasonal/Factions):** Educational impact of consequence systems. Work with educators: Do these mechanics teach the learning goals or confuse students? What difficulty curve supports learning at grades 6-12? Playtest early drafts with target age group.

- **Phase 6 (Teacher Dashboard):** Privacy/compliance requirements. K-12 education has COPPA (Children's Online Privacy Protection), FERPA (Family Educational Rights), state data privacy laws. Legal review needed before collecting/storing student data. Affects design significantly.

**Phases with standard patterns (skip research-phase):**

- **Phase 1 (Foundation):** Electron + Vite + React is standard 2026 pattern. Preload security is documented. IPC patterns are established. No deeper research needed.

- **Phase 2 (GameEngine):** Turn-based command pattern is well-documented (Game Programming Patterns). Finite State Machine for game state is established. No deeper research needed.

- **Phase 3 (UI):** React Leaflet is documented. Marker clustering is known solution for performance. No deeper research needed except performance validation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | Verified with official Electron 41, React 19, Vite 8, better-sqlite3 12 releases and documentation. March 2026 versions current. Stack is industry standard for desktop apps in 2026. |
| **Features** | HIGH | Validated against Oregon Trail (gold standard), Patrician (trade sim benchmark), Port Royale 4 (modern comparison), and 2025-2026 educational game research literature. Table stakes well-established. Differentiators grounded in gaps in competitor analysis. |
| **Architecture** | HIGH | Electron IPC patterns verified with official documentation. Command pattern and Finite State Machine are established game design patterns. Main-process authority is standard for security. React + Leaflet integration validated. |
| **Pitfalls** | HIGH | All 5 critical pitfalls sourced from Electron maintainers, game development veterans, and 2025-2026 case studies. Prevention strategies are proven (used successfully in shipped Electron apps). |

**Overall confidence:** HIGH

The research is based on official documentation (Electron, React, Vite, better-sqlite3), verified library versions (March 2026), peer-reviewed sources (educational game effectiveness), and proven patterns (Game Programming Patterns, Electron best practices). No major assumptions; most findings can be validated immediately in Phase 1 prototype.

### Gaps to Address

- **Actual museum API behavior**: Theoretical rate limits from docs may differ from real behavior. Needs load testing in Phase 4.
- **Educator feedback on mechanics**: Educational alignment is assumed based on research; validation with real teachers in Phase 5 is essential. Tuning might be needed.
- **Cross-platform build complexity**: CI/CD setup for Windows/macOS/Linux is documented but real-world build times and edge cases are unknown. Phase 1 will reveal actual issues.
- **Leaflet performance at 1000+ markers**: Research suggests clustering is solution; actual implementation and performance needs validation in Phase 3 prototype.
- **Teacher dashboard privacy requirements**: K-12 data privacy laws vary by state/country. Needs legal review; scope might expand based on compliance requirements.
- **Classroom adoption barriers**: Game might be technically sound but require lesson plans, teacher training, LMS integration to actually be adopted. Research focused on game design, not adoption; Phase 6+ will address.

## Sources

### Primary Research Files

- **STACK.md** — Technology stack research: Electron 41, React 19, Vite 8, better-sqlite3, Zustand, Leaflet. Verified with official releases (March 2026) and documentation links.
- **FEATURES.md** — Feature landscape: 19 P1 features (MVP), 8 P2 features (post-launch), 8 P3 features (v2+). Validated against Oregon Trail, Patrician, Port Royale 4, educational game literature (2025-2026).
- **ARCHITECTURE.md** — System architecture: Electron main/renderer, IPC patterns, React Leaflet integration, GameEngine command pattern, Zustand for UI state. Verified with Electron docs, Game Programming Patterns, and LogRocket case studies.
- **PITFALLS.md** — Domain pitfalls: 5 critical, 4 moderate, integration gotchas, performance traps, security mistakes, UX pitfalls. Sourced from Electron maintainers, 2025-2026 game dev case studies, and educational game research.

### Official Documentation

- Electron v41 release & IPC documentation: https://github.com/electron/electron/releases, https://www.electronjs.org/docs/latest/tutorial/ipc
- React 19.2.4 release: https://github.com/facebook/react/releases
- Vite documentation: https://vitejs.dev/
- better-sqlite3 v12.7.0 release: https://github.com/WiseLibs/better-sqlite3/releases
- Leaflet v1.9.4 & React Leaflet v5: https://leafletjs.com/, https://react-leaflet.js.org/

### Educational Game Research

- [Simulation Games in History Education](https://teachinghistory.org/) — Why accuracy ≠ learning; consequences matter
- [Oregon Trail Design](https://methodshop.com/oregon-trail-manual-secrets/) — 40-page manual revealing sophisticated consequence systems
- [Educational Game Design Best Practices (2026)](https://nipsapp.com/how-to-develop-and-design-an-educational-game/) — Adaptive learning, clear objectives
- [Museum Game-Based Learning (2025)](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2025.1576207/full) — Artifact immersion, narrative design

### Platform-Specific Research

- Electron best practices: https://www.electronjs.org/docs/latest/tutorial/performance
- Leaflet performance optimization: [Medium: Optimizing Leaflet with Many Markers](https://medium.com/@silvajohnny777/optimizing-leaflet-performance-with-a-large-number-of-markers-0dea18c2ec99)
- Cross-platform Electron apps: [Avocode Blog](https://blog.avocode.com/4-must-know-tips-for-building-cross-platform-electron-apps)

---

*Research completed: 2026-03-12*
*Researched by: 4 parallel researcher agents (Stack, Features, Architecture, Pitfalls)*
*Ready for roadmap: yes*

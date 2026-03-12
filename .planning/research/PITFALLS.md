# Domain Pitfalls

**Domain:** Electron + React turn-based educational game with museum API integrations, Leaflet maps, and offline data support
**Researched:** 2026-03-12
**Confidence:** HIGH (multiple sources, verified patterns)

---

## Critical Pitfalls

These mistakes cause rewrites, major architectural refactoring, or complete loss of functionality. Prevention during phase 1-2 is essential.

### Pitfall 1: Native Module Compilation Hell

**What goes wrong:**
SQLite and other native modules refuse to compile for target platforms, causing packaging to fail or apps to crash on launch. Different platforms (Windows, macOS, Linux) require different binary compilations. After a successful dev build, the packaged app crashes with "NODE_MODULE_VERSION mismatch" errors or "unable to open database file" on end-user machines.

**Why it happens:**
Developers assume cross-platform compilation is straightforward (it isn't). Native modules like `better-sqlite3` must be compiled specifically for the target platform. True cross-compilation is not supported — you cannot build a Windows .node binary from macOS without special CI/CD setup. Most native modules don't provide prebuilt binaries, forcing build on each target platform or using pre-gyp correctly.

**How to avoid:**
1. Identify all native dependencies early (sqlite3, better-sqlite3, any image/audio processing libraries)
2. Use pre-built binaries via `node-pre-gyp` or similar tools
3. Set up CI/CD for multi-platform builds (GitHub Actions, etc.) or use Docker with platform-specific agents
4. Never assume "npm install" will work on production machines — test packaging on all three platforms before shipping
5. For SQLite specifically, use better-sqlite3 and configure electron-builder to properly handle the .node binaries as externals (not bundled)
6. Use postinstall hooks to rebuild native modules after installation

**Warning signs:**
- Build works locally, packaging succeeds, but shipped app crashes on user's Windows/Mac/Linux
- "prebuild-install failed" errors during CI builds
- "SQLITE_CANTOPEN" errors in production
- Developers claim "works for me" on one platform but breaks on others

**Phase to address:**
Phase 1 (Foundation) — must validate native module strategy before building core data layer. Phase 2 should include cross-platform packaging tests.

---

### Pitfall 2: Leaflet Performance Cliff at Scale

**What goes wrong:**
Map renders fine with 50 markers. At 500 markers, panning/zooming becomes visibly laggy. At 2000+ markers (representing trade routes, dig sites, ships across Mediterranean), the app becomes unusable — frame rate drops to 5 FPS, animation stops, CPU hits 100%. Users see a frozen app.

**Why it happens:**
Leaflet creates each marker as a separate DOM element. Each marker is a real DOM node, and 2000 DOM nodes with update events on every pan/zoom event overwhelms the browser's layout engine. Marker animations compound the problem — moving 100 ships across the map in real-time can consume 100% of a CPU core.

**How to avoid:**
1. Early in Phase 2 (Map), implement marker clustering for non-interactive markers (dead sites, historical locations) using Leaflet.markercluster
2. For animated markers (ships, active digs), use Canvas rendering instead of DOM-based markers via Leaflet.Canvas or Pixi.js overlay
3. Never try to animate > 50 DOM-based markers simultaneously — use canvas-based rendering for dynamic content
4. Profile the map early with realistic data (1000s of markers) — don't wait for scaling issues to surface later
5. Use marker virtualization: only render markers in viewport + buffer zone, destroy off-screen markers
6. Avoid marker zoom animation with large datasets (it doesn't save much performance and adds complexity)

**Warning signs:**
- Map sluggish during panning with > 500 visible markers
- Animated ship movements stutter or freeze
- CPU usage jumps to 80%+ during map interaction
- Frame rate drops visible to users (< 30 FPS)

**Phase to address:**
Phase 2 (Map Rendering) — must prototype with real marker counts before finalizing architecture. Implement clustering/canvas strategy early, not as an afterthought.

---

### Pitfall 3: Museum API Rate Limits + Unreliable Uptime

**What goes wrong:**
The app makes historical data requests during turn resolution or when players explore locations. Met Museum API responds with 429 (Too Many Requests). The app either crashes, shows stale/broken data, or worse — silently succeeds but returns incomplete data. Players see missing artifacts, incomplete museum collections, or the app hangs entirely.

**Why it happens:**
Museum APIs (Met, British Museum, etc.) have strict rate limits, often 10-100 requests per minute. Developers don't implement exponential backoff or cache strategies. The first release hits a museum API 5 times per turn. With 50 concurrent players, that's 250 requests/minute — immediate 429 errors. Additionally, museum APIs have variable uptime and slow response times (2-10 seconds). The app was written assuming instant API responses.

**How to avoid:**
1. Early Phase 3 (API Integration), implement mandatory rate-limit detection:
   - Parse X-RateLimit-* headers from every API response
   - Implement exponential backoff: fail once → wait 2s, fail again → wait 4s, up to reasonable max (60s)
   - Queue requests, don't make them synchronously
2. Cache aggressively:
   - Cache museum object metadata locally (SQLite) — never refetch the same object
   - Cache collection lists per museum, refresh only on user request
   - Pre-fetch commonly-used objects during idle time
3. Graceful degradation:
   - If API fails, serve cached data (even if stale, better than broken)
   - Show "offline" badge in UI when serving cached data
   - Never crash on API failure — return sensible defaults
4. Test API behavior under load BEFORE launch:
   - Simulate 50+ concurrent players, measure API call rate
   - Document actual rate limits per museum (test by hand)
   - Calculate "safe" request rate and hardcode guardrails

**Warning signs:**
- API calls fail with 429 in testing with modest player load
- Missing/incomplete data in game (artifacts not loading)
- App hangs for 10+ seconds during turn resolution
- Players report "sometimes the data is there, sometimes not"
- Museum API response times > 5 seconds with no retry logic

**Phase to address:**
Phase 3 (Museum API Integration) and Phase 4 (Caching/Offline Mode) — rate limiting strategy must be designed before writing API integration code. Caching is not optional.

---

### Pitfall 4: Game State Complexity Explodes Midway

**What goes wrong:**
Phase 1 implements basic turn mechanics. Phase 3 adds factions, reputation, crew management. Phase 4 adds economic simulation, weather, random events. By end of Phase 5, the game state is a tangled mess: 50+ boolean flags, nested objects 5 levels deep, state mutations in 20 different places. A simple "player moved ship" action now touches 15 different state properties. One bug cascades through 5 systems. Developers can't reason about game state anymore.

**Why it happens:**
Turn-based game state management typically starts simple: `{ currentPlayer, board, turn }`. Each feature addition (factions, reputation, economy) adds state fields. Without a principled state machine, developers fall into the "nested if-statement hell" pattern — the Update() method becomes a 500-line function checking `if isTurn && isFactionA && hasReputation > 50 && isWeatherRainy then...`. Any new state interaction requires touching multiple systems.

**How to avoid:**
1. Phase 1 (Foundation): Implement state using a formal Finite State Machine (FSM) pattern, not boolean flags:
   - Define explicit states: `WAITING_FOR_PLAYER → RESOLVING_ACTION → UPDATING_ECONOMY → CHECKING_VICTORY → WAITING_FOR_NEXT_PLAYER`
   - Each state has entry/exit actions and valid transitions
   - Never use boolean flags like `isResolvingAction` — use state enum instead
2. Use immutable state patterns (Redux-like or Zustand):
   - State is never mutated in place
   - Each action returns a new state object
   - Makes undo/replay/networking easier
3. Decouple systems using events/command pattern:
   - Game state doesn't know about faction bonuses or economy
   - Systems subscribe to state changes: "when MOVING_SHIP event fires, apply faction speed bonus"
   - New features are added as new subscribers, not by modifying core state
4. Enforce state consistency:
   - Write unit tests for every state transition
   - Assert invariants (no negative resources, crew count > 0, etc.)
   - Serialize/deserialize state to catch hidden state issues early

**Warning signs:**
- State has 50+ boolean flags (`isPlayerTurn`, `isAnimating`, `hasBonus`, `isFactionMode`, etc.)
- Update/turn resolution method is > 200 lines with deep nesting
- "Fixing one bug causes two new bugs" — sign of tight coupling
- Save/load functionality is buggy (state isn't serializable)
- Developers can't explain the full state tree without consulting code

**Phase to address:**
Phase 1 (Foundation) and Phase 2 (Core Mechanics) — state management architecture must be right early. Refactoring state machines mid-project is extremely expensive.

---

### Pitfall 5: Offline/Online Sync Becomes Unrecoverable

**What goes wrong:**
Player has cached data locally. Player makes a move while offline. Player goes online. Server has progressed further (other players made moves, turn advanced). App tries to apply local changes to old server state. Conflict resolution fails or is inconsistent. Player's move is lost, or worse — their data becomes corrupted. They see phantom resources, impossible game states, or sync loops.

**Why it happens:**
Offline-first architecture is complex. It's tempting to implement a simple "download everything, cache it, sync on reconnect" approach. But this fails when:
- Server state advances while player is offline
- Two clients make conflicting edits
- Network is intermittent (connects/disconnects multiple times)
- No clear conflict resolution strategy

Common mistake: "last-write-wins" sounds simple but loses data when two players edit simultaneously.

**How to avoid:**
1. Phase 4 (Offline Mode): Define explicit conflict resolution BEFORE implementing sync:
   - Operational Transformation (OT) or CRDT for shared data?
   - Server-wins? Client-wins? Merge logic?
   - Document clearly — this is a business logic decision, not a technical one
2. Never sync blindly:
   - Always fetch server version of each record before applying local changes
   - Calculate actual delta (what changed locally since last sync)
   - Apply server version + local delta, handle conflicts explicitly
3. Implement versioning/timestamps:
   - Every cached item has `localVersion` and `serverVersion`
   - Before applying local change: fetch server, compare versions
   - If server version advanced, merge or conflict, don't overwrite
4. Use delta sync, not full sync:
   - Don't re-download entire game state on reconnect
   - Only sync records that changed
   - Reduces bandwidth and conflict surface area
5. Add observability:
   - Log every sync operation (what conflicted, how resolved)
   - Provide admin tool to inspect sync state
   - Have recovery procedures (force server-wins, for example)

**Warning signs:**
- Players report "my moves disappeared after going offline"
- Sync loops (app keeps retrying same sync operation)
- Data inconsistencies (player has -50 resources, impossible state)
- "Sync in progress..." spinner never completes
- Dev notes: "sync logic is fragile, touches it carefully"

**Phase to address:**
Phase 4 (Offline Mode) — must design before implementing. Refactoring sync logic is extremely painful because it touches all game systems.

---

## Moderate Pitfalls

These mistakes cause delays, technical debt, or require significant rework but don't cause complete failures.

### Pitfall 6: Electron IPC Communication Bottleneck

**What goes wrong:**
Main process and renderer process communicate via IPC (Inter-Process Communication). Game logic runs in renderer. Complex actions (validating trade routes, updating economy) make IPC calls to main process. With 100+ IPC messages per turn, the app becomes noticeably sluggish — delays between clicking and action being processed, animation glitches.

**Why it happens:**
Developers treat IPC like normal function calls: synchronous, expect instant response. But IPC is asynchronous under the hood. Each message goes through the browser's event loop. With many messages queued, latency piles up. Compound with any I/O in main process (file writes, database queries) and responsiveness suffers.

**How to avoid:**
1. Batch IPC calls: Instead of 10 individual messages, collect data and send one batch message
2. Implement proper async/await for IPC:
   ```
   const result = await ipcRenderer.invoke('validate-trade', tradeData)
   ```
   Not: multiple async sends with callbacks
3. Profile IPC latency early (Phase 2):
   - Add performance markers: mark IPC send, mark response
   - Measure: turn resolution with 20 IPC calls should take < 100ms
   - If slow, batch or move logic to renderer
4. Consider moving compute-heavy logic to renderer if it doesn't require system-level access
5. Cache results of expensive IPC calls (API validation, etc.)

**Warning signs:**
- Noticeable delay (200ms+) between user input and UI response
- Frame rate drops during game actions
- IPC message queue backs up (measured by latency increase)
- Developers discussing "slow turn resolution"

**Phase to address:**
Phase 2 (Core Mechanics) and Phase 5 (Polish) — identify IPC bottlenecks during development, don't leave for final polish.

---

### Pitfall 7: Electron App Bloat (Bundle Size)

**What goes wrong:**
Base Electron app is ~150MB (Chromium + Node). Add React, libraries, assets (images, audio, map tiles), and the packaged app becomes 400-600MB. Users complain about download time, disk space, slow startup. On Windows, installer bloat becomes an issue.

**Why it happens:**
Developers don't optimize iteratively. They include all map tiles, all museum images, all audio files in bundle. They don't tree-shake unused dependencies. Source maps are left in production build. The app grows gradually until it's unmanageably large.

**How to avoid:**
1. Phase 1 (Foundation): Set a target bundle size, measure it continuously
   - Accept no new dependencies without reviewing bundle impact
   - Use `webpack-bundle-analyzer` or similar in build pipeline
2. Optimize assets:
   - Compress images aggressively (use WebP, not PNG/JPG)
   - Don't bundle museum images — fetch on demand from server/cache
   - Don't bundle all map tiles — use tile server (OpenStreetMap), not local tiles
   - Audio files: use lossy compression (128 kbps MP3, not WAV)
3. Code splitting:
   - Load museum API code only after game is playable
   - Load map only when player navigates to map view
   - Lazy load assets
4. Remove source maps from production builds
5. Profile bundle in each phase:
   - Phase 1: Target < 200MB total
   - Phase 2: < 250MB
   - Phase 3: < 300MB (API code, assets)
   - Phase 5: < 400MB final

**Warning signs:**
- App size grows 50MB+ per phase
- Startup takes > 3 seconds
- Users on slow internet can't download it
- Disk-constrained systems refuse to install

**Phase to address:**
Phase 1 (Foundation) — establish bundle size target and monitoring. Phase 3-5: optimize specific asset categories.

---

### Pitfall 8: Cross-Platform UX Feels Wrong

**What goes wrong:**
App looks fine on macOS. On Windows, keyboard shortcuts don't work (no Cmd+C to copy by default). On Linux, fonts render differently. On macOS, window chrome doesn't match native apps (no traffic light buttons, wrong window behavior). Players feel like the app is "a website in a window," not a real application.

**Why it happens:**
Developers use generic web patterns without learning platform conventions. Copy/paste doesn't work because Electron requires explicit menu setup. Fonts hardcoded to "Helvetica" instead of system font. Scrolling behavior different from native apps.

**How to avoid:**
1. Phase 1: Research platform UX guidelines:
   - macOS: HIG (Human Interface Guidelines)
   - Windows: Fluent Design
   - Linux: No single standard, but GNOME/KDE have conventions
2. Use platform-specific system fonts:
   ```css
   /* Not: font-family: 'Helvetica'; */
   /* Instead: */
   font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
   ```
3. Implement native menus with Cmd+C, Cmd+V on macOS automatically, Ctrl+C on Windows/Linux
4. Don't select text in UI elements (use `user-select: none`)
5. Test on all three platforms every phase — don't assume CSS behaves identically
6. Use platform-aware theming (dark mode on all platforms, native colors where possible)

**Warning signs:**
- Players say "it feels like a website"
- Keyboard shortcuts inconsistent across platforms
- Copy/paste broken on macOS specifically
- Font rendering looks blurry/wrong on some platforms

**Phase to address:**
Phase 1 (Foundation) — establish platform-aware UI patterns early. Phase 5 (Polish) — test heavily on all platforms.

---

### Pitfall 9: Museum API Data Becomes Silently Stale

**What goes wrong:**
App caches museum data: "met.org object 123456 is a Roman coin from 50 BC". Three months later, the museum updates its records: "actually, it's a forgery from 1920". The app keeps showing the old data. Educational value is compromised — students learn incorrect history.

Worse: the data silently diverges from source, with no warning. There's no "data refresh" indication, so players don't know they're seeing stale data.

**Why it happens:**
Museum APIs are not real-time. Data changes infrequently, but it changes. Developers cache data and never refresh it. There's no versioning or change tracking. After months of operation, the cached data becomes quietly wrong.

**How to avoid:**
1. Phase 3 (API Integration): Implement data staleness tracking:
   - Every cached object has `cachedAt` timestamp
   - Background job: periodically re-fetch changed objects (daily/weekly)
   - Mark data as stale if > 30 days old
2. Add refresh UI:
   - Show "last updated 30 days ago" in museum popups
   - "Refresh" button to re-fetch latest data
3. Implement change detection:
   - Store a hash of the object data
   - On background refresh, compare hash — if changed, notify developer
   - Log all changes for audit trail
4. For critical facts (educational content), add review process:
   - Flag data as "verified correct" or "needs review"
   - Don't show unverified data without warning
5. Document data freshness guarantees:
   - "This data is accurate as of [date]"
   - "Educational objects verified by [museum] as of [date]"

**Warning signs:**
- App shows information contradicting museum website
- No indication of when data was last updated
- Teachers complain about inaccurate historical facts
- Museum staff discover errors in your app's data

**Phase to address:**
Phase 3 (API Integration) and Phase 6 (Polish) — design data freshness strategy early, audit before launch.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode museum object IDs instead of dynamic lookup | Quick testing, no API calls needed | Breaks when museums update IDs, impossible to swap museums later, manually update 1000s of IDs if migrating APIs | Only during Phase 1 prototype, must refactor before Phase 3 |
| Cache everything locally, never expire | Offline works great, instant loads | Data becomes months old, impossible to update without reinstalling, users see stale history | Acceptable only if data is truly immutable (historical facts that never change) |
| Store full game state in localStorage | Simple persistence, works offline | localStorage has 5-10MB limit per domain, corrupts easily, not reliable for large datasets | OK for Phase 1 MVP, must migrate to SQLite by Phase 2 |
| Synchronous IPC calls (blocking) | Simple to understand | UI freezes during I/O, terrible UX, doesn't scale | Never acceptable — use async/await from start |
| Disable Electron security features for convenience | Faster dev, fewer errors | XSS becomes RCE (remote code execution), major security vulnerability | Never acceptable — security features exist for a reason |
| Fetch full museum collection on load | Simplest code | App hangs for 30 seconds on startup, uses 500MB RAM, fails on slow networks | Never acceptable — implement progressive loading instead |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Met Museum API | No rate limiting, requests fire synchronously | Implement queue with exponential backoff, respect X-RateLimit-* headers, cache aggressively |
| British Museum API (if used) | No error handling for timeouts (APIs slow, ~2-10 seconds) | Implement 30-second timeout, fallback to cached data, show "loading..." indicator |
| Pleiades/Perseus scraping | Scrape HTML without change detection, breaks when HTML changes | Use stable APIs if available, implement data versioning, log scrape errors, notify on data structure changes |
| Leaflet tile server (OpenStreetMap) | Hardcode tile URL, unaware of rate limits | Use official tile server with attribution, implement fallback tile servers, cache tiles locally |
| Electron file system access | No error handling for permission denied | Check permissions early, graceful fallback (in-memory instead of disk), ask for permissions explicitly |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Rendering all map markers at once (no culling) | Map responsive with 50 markers, sluggish with 200+, frozen with 1000+ | Implement viewport culling: only render markers in visible area + buffer, destroy off-screen | 200+ markers visible |
| State updates cause full component tree re-render | Fast with shallow state (10 properties), slow with deep state (1000+ properties in object tree) | Use Zustand or Redux for fine-grained subscriptions, memoize components, profiles hot paths | 500+ state properties, complex nesting |
| No pagination/virtualization for lists | Small lists (< 100 items) fast, large lists slow | Implement windowing: only render visible list items, use react-window or similar | 500+ items in a list |
| Database queries without indexing | First 1000 queries fast, 100K queries slow, timeouts | Index frequently queried columns early, profile SQLite queries, use EXPLAIN PLAN | 100K+ rows in database |
| Asset loading blocking render | App loads fast with local assets, hangs when fetching from server | Load assets asynchronously, use lazy loading, show placeholder/skeleton UI | Slow network or 100MB+ assets |
| Game turn resolution synchronously | 5 turns resolve instantly, 50 turns take 5 seconds, 200+ turns hang | Break turn resolution into async steps, use requestAnimationFrame for UI updates, show progress | 100+ turns in a session |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Enabling `nodeIntegration: true` in Electron | XSS vulnerability becomes RCE (attacker gains full OS access) | Always use `nodeIntegration: false` (default in modern Electron), use preload scripts for IPC |
| Storing API credentials in localStorage or .env in repo | Credentials leaked publicly, attacker gains museum API access | Store credentials in Keychain/Credentials Manager, never commit .env, use secure storage for sensitive data |
| Trusting museum API data without validation | Malformed data crashes app, or attacker feeds fake museum data to educate students with false information | Validate all API responses against schema, sanitize displayed text, warn if data source is untrusted |
| Allowing file system access from renderer without restrictions | User can read/write arbitrary files on disk | Use preload script, whitelist allowed directories, prompt user for file access permission |
| Not escaping user input in turn logs/chat | XSS if app displays user-created content | Use React's built-in escaping, or DOMPurify, never set dangerouslySetInnerHTML without sanitization |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Loading indicator missing | User doesn't know if app is frozen or loading, clicks again and again | Show explicit "Loading..." with progress if > 1 second, disable buttons during load, show cancel option if > 5 seconds |
| No offline indication | User makes moves offline, expects them to sync, silently loses data | Show offline badge in header, save all offline moves locally, confirm sync status with user |
| Cryptic error messages | "Error 429" means nothing to player | Show user-friendly message: "Museum data not available. Showing cached data from [date]. Try again in 1 minute." |
| Ship animation never completes | Player thinks movement failed, moves again, creates duplicate ships | Show clear animation completion, confirm action with UI feedback (checkmark, sound), make animations fast (< 2 seconds) |
| No undo/replay | Player misclicks, move is permanent, game is ruined | Implement undo for last N turns (if possible given game rules), allow viewing turn history/replay |
| Map drowns out gameplay | Beautiful map is distracting, players can't find game info | Use map as secondary view, show game stats prominently, allow toggling between map and game board |
| No tutorial/onboarding | Players don't understand trade route mechanics, ancient Greek economics confuses them | Build tutorial for first 3 turns, explain mechanics in-game, provide tooltips, track metrics on learning |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Museum API Integration:** Often missing error handling for slow/unavailable APIs — verify timeout logic, retry logic, fallback to cached data
- [ ] **Offline Mode:** Often missing conflict resolution — verify sync doesn't lose data when reconnecting with local changes
- [ ] **Map Rendering:** Often missing performance testing at scale — verify map stays smooth with 1000+ markers and animations
- [ ] **Game State:** Often missing edge case handling (negative resources, crew death, faction elimination) — verify all invariants with tests
- [ ] **Database:** Often missing schema migrations — verify can update schema without losing player progress, test on real data
- [ ] **Audio Playback:** Often missing context isolation — verify audio works after Electron security updates, works in all contexts (main process, preload)
- [ ] **Cross-Platform Packaging:** Often missing Windows/Linux testing — verify app launches on real Windows/Linux machines, not just developer machine
- [ ] **Historical Data:** Often missing accuracy verification — verify museum facts match authoritative sources, flag uncertain data
- [ ] **IPC Communication:** Often missing batch optimization — verify turn resolution with full game logic doesn't exceed 200ms latency
- [ ] **Caching Strategy:** Often missing cache invalidation — verify stale data doesn't persist indefinitely, cache updates on network restore

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Native module compilation breaks on Windows build | HIGH | Stop shipping, identify missing .node binary, rebuild on Windows, update CI pipeline, ship hotfix, estimated 2-3 days |
| Map performance unacceptable (1000+ markers) | HIGH | Must refactor to canvas rendering or clustering, refactor map component, test thoroughly, could take 1-2 weeks |
| Game state corruption (impossible state reached) | HIGH | Identify all corrupted saves, implement data migration, build state validator, patch and distribute, audit for other corruptions |
| Museum API data becomes outdated (players learn wrong facts) | MEDIUM | Pull outdated data, notify users of incorrect facts, implement refresh strategy, identify scope of affected data |
| Offline sync loses player data | HIGH | Restore from backups if possible, notify affected players, implement transaction log for recovery, redesign sync logic |
| Electron IPC becomes bottleneck (turns take 10+ seconds) | MEDIUM | Profile and batch IPC calls, move computation to renderer, optimize main process, update turn resolution, 1-2 weeks |
| Bundle size too large (600MB+) | MEDIUM | Remove non-essential assets, lazy load features, implement asset server (fetch on demand), strip source maps, could take 3-5 days |
| Players report silent data loss | CRITICAL | Investigate sync logs, restore from database backups, build audit trail for all changes, audit for other affected systems, highest priority |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Native Module Compilation | Phase 1 (Foundation) | Successfully build and package app on Windows, macOS, Linux in CI/CD, test packaged app launches |
| Leaflet Performance Cliff | Phase 2 (Map Rendering) | Load 1000+ markers, verify smooth panning/zooming (60 FPS), measure marker animation performance |
| Museum API Rate Limits | Phase 3 (API Integration) | Run load test with 50+ concurrent requests, verify 429 errors are handled gracefully, measure latency |
| Game State Complexity | Phase 1-2 (Foundation/Core Mechanics) | Implement state machine, verify undo/replay works, test all state transitions, measure state object size |
| Offline Sync Corruption | Phase 4 (Offline Mode) | Test offline → online transition, simulate conflicts, verify data consistency, audit sync logs |
| Electron IPC Bottleneck | Phase 2 (Core Mechanics) | Measure IPC latency during turn, batch IPC calls, profile with 100+ messages/turn |
| App Bundle Bloat | Phase 1 (Foundation) | Set size target, measure in each phase, implement asset lazy loading by Phase 3 |
| Cross-Platform UX | Phase 1 (Foundation) | Test on Windows, macOS, Linux, verify native UI patterns, test keyboard shortcuts |
| Museum Data Staleness | Phase 3 (API Integration) | Implement data staleness tracking, background refresh, audit data against museum sources |
| IPC Communication | Phase 2 (Core Mechanics) | Profile IPC latency, implement batch calling, verify responsive UI during game actions |

---

## Sources

- [Things people get wrong about Electron](https://felixrieseberg.com/things-people-get-wrong-about-electron/)
- [Desktop Applications in Electron: Pro Tips and Tricks - InfoQ](https://www.infoq.com/presentations/electron-pitfalls/)
- [A Comprehensive Guide to Electron App Development in 2025 - Medium](https://medium.com/@swabhab.panigrahi/a-comprehensive-guide-to-electron-app-development-in-2025-9f15caed16f1)
- [Avoiding Pitfalls Developing with Electron - NCC Group](https://www.nccgroup.com/research-blog/avoiding-pitfalls-developing-with-electron/)
- [Poor performance with many markers - Leaflet GitHub Issue](https://github.com/Leaflet/Leaflet/issues/6314)
- [Optimizing Leaflet Performance with a Large Number of Markers - Medium](https://medium.com/@silvajohnny777/optimizing-leaflet-performance-with-a-large-number-of-markers-0dea18c2ec99)
- [API Rate Limiting at Scale: Patterns, Failures, and Control Strategies](https://www.getambassador.io/blog/rate-limiting-apis-scale-patterns-strategies)
- [The Turn-Based Game Architecture That Finally Made My Code Stop Fighting Me](https://outscal.com/blog/turn-based-game-architecture)
- [Ten Mistakes Commonly Made by Persons Designing Educational Simulations and Games - STS](https://www.simulationtrainingsystems.com/ten-mistakes-commonly-made-persons-designing-educational-simulations-games/)
- [Multi Platform Build - electron-builder](https://www.electron.build/multi-platform-build.html)
- [Using native modules in Electron - BigBinary Blog](https://www.bigbinary.com/blog/native-modules-electron)
- [Integrating Sqlite3 in electron project built with Electron-forge - Medium](https://ishwar-rimal.medium.com/integrating-sqlite3-in-electron-project-build-with-electron-forge-6d4d634b8648)
- [Build an offline-first app - Android Developers](https://developer.android.com/topic/architecture/data-layer/offline-first)
- [Offline-First Architecture: Designing for Reality, Not Just the Cloud - Medium](https://medium.com/@jusuftopic/offline-first-architecture-designing-for-reality-not-just-the-cloud-e5fd18e50a79)
- [Electron video player sound autoplay 2025 - The Coders Blog](https://thecodersblog.com/electron-video-player-sound-autoplay-2025)
- [How to Fix Inaccurate Web Scraping Data: 2026 Best Practices - Bright Data](https://brightdata.com/blog/web-data/fix-inaccurate-web-scraping-data)
- [Why Scraped Data Quietly Becomes Unreliable - Medium](https://medium.com/@goatishfw/why-scraped-data-quietly-becomes-unreliable-before-anyone-notices-536218e5276f)
- [Performance - Electron Official](https://www.electronjs.org/docs/latest/tutorial/performance)
- [State Management in React (2026): Best Practices, Tools & Real-World Patterns](https://www.c-sharpcorner.com/article/state-management-in-react-2026-best-practices-tools-real-world-patterns/)
- [4 must-know tips for building cross platform Electron apps - Avocode Blog](https://blog.avocode.com/4-must-know-tips-for-building-cross-platform-electron-apps-f3ae9c2bffff)

---

*Pitfalls research for: Archaeology Simulator (Electron + React turn-based educational game)*
*Researched: 2026-03-12*

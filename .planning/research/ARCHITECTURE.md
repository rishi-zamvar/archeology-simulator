# Architecture Research: Electron + React Turn-Based Simulation

**Domain:** Turn-based simulation game (Electron + React)
**Researched:** 2026-03-12
**Confidence:** HIGH (verified with official Electron documentation and multiple sources)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ELECTRON MAIN PROCESS                        │
│  • Application lifecycle management                                  │
│  • Window management (BrowserWindow)                                 │
│  • Game state engine & simulation                                    │
│  • SQLite database access (file I/O)                                 │
│  • IPC message routing (ipcMain.handle/on)                           │
│  • Native APIs (dialogs, menus, etc.)                                │
├─────────────────────────────────────────────────────────────────────┤
│                    IPC BRIDGE (Preload Script)                       │
│  • Controlled API exposure via contextBridge                         │
│  • Three patterns: invoke (request-response),                        │
│    send (one-way), event listeners                                   │
├─────────────────────────────────────────────────────────────────────┤
│                      ELECTRON RENDERER PROCESS                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     React Application                         │   │
│  │  ┌───────────────┐  ┌──────────────────┐  ┌────────────────┐ │   │
│  │  │  Game UI      │  │  Map Container   │  │  Event System  │ │   │
│  │  │  Components   │  │  (React Leaflet) │  │  (State Mgmt)  │ │   │
│  │  └────────┬──────┘  └────────┬─────────┘  └────────┬───────┘ │   │
│  │           │                  │                      │           │   │
│  │  ┌────────▼──────────────────▼──────────────────────▼────────┐ │   │
│  │  │              Zustand + TanStack Query                     │ │   │
│  │  │              (Client state + Server state)                │ │   │
│  │  └──────────────────────┬─────────────────────────────────┘ │   │
│  │                         │ (invoke/send IPC)                  │   │
│  │  ┌──────────────────────▼─────────────────────────────────┐ │   │
│  │  │              IPC Event Handlers (ipcRenderer.on/invoke) │ │   │
│  │  └─────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|-----------------|
| **Main Process Game Engine** | Manages game state, turn flow, simulation logic, economy, events | TypeScript class (e.g., `GameEngine`), uses command pattern for actions |
| **IPC Message Broker** | Routes commands/queries between renderer and main, enforces security | Main process `ipcMain.handle()` per domain (game, save, map data) |
| **React Component Tree** | Renders UI: panels, cards, event dialogs, inventory | React functional components using hooks, organized by feature |
| **Zustand Store** | Manages UI state: selected port, current view, scroll position | `create()` with multiple stores (UI, viewport, notifications) |
| **React Leaflet Map** | Renders interactive game map with ports, ships, routes | `MapContainer`, `TileLayer`, custom `Marker` components for ports/ships |
| **SQLite Database Layer** | Persistent game state, save slots, session data | SQL queries via main process, migrations on startup |
| **Preload Script** | Exposes controlled IPC API to renderer with `contextBridge` | TypeScript interface (e.g., `window.gameAPI`) |

## Recommended Project Structure

```
src/
├── main/                          # Electron main process
│   ├── index.ts                   # App entry point, window creation
│   ├── preload.ts                 # Preload script, contextBridge setup
│   ├── engine/                    # Game simulation engine
│   │   ├── GameEngine.ts          # Core game state & turn management
│   │   ├── Simulation.ts          # Economy, faction, event simulation
│   │   ├── Commands.ts            # Command pattern implementations
│   │   └── EventQueue.ts          # Turn-based event processing
│   ├── database/                  # SQLite persistence layer
│   │   ├── Database.ts            # Connection & migrations
│   │   ├── GameRepository.ts      # Save/load game state
│   │   └── schema.sql             # Database schema
│   └── ipc/                       # IPC handlers (request-response)
│       ├── gameHandlers.ts        # Handle: turn action, get state
│       ├── saveHandlers.ts        # Handle: save, load, autosave
│       └── mapHandlers.ts         # Handle: port data, routes
│
├── renderer/                      # React renderer process
│   ├── index.tsx                  # React app entry point
│   ├── store/                     # Zustand stores
│   │   ├── useGameStore.ts        # Game state (current turn, events)
│   │   ├── useUIStore.ts          # UI state (selected port, view mode)
│   │   └── useMapStore.ts         # Map state (viewport, markers)
│   ├── components/
│   │   ├── MapPanel.tsx           # React Leaflet map container
│   │   ├── SidePanel.tsx          # Info/control panels
│   │   ├── EventCard.tsx          # Event display modal
│   │   ├── PortScene.tsx          # Trading interface
│   │   └── common/                # Reusable UI components
│   ├── hooks/
│   │   ├── useGameEngine.ts       # Hook to call game IPC methods
│   │   ├── usePersistence.ts      # Hook for save/load lifecycle
│   │   └── useMapInteraction.ts   # Hook for port/marker clicks
│   ├── api/                       # API layer for external services
│   │   ├── museumAPI.ts           # Met Museum, British Museum images
│   │   ├── weatherAPI.ts          # Seasonal weather data
│   │   └── geoAPI.ts              # Pleiades geocoding
│   ├── types/                     # TypeScript interfaces
│   │   ├── Game.ts                # GameState, Turn, Action types
│   │   ├── Port.ts                # Port, Good, Trade types
│   │   └── Faction.ts             # Faction, Crew types
│   └── utils/
│       ├── constants.ts           # Game constants, port data
│       └── formatting.ts          # Date, number, unit formatting
│
└── shared/                        # Shared types & utilities
    ├── types.ts                   # Shared GameState, Command types
    └── constants.ts               # Shared game constants
```

### Structure Rationale

- **main/ separation:** All database, simulation, and state mutations happen in main process. Renderer is stateless display layer. Enforces security boundary.
- **Zustand stores as separate files:** Each store handles one domain (game, UI, map). Easy to test and prevents prop drilling.
- **ipc/ folder:** All IPC handlers organized by domain. Easy to add new handlers without cluttering index.
- **Components by responsibility:** MapPanel, SidePanel, EventCard are feature containers. common/ for reusable primitives.
- **hooks/ for integration:** `useGameEngine()` encapsulates IPC call logic, retry logic, error handling. `usePersistence()` manages autosave lifecycle.
- **api/ folder:** External service calls isolated. Easier to mock in tests, easier to add retries/caching.

## Architectural Patterns

### Pattern 1: Turn-Based Command Pattern

**What:** Each player action (move ship, trade, recruit crew) is a Command object sent from renderer to main process.

**When to use:** This is essential for turn-based games. Enables undo/redo, replay, and server-side validation.

**Trade-offs:**
- Pro: Decouples UI from game state, enables rich action history
- Con: Slight latency (IPC round-trip), requires serialization

**Example:**
```typescript
// renderer/hooks/useGameEngine.ts
export function useGameEngine() {
  const executeAction = async (action: GameAction) => {
    try {
      const result = await window.gameAPI.executeAction(action);
      useGameStore.setState({ gameState: result.newState });
      return result;
    } catch (error) {
      // Handle validation error or main process crash
    }
  };
  return { executeAction };
}

// main/engine/Commands.ts
interface GameAction {
  type: 'MOVE_SHIP' | 'TRADE_GOODS' | 'RECRUIT_CREW';
  shipId: string;
  payload: unknown;
}

class MoveShipCommand {
  execute(game: GameState, shipId: string, portId: string): GameState {
    // Validation, mutation, return new state
  }
}

// main/ipc/gameHandlers.ts
ipcMain.handle('gameAPI:executeAction', async (_, action: GameAction) => {
  const result = commandExecutor.execute(action, currentGame);
  return { newState: result };
});
```

### Pattern 2: Main Process as Game Authority

**What:** All game logic runs in main process. Renderer sends actions, receives computed state back via IPC.

**When to use:** Always for turn-based games. Prevents cheating, enables easy save/load.

**Trade-offs:**
- Pro: Single source of truth, secure, deterministic
- Con: UI must await IPC responses, cannot do offline prediction

**Example:**
```typescript
// Renderer sends command → Main validates & executes → Returns new state
// NOT: Renderer optimistically updates, then syncs

async function onPortClicked(portId: string) {
  const result = await window.gameAPI.tradeCargo(portId, tradeDetails);
  setGameState(result.gameState);  // Update after confirmation
}
```

### Pattern 3: React Leaflet with Command Sink

**What:** Map markers are React components that emit game commands via click handlers, not direct state mutations.

**When to use:** Whenever interactive map elements trigger game actions.

**Trade-offs:**
- Pro: Clear data flow, map stays synchronized with game engine
- Con: Slight latency for visual feedback (consider animation overlays)

**Example:**
```typescript
// renderer/components/MapPanel.tsx
function PortMarker({ port, isSelected }: PortMarkerProps) {
  const { executeAction } = useGameEngine();

  const handleClick = () => {
    // Command goes to main, returns new state
    executeAction({
      type: 'ARRIVE_AT_PORT',
      shipId: currentShip.id,
      portId: port.id
    });
  };

  return (
    <Marker position={[port.lat, port.lon]} eventHandlers={{ click: handleClick }}>
      <Popup>{port.name}</Popup>
    </Marker>
  );
}
```

### Pattern 4: Preload Script for Security

**What:** Main process exposes only necessary APIs via `contextBridge`. Renderer cannot access Node.js directly.

**When to use:** Always in Electron apps. Prevents exploits.

**Trade-offs:**
- Pro: Prevents XSS from injecting Node.js access
- Con: Requires explicit API design

**Example:**
```typescript
// main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('gameAPI', {
  executeAction: (action: GameAction) => ipcRenderer.invoke('gameAPI:executeAction', action),
  getSaveSlots: () => ipcRenderer.invoke('gameAPI:getSaveSlots'),
  // Only these methods are available to renderer
});

// renderer/components/SomeComponent.tsx
// window.gameAPI.executeAction() ✓ works
// require('fs').readFileSync() ✗ throws error
```

### Pattern 5: Zustand for Local UI State Only

**What:** Zustand stores hold only UI state (selected port, panel visibility, map viewport). Game state lives in main process.

**When to use:** Keep renderer state minimal, synchronized with main via IPC responses.

**Trade-offs:**
- Pro: Single source of truth for game (main), simple re-renders
- Con: Must fetch state from main on app startup

**Example:**
```typescript
// renderer/store/useUIStore.ts
interface UIState {
  selectedPortId: string | null;
  isPanelOpen: boolean;
  mapViewport: { lat: number; lon: number; zoom: number };
}

export const useUIStore = create<UIState>((set) => ({
  selectedPortId: null,
  setSelectedPortId: (id) => set({ selectedPortId: id }),
  // ...
}));

// main game state is NOT here — it's in main process
// Renderer asks main: "what's my ship's inventory?"
// Main answers via IPC, renderer updates Zustand UI store with response
```

## Data Flow

### Turn Execution Flow

```
Player clicks "End Turn" in UI
    ↓
React component calls window.gameAPI.executeTurn()
    ↓
Renderer sends IPC message to main process (ipcRenderer.invoke)
    ↓
Main process GameEngine.executeTurn():
  - Validates current state
  - Executes queued player actions
  - Runs AI faction turns
  - Advances economy simulation
  - Resolves events
  - Increments turn counter
    ↓
Main process saves new state to SQLite (async)
    ↓
Main process returns new GameState to renderer via IPC response
    ↓
Renderer updates Zustand store with new state
    ↓
React re-renders map (ship positions), panels (resources), UI
```

### Port Action Flow (Example)

```
User clicks port marker on map
    ↓
PortMarker.handleClick() → executeAction({ type: 'ARRIVE_AT_PORT', portId })
    ↓
useGameEngine hook calls window.gameAPI.executeAction()
    ↓
Main process receives IPC message on 'gameAPI:executeAction' channel
    ↓
Main validates: ship in range? permitted trade? goods available?
    ↓
Main executes MoveShipCommand, returns new GameState with:
  - Ship location updated
  - Port scene available
  - Event cards if discovered new goods
    ↓
Renderer receives response, updates useGameStore
    ↓
EventCard component appears (populated from returned state)
    ↓
User selects trade action → cycle repeats
```

### Persistence Flow

```
Turn 5 completes → Main process auto-saves to SQLite
    ↓
Every 30 seconds or after critical action:
  DB.saveGameState(currentGame, slotId)
    ↓
User clicks "Load Game" → Renderer calls window.gameAPI.loadGame(slotId)
    ↓
Main queries SQLite: SELECT * FROM saves WHERE slot_id = $1
    ↓
Main reconstructs GameEngine with loaded state
    ↓
Main returns game state to renderer
    ↓
Renderer populates map, UI with loaded state
```

### External API Integration Flow

```
Game boots → Main process calls Pleiades API for port geodata
    ↓
Renderer renders map with custom tiles from Stadia Maps
    ↓
User clicks port → Renderer queries Met Museum API for artifact images
    ↓
Image fetch happens in renderer process (ReactQuery/TanStack Query)
    ↓
TanStack Query caches results, background refresh on focus
    ↓
Weather API called once per game year to determine seasonal modifiers
```

## State Management Strategy

### Game State (Main Process)

```typescript
interface GameState {
  turnNumber: number;
  year: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  factions: Faction[];
  ships: Ship[];
  ports: Port[];
  events: GameEvent[];
  economy: EconomyState;
}
```

Stored in memory in main process, checkpointed to SQLite:
- Before & after each turn (for undo)
- After significant events
- Auto-save every 30 seconds

### UI State (Zustand)

```typescript
interface UIState {
  selectedPortId: string | null;
  selectedShipId: string | null;
  isPanelOpen: boolean;
  panelMode: 'trade' | 'crew' | 'info';
  mapViewport: MapViewport;
  notifications: Notification[];
}
```

Derived from game state (never source of truth), updated when:
- IPC response received from main
- Local UI interaction (map pan, panel toggle)

### External Data (TanStack Query)

```typescript
const { data: artifacts } = useQuery({
  queryKey: ['museum', 'artifacts', portId],
  queryFn: () => museumAPI.getArtifacts(portId),
  staleTime: 1000 * 60 * 60, // Cache for 1 hour
});
```

Fetches from external APIs, caches locally, background refresh.

## Build Order & Dependencies

### Phase 1: Foundation (Before Gameplay)
1. Electron main/renderer boilerplate
2. SQLite connection & migrations
3. IPC bridge with preload script
4. Zustand stores (empty)
5. Basic React app shell

**Allows:** Testing IPC, database, React rendering

### Phase 2: Game Engine (Turn Logic)
1. GameEngine class with command pattern
2. GameState interface & types
3. Port, Ship, Faction data structures
4. IPC handlers for action execution
5. Basic economy simulation

**Allows:** Turn flow, action validation, state persistence

### Phase 3: UI Components (Rendering)
1. MapPanel with React Leaflet
2. SidePanel with event cards
3. Inventory/trade interface
4. Ship control panel
5. useGameEngine hook for IPC

**Allows:** Visual gameplay, but map is interactive

### Phase 4: API Integration (External Data)
1. Met Museum API integration
2. British Museum API integration
3. Pleiades geocoding for ports
4. Weather API for seasonal data
5. TanStack Query setup

**Allows:** Rich artifact visuals, historically accurate ports

### Phase 5: Polish (Audio, Visual Feedback)
1. Audio system (ambient, effects)
2. Animation system (ship movement, transitions)
3. Sound effect triggers from game events
4. Visual feedback on action results

**Allows:** Immersive experience

### Why This Order

- **Main → Engine → UI → API → Polish:** Game logic must exist before UI can display it. APIs add flavor, not core mechanics.
- **IPC + Database first:** Needed for everything else. Data flow patterns established early.
- **Zustand stores created early:** Even if empty, structure is clear. Easy to fill in as engine progresses.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users (Single Player) | Current architecture sufficient. Auto-save to SQLite fine. |
| If multiplayer later | Add server process (Node.js + PostgreSQL). Main process becomes game client. Renderer unchanged. |
| If very large maps | Use Leaflet clustering/canvas mode instead of markers. Consider virtual scrolling for port list. |
| If complex AI | Move AI simulation to worker thread or separate process to prevent main blocking. |

For current single-player scope, no scaling changes needed. Architecture is intentionally simple.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Mutable Game State in Renderer

**What people do:** Store game state in Zustand, mutate directly in components
```typescript
// ❌ WRONG
const { gameState } = useGameStore();
gameState.ships[0].position = newPosition;  // Direct mutation
```

**Why it's wrong:** Causes desyncs with main process, breaks undo/replay, makes debugging hard.

**Do this instead:**
```typescript
// ✓ RIGHT
await window.gameAPI.moveShip(shipId, newPosition);
// Main validates, mutates, returns new state
// Renderer updates via IPC response
```

### Anti-Pattern 2: Synchronous IPC (invoke without await)

**What people do:** Use `ipcRenderer.invoke()` but ignore the Promise
```typescript
// ❌ WRONG
window.gameAPI.executeTurn();  // Promise ignored
setGameState(gameState);  // Updates with stale data
```

**Why it's wrong:** Race conditions, optimistic updates fail, state mismatches.

**Do this instead:**
```typescript
// ✓ RIGHT
const result = await window.gameAPI.executeTurn();
setGameState(result.gameState);  // Update after response
```

### Anti-Pattern 3: React Leaflet Re-creating Map on Every Render

**What people do:** Move MapContainer creation inside component body
```typescript
// ❌ WRONG
function MapPanel() {
  return (
    <MapContainer key={random()}>  {/* Recreates every render */}
      <TileLayer url="..." />
    </MapContainer>
  );
}
```

**Why it's wrong:** Leaflet loses internal state, markers flicker, performance tanks.

**Do this instead:**
```typescript
// ✓ RIGHT
const MapPanel = memo(function MapPanel() {
  return (
    <MapContainer center={[35, 20]} zoom={3}>  {/* Stable */}
      <TileLayer url="..." />
      {ports.map(p => <PortMarker key={p.id} port={p} />)}
    </MapContainer>
  );
});
```

### Anti-Pattern 4: Exposing Full Node.js API in Preload Script

**What people do:** Use `nodeIntegration: true` or expose `require` globally
```typescript
// ❌ WRONG
contextBridge.exposeInMainWorld('node', { require });
// window.require now works in renderer, XSS can access filesystem
```

**Why it's wrong:** Any injected script in renderer gets filesystem access.

**Do this instead:**
```typescript
// ✓ RIGHT
contextBridge.exposeInMainWorld('gameAPI', {
  saveGame: (data) => ipcRenderer.invoke('saveGame', data),
  // Only necessary methods exposed
});
```

### Anti-Pattern 5: Hot-Loading External APIs Without Caching

**What people do:** Call museum API on every port selection
```typescript
// ❌ WRONG
function PortScene({ portId }) {
  const [artifacts, setArtifacts] = useState([]);
  useEffect(() => {
    museumAPI.getArtifacts(portId).then(setArtifacts);
  }, [portId]);  // Fetches every time port changes
}
```

**Why it's wrong:** API rate limits, slow, duplicate requests, poor UX.

**Do this instead:**
```typescript
// ✓ RIGHT
const { data: artifacts } = useQuery({
  queryKey: ['artifacts', portId],
  queryFn: () => museumAPI.getArtifacts(portId),
  staleTime: 1000 * 60 * 60,  // Cache 1 hour
});
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Met Museum API | React component + TanStack Query, request in renderer | Caches image URLs. Fallback to stock images if API down. |
| British Museum API | Same as Met Museum | Combine results, deduplicate by artifact. |
| Pleiades (Geocoding) | Main process at startup, cache in SQLite | Load port geodata once on game start, store locally. |
| Stadia Maps (Tiles) | React Leaflet TileLayer with API key | Optional premium tiles. Free tier sufficient for MVP. |
| Weather API | Main process once per game year, store in GameState | Determines seasonal trade route modifiers. |
| Wikimedia Commons | Renderer via TanStack Query | Image fallbacks if museum APIs timeout. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Main ↔ Renderer | ipcRenderer.invoke (request-response) | Preload script enforces API contract. No direct access. |
| GameEngine ↔ Database | Direct function calls (both in main) | No IPC overhead. Synchronous queries acceptable for turn-based game. |
| Renderer UI ↔ Zustand | Direct store mutation via actions | Standard React pattern. Mutable but localized to renderer. |
| Renderer ↔ External APIs | TanStack Query hooks | Automatic caching, retries, deduplication. |
| GameEngine ↔ Command Queue | Direct method calls | All commands execute synchronously during turn. |

## Performance Considerations

### Rendering Optimization

- **React Leaflet:** Use `React.memo()` on marker components to prevent re-render on map pan.
- **Large port lists:** Virtual scroll the port list panel (react-window).
- **Event cards:** Only render active event card to DOM, rest are unmounted.

### IPC Optimization

- Batch commands where possible (trade multiple goods in one turn).
- Don't call IPC on every keystroke (debounce map pan calls).
- Keep serialized state under 1MB per message (Electron limit is much higher, but large payloads slow IPC).

### Database Optimization

- Index on `(game_id, turn_number)` for turn lookup.
- Checkpoint (save) only after significant state changes, not every frame.
- Read game state once on startup, keep in memory during play.

### Map Rendering

- React Leaflet warns against rendering 1000+ markers. At 40+ major ports, consider clustering.
- If ships move smoothly (animation), use CSS animations, not IPC updates per frame.
- Load tile layers asynchronously, don't block main thread.

## Sources

- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc) - Official IPC patterns
- [Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model) - Main & renderer responsibilities
- [Electron Performance Guide](https://www.electronjs.org/docs/latest/tutorial/performance) - IPC & rendering optimization
- [React Leaflet Official Site](https://react-leaflet.js.org/) - Component API & best practices
- [LogRocket: Advanced Electron Architecture](https://blog.logrocket.com/advanced-electron-js-architecture/) - Multi-process patterns
- [Game Programming Patterns: Command](https://gameprogrammingpatterns.com/command.html) - Command pattern for games
- [Game Programming Patterns: Game Loop](https://gameprogrammingpatterns.com/game-loop.html) - Turn-based loop alternatives
- [The State of React State Management 2026](https://www.pkgpulse.com/blog/state-of-react-state-management-2026) - Zustand + TanStack Query recommendation
- [Securing SQLite3 in Electron](https://mandeepsingh.hashnode.dev/securing-sqlite3-data-in-electronjs-persistent-and-protected-database-storage) - Database setup
- [Turn-Based Game Architecture Guide](https://outscal.com/blog/turn-based-game-architecture) - Design patterns for turn systems
- [Electron + React Game Launcher Example](https://medium.com/@pragmaticcoders/building-a-cross-platform-game-launcher-with-electron-70c7556f2ae8) - Practical example

---

*Architecture research for: Turn-based ancient Mediterranean trade simulator*
*Researched: 2026-03-12*

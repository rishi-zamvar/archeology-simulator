# Phase 11: Sailing Animation Polish - Research

**Researched:** 2026-03-31
**Domain:** Leaflet animation, React state/animation coordination, voyage simulation UI
**Confidence:** HIGH

## Summary

This phase transforms a basic 5-second hardcoded ship animation into a rich sailing experience with route visualization, distance-proportional timing, camera tracking, a voyage overlay, and per-turn event sequencing. The existing codebase provides strong foundations: `leaflet.motion` already animates the ship along a polyline, `voyage.ts` computes haversine distances and turn durations, `weather.ts` provides seasonal descriptions, and `events.ts` has a complete event roll + resolution system.

The primary architectural challenge is **sequencing per-turn events during the animation** (SAIL-05). Currently, SET_SAIL rolls a single event for the entire voyage. Phase 11 needs to roll once per turn of the voyage, pausing the animation for event resolution and showing "uneventful sailing" for empty turns. This requires a new IPC-driven turn-stepping protocol rather than the current fire-and-forget animation approach.

**Primary recommendation:** Drive the voyage turn-by-turn from the renderer using a step loop (requestAnimationFrame-segmented animation + IPC calls per turn), replacing the current single-shot leaflet.motion animation. Use L.polyline for the static dashed route line (separate from the animated motion polyline). Add a SailingOverlay React component positioned over the map.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SAIL-01 | Visible dashed route line on map during sailing | L.polyline with dashArray on Leaflet map; existing portCoords map provides coordinates |
| SAIL-02 | Animation duration proportional to route distance | voyage.ts calculateVoyageDuration() provides turn count; multiply by ~500ms per turn, clamp 2-8s |
| SAIL-03 | Map camera pans to follow ship during animation | useMap() hook already available in ShipMarker; Leaflet map.flyTo()/panTo() with smooth options |
| SAIL-04 | Sailing overlay showing voyage progress, ETA, and weather | New SailingOverlay component; weather.ts getSeasonalWeatherDescription() + getSeason() |
| SAIL-05 | Time passes visibly during voyage with per-turn events | Major architecture change: turn-stepping loop replaces single-shot animation; per-turn rollVoyageEvent via IPC |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| leaflet | 1.9.4 | Map rendering, L.polyline for route line | Already installed, production-proven |
| leaflet.motion | 0.3.2 | Ship marker animation along polyline | Already installed, duck-typed MotionLayer interface established |
| react-leaflet | 5.0.0 | React bindings for Leaflet, useMap() hook | Already installed, provides map ref access |
| react | 19.0.0 | UI components for overlay | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | 5.0.11 | UI state for overlay visibility | Already installed, follow existing uiStore pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| leaflet.motion for animation | Manual rAF position interpolation | More control over pause/resume but leaflet.motion already works and is integrated |
| L.polyline for route | SVG overlay | L.polyline is simpler and auto-pans with map |

## Architecture Patterns

### Current Architecture (What Exists)

```
Shell.tsx
  |-- MapArea.tsx (MapContainer)
  |     |-- ShipMarker.tsx (leaflet.motion, useMap())
  |         - Creates L.motion.polyline with 5s hardcoded duration
  |         - On 'motion-ended': fires ARRIVE then START_TRADE via IPC
  |
  |-- (no overlay during sailing)

game.ts IPC handler:
  SET_SAIL -> roll ONE event -> if event, transition to 'encountered'
  ARRIVE -> transition to 'idle'
```

### Target Architecture (What We Build)

```
Shell.tsx
  |-- MapArea.tsx (MapContainer)
  |     |-- ShipMarker.tsx (ENHANCED)
  |     |     - L.polyline (static dashed route line)
  |     |     - L.motion.polyline (animated ship, segmented per-turn)
  |     |     - Camera follow via map.panTo() on motion progress
  |     |
  |     |-- (children slot already exists for ShipMarker)
  |
  |-- SailingOverlay.tsx (NEW)
  |     - Route info, turn counter, weather description, season badge
  |     - Positioned top-center, parchment style

IPC layer:
  game:advanceSailingTurn (NEW) -> roll event for current turn
    -> return { event: VoyageEvent | null, turnNumber, totalTurns, arrived: boolean }
  Per turn: renderer calls advanceSailingTurn, shows result, then continues animation
```

### Pattern 1: Turn-Stepping Animation Loop

**What:** Instead of a single continuous animation, segment the voyage into per-turn animation chunks. Each segment animates a fraction of the route, then pauses to process the turn (event roll, weather update).

**When to use:** When the animation must synchronize with game state changes (SAIL-05).

**Example:**
```typescript
// In ShipMarker.tsx or a new useSailingAnimation hook
async function runVoyageAnimation(
  totalTurns: number,
  startCoords: [number, number],
  endCoords: [number, number],
  map: L.Map,
) {
  const msPerTurn = calculateAnimationDuration(totalTurns) / totalTurns;

  for (let turn = 0; turn < totalTurns; turn++) {
    // Interpolate segment start/end
    const t0 = turn / totalTurns;
    const t1 = (turn + 1) / totalTurns;
    const segStart = interpolateLatLng(startCoords, endCoords, t0);
    const segEnd = interpolateLatLng(startCoords, endCoords, t1);

    // Animate this segment
    await animateSegment(segStart, segEnd, msPerTurn, map);

    // Roll for event via IPC
    const result = await window.api.game.advanceSailingTurn();

    if (result.event) {
      // Pause: EventCard will appear (state -> 'encountered')
      // Wait for resolution before continuing
      await waitForEventResolution();
    }
    // Update overlay with turn progress
  }

  // Voyage complete
  await window.api.game.action({ type: 'ARRIVE' });
}
```

### Pattern 2: Static Route Line (Separate from Animation)

**What:** A plain L.polyline rendered independently of the motion animation, showing the full route path with a dashed sepia style.

**When to use:** SAIL-01 route visualization.

**Example:**
```typescript
// Separate from the motion polyline — static display only
const routeLine = L.polyline([startCoords, endCoords], {
  color: '#7a5c45',
  weight: 2,
  dashArray: '10, 8',
  opacity: 0.7,
});
routeLine.addTo(map);
// Clean up on voyage end
```

### Pattern 3: Camera Follow

**What:** Pan the map to track the ship position during animation.

**When to use:** SAIL-03.

**Example:**
```typescript
// During each animation segment, pan map to follow
map.panTo(currentPosition, { animate: true, duration: 0.5 });
// Or for initial framing, fitBounds to show whole route
map.fitBounds(L.latLngBounds(startCoords, endCoords).pad(0.2));
```

### Anti-Patterns to Avoid
- **Re-creating motion polyline on every React render:** Stabilize effect deps with voyageId, not destination+departurePortId (per existing PITFALLS.md)
- **Using a single long animation with post-hoc turn counting:** Events must pause the animation, not be overlaid on a continuous motion
- **Blocking the main process with a turn loop:** All turn stepping happens in the renderer; main process handles individual IPC calls

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dashed route line | Custom SVG path on map | L.polyline with dashArray | Leaflet handles zoom, pan, projection |
| Ship position interpolation | Manual lat/lng math | Linear interpolation between two points | Simple enough that a utility function suffices |
| Map panning during animation | Custom scroll logic | map.panTo() / map.flyTo() | Leaflet's built-in smooth panning |
| Weather descriptions | New weather text | getSeasonalWeatherDescription() from weather.ts | Already exists, seasonally themed |
| Distance-based duration | New distance calculation | calculateVoyageDuration() from voyage.ts | Already exists, historically grounded |

## Common Pitfalls

### Pitfall 1: leaflet.motion Animation Races With React Re-renders
**What goes wrong:** Parent re-renders cause effect cleanup, restarting the animation from the beginning (ship jumps back to start).
**Why it happens:** portCoords Map reference changes on parent re-render; leaflet.motion is imperative, React is declarative.
**How to avoid:** (1) Memoize portCoords with useMemo in Shell.tsx. (2) Use a voyageId (or combination of departurePortId+destination) as the sole effect dep guard. (3) Guard motion-ended callback with state check before firing ARRIVE.
**Warning signs:** Ship visually jumps during sailing; console error "Invalid transition: idle -> ARRIVE".

### Pitfall 2: Event Pause/Resume Breaks Animation State
**What goes wrong:** When an event fires mid-voyage, the animation pauses. After resolution, the animation must resume from where it stopped, not restart.
**Why it happens:** leaflet.motion's motionStop()/motionStart() may not reliably pause and resume at exact position. The encounter state change triggers React re-render.
**How to avoid:** Use per-segment animation (Pattern 1 above) rather than pause/resume on a single long animation. Each turn is an independent animation segment.
**Warning signs:** Ship teleports to route start after event resolution.

### Pitfall 3: Turn Advancement Not Persisted
**What goes wrong:** If the user closes the app mid-voyage, progress is lost because turns were only tracked in renderer state.
**Why it happens:** The per-turn step loop runs in the renderer; game state only updates on ARRIVE.
**How to avoid:** Each advanceSailingTurn IPC call should increment currentTurn in the DB and save state. If the app restarts mid-voyage, the state.ts RESOLVE handler already transitions encountered -> idle, which is an acceptable recovery (player resumes at port).
**Warning signs:** Turn counter resets after app restart during voyage.

### Pitfall 4: Overlay Blocks Map Interaction
**What goes wrong:** The sailing overlay intercepts click/scroll events, preventing map zoom/pan during sailing.
**Why it happens:** Overlay div is positioned above the map with higher z-index.
**How to avoid:** Use `pointerEvents: 'none'` on the overlay container, `pointerEvents: 'auto'` only on interactive elements within it.
**Warning signs:** Cannot zoom map during sailing animation.

### Pitfall 5: Animation Duration Feels Wrong
**What goes wrong:** Very short voyages (1 turn) animate too fast to see; long voyages (8+ turns) feel tediously slow.
**Why it happens:** Linear scaling of duration to turns.
**How to avoid:** Clamp: minimum 2 seconds, maximum 8 seconds (as specified in CONTEXT.md). Use ~500ms per turn within those bounds.
**Warning signs:** Player sees no animation for short trips; player gets bored on long trips.

## Code Examples

### Calculate Animation Duration from Voyage Turns
```typescript
// Pure function — no side effects
function calculateAnimationDuration(durationTurns: number): number {
  const MS_PER_TURN = 500;
  const MIN_MS = 2000;
  const MAX_MS = 8000;
  return Math.max(MIN_MS, Math.min(MAX_MS, durationTurns * MS_PER_TURN));
}
```

### Linear LatLng Interpolation
```typescript
function interpolateLatLng(
  start: [number, number],
  end: [number, number],
  t: number
): [number, number] {
  return [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t,
  ];
}
```

### New IPC Channel: game:advanceSailingTurn
```typescript
// In src/main/ipc/game.ts
wrapHandler<{
  turnNumber: number;
  totalTurns: number;
  event: VoyageEvent | null;
  weatherDescription: string;
  arrived: boolean;
}, []>(
  'game:advanceSailingTurn',
  async () => {
    const current = loadGameState(db);
    if (current?.type !== 'sailing') {
      throw new Error('Not in sailing state');
    }
    // Advance turn
    const newTurn = current.currentTurn + 1;
    const turnInVoyage = current.eta > 0
      ? current.eta - /* remaining */ 0
      : newTurn - /* departure turn */;
    // Roll event for this turn
    const mods = getWeatherModifiers(newTurn);
    const event = rollVoyageEvent(newTurn, current.departurePortId, current.destination, {
      storm: mods.stormWeight,
      pirate: mods.pirateWeight,
      calm: mods.calmWeight,
    });
    // ... save state, handle encounter transition
  }
);
```

### SailingOverlay Component Structure
```typescript
// src/renderer/components/SailingOverlay.tsx
interface SailingOverlayProps {
  departurePort: string;
  destinationPort: string;
  currentTurn: number;
  totalTurns: number;
  weatherDescription: string;
  season: Season;
  monthName: string;
}
// Floating parchment panel, top-center, semi-transparent
// Uses Cinzel font, sepia color scheme per existing UI patterns
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single event per voyage | Per-turn event rolling needed | Phase 11 | Fundamental change to voyage flow |
| 5s hardcoded animation | Distance-proportional duration | Phase 11 | Requires voyage.ts integration |
| No route visualization | Dashed polyline on map | Phase 11 | Visual feedback for players |
| Fire-and-forget animation | Turn-stepping with pause/resume | Phase 11 | Enables SAIL-05 time passage |

## Key Architecture Decision: Turn-Stepping Approach

The critical decision for this phase is how to implement SAIL-05 (visible time passage with per-turn events). Two approaches exist:

**Option A: Renderer-driven turn stepping (RECOMMENDED)**
- Renderer runs an async loop, calling `game:advanceSailingTurn` per turn
- Each call advances currentTurn, rolls event, returns result
- Renderer animates one segment, processes result, continues
- Pro: Clean separation, natural pause points for events
- Con: More IPC calls; voyage state split between renderer loop and main process

**Option B: Main-process-driven with push notifications**
- Main process runs the entire voyage turn loop after SET_SAIL
- Pushes per-turn updates via IPC broadcast
- Renderer passively displays updates
- Pro: All game logic in main process
- Con: Harder to pause for event resolution; animation timing harder to sync

Option A is recommended because it naturally handles the event pause/resume requirement and keeps the animation in sync with game state.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 2.1.9 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SAIL-01 | Route line created with correct dashArray and color | unit | `npx vitest run tests/game/sailing.test.ts -t "route line"` | No - Wave 0 |
| SAIL-02 | Animation duration scales with voyage turns (clamped 2-8s) | unit | `npx vitest run tests/game/sailing.test.ts -t "duration"` | No - Wave 0 |
| SAIL-03 | Camera follow calls panTo during animation | manual-only | N/A (requires Leaflet map instance) | N/A |
| SAIL-04 | Overlay displays route, turn counter, weather | manual-only | N/A (React component rendering) | N/A |
| SAIL-05 | Per-turn event rolling via advanceSailingTurn IPC | unit | `npx vitest run tests/game/sailing.test.ts -t "advanceTurn"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/game/sailing.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/game/sailing.test.ts` -- covers SAIL-01 (duration calc), SAIL-02 (scaling), SAIL-05 (turn stepping logic)
- [ ] No new framework install needed -- vitest already configured

## Open Questions

1. **How does SailingState.eta currently get set?**
   - What we know: SET_SAIL action includes `eta: 0` in Shell.tsx handleNavigate (line 149). The eta field exists on SailingState but is always passed as 0.
   - What's unclear: Whether eta was intended to be used for turn tracking or is a placeholder.
   - Recommendation: Repurpose eta as the total voyage duration in turns. Set it properly when SET_SAIL fires (compute from voyage.ts + weather multiplier). Use it in the renderer to know total turns for the animation.

2. **Should currentTurn advance during the voyage or only on arrival?**
   - What we know: Currently currentTurn does not change during sailing. It only changes for waitForSpring.
   - What's unclear: Whether per-turn advancement during sailing will break other systems (weather recalculation mid-voyage, journal entries).
   - Recommendation: Advance currentTurn per turn during voyage. This is semantically correct (time passes) and enables proper season/weather display per turn. Journal entries already use currentTurn from saved state.

3. **What happens to the existing single-event-per-voyage logic in game.ts?**
   - What we know: Lines 84-126 of game.ts roll one event on SET_SAIL and transition to 'encountered' immediately.
   - What's unclear: Whether to keep this as a "first-turn" event or replace entirely.
   - Recommendation: Replace entirely with the per-turn advanceSailingTurn approach. The SET_SAIL handler should no longer roll events -- it just transitions to sailing state. Events roll on each advanceSailingTurn call.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: ShipMarker.tsx, Shell.tsx, MapArea.tsx, voyage.ts, events.ts, weather.ts, game.ts IPC, state.ts FSM, types.ts
- .planning/research/PITFALLS.md -- Pitfall 3 (leaflet.motion race conditions) directly relevant

### Secondary (MEDIUM confidence)
- Leaflet L.polyline dashArray API -- standard Leaflet feature, well-documented
- Leaflet map.panTo()/flyTo() API -- standard Leaflet feature

### Tertiary (LOW confidence)
- leaflet.motion pause/resume reliability -- library is unmaintained since ~2021; per-segment approach avoids depending on this

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and working in codebase
- Architecture: HIGH - patterns derived from thorough codebase analysis; turn-stepping approach avoids known pitfalls
- Pitfalls: HIGH - documented in existing PITFALLS.md research; race condition pattern well understood

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable -- no external dependency changes expected)

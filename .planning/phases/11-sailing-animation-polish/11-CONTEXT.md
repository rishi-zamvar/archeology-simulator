# Phase 11: Sailing Animation Polish - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode — all decisions at Claude's discretion)

<domain>
## Phase Boundary

Players see their ship physically move between ports on the map during voyages. The sailing animation includes a dashed route line, distance-proportional timing, camera following, a voyage progress overlay, and visible time passage with per-turn events.

Requirements: SAIL-01, SAIL-02, SAIL-03, SAIL-04, SAIL-05

</domain>

<decisions>
## Implementation Decisions

### Route Visualization
- Dashed polyline on the Leaflet map connecting origin and destination ports
- Use L.polyline with dashArray option for parchment-themed dashed line
- Line appears when sailing starts, removed when voyage ends
- Color: sepia tone (#7a5c45) with dashArray "10, 8"

### Animation Timing
- Duration proportional to haversine distance between ports (already computed in voyage.ts)
- Base speed: ~500ms per time unit of ETA (so a 3-turn voyage = ~1.5s, 8-turn = ~4s)
- Minimum 2s, maximum 8s to keep it engaging
- leaflet.motion already handles path animation — just update duration from hardcoded 5s

### Camera Follow
- Map pans to follow ship during animation using flyTo or panTo
- Smooth interpolation, not jarring jumps
- Zoom level stays at current or adjusts to show full route

### Sailing Overlay
- Floating overlay panel during sailing state showing:
  - Route: "Departing {origin} → {destination}"
  - Progress: turn counter / ETA
  - Weather: seasonal description from getSeasonalWeatherDescription()
  - Season badge from weather system
- Positioned top-center or bottom-center, semi-transparent parchment style

### Time Passage
- Each time unit of the voyage fires sequentially during animation
- Per-turn: roll for event (already exists), show weather, advance turn counter
- "Uneventful sailing" message for turns without events
- Events pause animation, resume after resolution

### Claude's Discretion
- Exact overlay layout and positioning
- Whether to add wake/trail effect behind ship
- Animation easing function
- How to handle zoom level during animation
- Whether route line stays visible after arrival or fades

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- ShipMarker.tsx: leaflet.motion polyline animation with SVG boat icon, motion-ended handler
- voyage.ts: haversine distance, getReachablePorts with duration calculations
- weather.ts: getSeason(), getWeatherModifiers(), getSeasonalWeatherDescription()
- MapArea.tsx: MapContainer with port markers and tile layer
- Shell.tsx: sailing state detection, port coordinates map

### Established Patterns
- leaflet.motion L.motion.polyline for path animation
- Inline React styles with CSS custom properties (--parchment-bg, --sepia-text)
- IPC wrapHandler pattern for main process calls
- GameState discriminated union FSM

### Integration Points
- ShipMarker.tsx — evolve from 5s hardcoded to distance-proportional timing
- Shell.tsx — add sailing overlay component, route line rendering
- MapArea.tsx — may need ref or useMap hook for camera control
- game.ts IPC handler — per-turn event rolling during voyage

</code_context>

<specifics>
## Specific Ideas

No specific requirements — autonomous mode.

</specifics>

<deferred>
## Deferred Ideas

None — autonomous mode.

</deferred>

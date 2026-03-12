---
phase: 02-core-loop
plan: 02
subsystem: ui
tags: [react-leaflet, leaflet, leaflet-motion, react-leaflet-cluster, map, sepia, markers, animation]

# Dependency graph
requires:
  - phase: 02-core-loop plan 01
    provides: "window.api.game.getPorts(), getPortDetails(), getReachablePorts() IPC channels; Port type with lat/lng"

provides:
  - Leaflet MapContainer with OpenStreetMap tiles and sepia(60%) parchment CSS filter
  - 25 clickable port markers with Cinzel-font permanent tooltips showing ancient names
  - react-leaflet-cluster MarkerClusterGroup (chunkedLoading, disableClusteringAtZoom=7)
  - useMapPorts hook: loads Port[] via window.api.game.getPorts() on mount
  - PortMarker component: divIcon circle with click handler → uiStore.setSelectedPort + openLeftPanel
  - PortInfoPanel: left-panel content showing port name/description and top-5 nearest reachable destinations with km, days, Sail button
  - ShipMarker: animated ship SVG following leaflet.motion polyline during SailingState
  - uiStore extended with selectedPortId, setSelectedPort, openLeftPanel

affects:
  - 02-03-trade (right panel now exists; Shell reads selectedPortId from uiStore for TradePanel)
  - 02-04-events (SailingState animation already in place for voyage event overlay)

# Tech tracking
tech-stack:
  added:
    - react-leaflet@5.0.0
    - leaflet@1.9.4
    - react-leaflet-cluster@4.0.0
    - leaflet.motion@0.3.2
    - "@types/leaflet (devDependency)"
  patterns:
    - Sepia tile filter — .leaflet-tile { filter: sepia(60%) saturate(80%) brightness(105%) } in global CSS
    - Leaflet imperative API in React — useMap() + useEffect for side-effect layers (ShipMarker)
    - children prop on MapContainer wrapper — passes ShipMarker through MapArea without prop drilling

key-files:
  created:
    - src/renderer/components/MapArea.tsx
    - src/renderer/components/PortMarker.tsx
    - src/renderer/components/PortInfoPanel.tsx
    - src/renderer/components/ShipMarker.tsx
    - src/renderer/hooks/useMapPorts.ts
  modified:
    - src/renderer/stores/uiStore.ts
    - src/renderer/components/Shell.tsx
    - src/renderer/index.css
    - package.json

key-decisions:
  - "react-leaflet-cluster not @react-leaflet/cluster — @react-leaflet/cluster does not exist on npm; correct package is react-leaflet-cluster@4.0.0"
  - "leaflet.motion cast via LeafletWithMotion type alias — no TS bindings available; side-effect import + type cast is the correct pattern"
  - "ShipMarker renders null JSX — purely imperative Leaflet layer via useMap() + useEffect; no React tree nodes needed"
  - "children prop on MapArea — ShipMarker must be inside MapContainer context; children slot avoids re-creating MapContainer on sail state change"
  - "eta: 0 in SET_SAIL dispatch — Shell passes 0 as eta placeholder; actual ETA calculation handled by main process from voyage data"

patterns-established:
  - "Leaflet CSS imported in index.css via @import directives (leaflet/dist/leaflet.css, leaflet.markercluster CSS)"
  - "Port click flow: PortMarker click → onPortClick prop → Shell.handlePortClick → uiStore.setSelectedPort + openLeftPanel"
  - "Stale-response guard: useEffect cancelled flag pattern in useMapPorts, PortInfoPanel (same as useGameState)"

# Metrics
duration: 10min
completed: 2026-03-12
---

# Phase 2 Plan 02: Map, Port Markers, Port Info Panel, Ship Animation Summary

**Leaflet Mediterranean map with sepia parchment tiles, 25 clustered port markers, PortInfoPanel showing reachable destinations, and ShipMarker animation via leaflet.motion during SailingState**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-12T12:36:19Z
- **Completed:** 2026-03-12T12:46:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Replaced MapArea placeholder with live Leaflet map: OpenStreetMap tiles with sepia(60%) filter for parchment aesthetic, centered on Mediterranean (37.5, 20) at zoom 5
- 25 historical port markers rendered via react-leaflet-cluster (chunkedLoading, deduplication at zoom ≤7); each marker shows ancient name in Cinzel-font permanent tooltip; clicking opens left panel
- PortInfoPanel: parallel IPC fetch for port details + reachable destinations; shows top 5 nearest ports with distance in km, voyage duration in days, and Sail button that dispatches SET_SAIL
- ShipMarker uses leaflet.motion polyline to animate ship SVG icon from departure to destination over 30 seconds; renders only during SailingState as a MapContainer child
- All 36 Phase 1 tests still pass; typecheck clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Install react-leaflet, render parchment map with port markers and PortInfoPanel** - `a2679ed` (feat)
2. **Task 2: Ship animation during SailingState and full Shell wiring** - `4c25baa` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/renderer/components/MapArea.tsx` - Leaflet MapContainer with sepia TileLayer, MarkerClusterGroup containing all PortMarkers; children slot for ShipMarker
- `src/renderer/components/PortMarker.tsx` - divIcon circle marker, permanent Cinzel Tooltip, click dispatches to uiStore via prop
- `src/renderer/components/PortInfoPanel.tsx` - Left panel: port name/description, top-5 reachable destinations with km/days/Sail button; parallel IPC fetch with stale-response guard
- `src/renderer/components/ShipMarker.tsx` - Imperative leaflet.motion polyline layer; renders ship SVG icon animated from departure to destination during SailingState
- `src/renderer/hooks/useMapPorts.ts` - Loads Port[] via window.api.game.getPorts() on mount with cancelled flag
- `src/renderer/stores/uiStore.ts` - Added selectedPortId, setSelectedPort, openLeftPanel
- `src/renderer/components/Shell.tsx` - Wires PortInfoPanel into left panel; ShipMarker into MapArea children; builds portCoords Map for ShipMarker
- `src/renderer/index.css` - Leaflet CSS imports, sepia tile filter, port-icon/port-label/cluster styling
- `package.json` - Added react-leaflet, leaflet, react-leaflet-cluster, leaflet.motion, @types/leaflet

## Decisions Made

- **react-leaflet-cluster** — Plan specified `@react-leaflet/cluster` which does not exist on npm; `react-leaflet-cluster@4.0.0` is the correct package for react-leaflet v5 clustering
- **leaflet.motion type cast** — No TypeScript bindings available; used `LeafletWithMotion` type alias (side-effect import + cast) to access `L.motion.polyline` API safely
- **ShipMarker as null-rendering component** — Leaflet layers are imperative; ShipMarker renders `null` JSX and manages the motion layer entirely via `useMap()` + `useEffect`
- **children prop on MapArea** — ShipMarker must run inside MapContainer's React context; passing it as a child of MapArea (not as a sibling) is the correct pattern
- **eta: 0 placeholder** — `SET_SAIL` action requires `eta: number`; Shell passes `0` since actual ETA is computed by the main process from voyage data

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used react-leaflet-cluster instead of @react-leaflet/cluster**
- **Found during:** Task 1 (npm install)
- **Issue:** Plan specified `@react-leaflet/cluster` which returns "NOT FOUND" on npm registry
- **Fix:** Used `react-leaflet-cluster@4.0.0` — the correct and actively maintained package for react-leaflet v4/v5 clustering
- **Files modified:** package.json, package-lock.json
- **Verification:** `npm show react-leaflet-cluster version` returns 4.0.0; imports work, typecheck passes
- **Committed in:** a2679ed (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — wrong package name in plan)
**Impact on plan:** No scope change. react-leaflet-cluster is functionally identical to what the plan intended.

## Issues Encountered

None — other than the wrong npm package name in the plan (auto-fixed).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **02-03 (Trade):** PortInfoPanel's Sail button dispatches SET_SAIL; Shell already has right panel wired for TradePanel (CargoHold and TradePanel components were added by concurrent development); `window.api.game.getMarketPrices(portId)` and `getPlayerInventory()` IPC channels ready
- **02-04 (Events):** ShipMarker animation is in place; SailingState type already has optional `departurePortId`/`route` fields for event overlay positioning

---
*Phase: 02-core-loop*
*Completed: 2026-03-12*

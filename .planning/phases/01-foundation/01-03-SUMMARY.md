---
phase: 01-foundation
plan: 03
subsystem: ui
tags: [tailwindcss, react, zustand, electron, parchment, cinzel, lora, side-panel, accessibility]

# Dependency graph
requires:
  - phase: 01-01
    provides: Electron + React + Vite scaffold, contextBridge window.api, IPCBridge types
provides:
  - Tailwind CSS 4 parchment theme with sepia color palette and period fonts
  - Shell layout component: full-viewport three-column layout (left panel / map / right panel)
  - SidePanel component: collapsible with slide animation and ARIA accessibility
  - MapArea component: parchment-styled placeholder for Phase 2 Leaflet map
  - useGameState hook: memory-leak-safe IPC subscription pattern
  - uiStore: Zustand store for leftPanelOpen, rightPanelOpen, activePanel
affects:
  - 01-02 (game state rendered in panels)
  - 02-map (Leaflet mounts into MapArea)
  - 02-inventory (renders inside left SidePanel)
  - 02-trade (renders inside right SidePanel)

# Tech tracking
tech-stack:
  added:
    - tailwindcss@4.2.1
    - "@tailwindcss/vite@4.2.1"
    - Google Fonts (Cinzel 400/700, Lora 400/600/italic)
  patterns:
    - Zustand store per UI concern (uiStore for panel state)
    - Memory-leak-safe IPC hook: useEffect returns cleanup function from window.api.subscribe
    - Keyboard shortcuts via window.addEventListener('keydown') in Shell useEffect
    - CSS custom properties for parchment palette alongside Tailwind classes
    - Inline styles for dynamic values (transform translateX for panel animation)

key-files:
  created:
    - tailwind.config.ts
    - src/renderer/index.css
    - src/renderer/stores/uiStore.ts
    - src/renderer/hooks/useGameState.ts
    - src/renderer/components/Shell.tsx
    - src/renderer/components/SidePanel.tsx
    - src/renderer/components/MapArea.tsx
    - resources/fonts/README.md
  modified:
    - vite.config.ts (added @tailwindcss/vite plugin)
    - src/renderer/App.tsx (now renders Shell, calls useGameState)
    - src/renderer/index.tsx (imports index.css)
    - package.json (tailwindcss + @tailwindcss/vite devDependencies)

key-decisions:
  - "Tailwind CSS 4 (not v3) — v4 uses @import 'tailwindcss' syntax and Vite plugin, no postcss.config needed"
  - "Inline styles for dynamic transform values — avoids Tailwind JIT purge issues with dynamic class strings like translate-x-[-280px]"
  - "Google Fonts in dev, Phase 3 bundling task — noted in resources/fonts/README.md as open item"
  - "Keyboard shortcuts [ and ] for panel toggle — does not intercept when focus is in input/textarea/select"

patterns-established:
  - "IPC hook pattern: useEffect #1 loads initial state, useEffect #2 subscribes with return cleanup — all IPC hooks follow this structure"
  - "UI store pattern: one Zustand store per UI concern, actions are pure set() mutations"
  - "Side panel pattern: state in uiStore, SidePanel is a dumb presentational component driven by isOpen prop"

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 1 Plan 03: Parchment UI Shell Summary

**Tailwind 4 parchment theme with Cinzel/Lora fonts, three-column Shell layout with collapsible side panels, and memory-leak-safe useGameState IPC hook establishing the renderer architecture pattern**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T14:00:59Z
- **Completed:** 2026-03-12T14:03:59Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Tailwind CSS 4 parchment color palette (9 shades) and sepia tones wired into global CSS with custom properties
- Three-column Shell layout with keyboard-accessible collapsible side panels ([/] shortcuts, aria-expanded, aria-label)
- useGameState hook establishes the canonical IPC subscription pattern — load on mount, subscribe to game:updated, return cleanup on unmount
- Zustand uiStore drives leftPanelOpen/rightPanelOpen state; SidePanel is a pure presentational component
- 36/36 tests passing; zero TypeScript errors after all changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Tailwind parchment theme and period fonts** - `973d210` (feat)
2. **Task 2: Shell layout, side panels, and useGameState hook** - `28bb7c0` (feat)

## Files Created/Modified

- `tailwind.config.ts` - Custom Tailwind theme: parchment color palette, sepia tones, Cinzel/Lora font families
- `src/renderer/index.css` - @import tailwindcss, Google Fonts, base body/focus/selection styles
- `src/renderer/stores/uiStore.ts` - Zustand store: leftPanelOpen, rightPanelOpen, activePanel, toggle actions
- `src/renderer/hooks/useGameState.ts` - IPC hook: load on mount + subscribe cleanup pattern
- `src/renderer/components/Shell.tsx` - Root layout: full-viewport flex row, wired to uiStore, keyboard shortcuts
- `src/renderer/components/SidePanel.tsx` - Collapsible panel: slide animation, aria-expanded, toggle button
- `src/renderer/components/MapArea.tsx` - Parchment placeholder for Leaflet, data-testid="map-area"
- `resources/fonts/README.md` - Documents Phase 3 font-bundling open item
- `vite.config.ts` - Added @tailwindcss/vite to plugins
- `src/renderer/App.tsx` - Now renders Shell; calls useGameState; shows loading/error states
- `src/renderer/index.tsx` - Added import './index.css'

## Decisions Made

- **Tailwind CSS 4 syntax** — v4 uses `@import 'tailwindcss'` not `@tailwind base/components/utilities`, and the Vite plugin replaces the old postcss approach. This avoids a postcss.config.js file entirely.
- **Inline styles for panel slide animation** — Using `transform: translateX(...)` inline avoids Tailwind JIT purging dynamically assembled class strings (e.g. `translate-x-[-280px]`). Static Tailwind classes are used for everything else.
- **Google Fonts in dev, bundle in Phase 3** — Noted as open item in resources/fonts/README.md. Both Cinzel and Lora are OFL-licensed and safe to bundle.
- **[ and ] keyboard shortcuts** — Chosen as unobtrusive, game-feel keys that don't conflict with browser shortcuts. Guarded against input/textarea/select focus.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Shell layout is the stable foundation for all Phase 2 feature panels
- SidePanel children slot accepts any React content — inventory and trade panels mount directly there
- MapArea has `data-testid="map-area"` and a clearly-marked Phase 2 placeholder comment; Leaflet div mounts inside it
- useGameState hook pattern is established — all Phase 2 components that need game state import and use this hook
- Font bundling is deferred to Phase 3 (documented); no blocker for Phase 2

---
*Phase: 01-foundation*
*Completed: 2026-03-12*

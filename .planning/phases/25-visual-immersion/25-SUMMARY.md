---
phase: 25
plan: visual-immersion
subsystem: renderer/visual-effects
tags: [visual, parallax, particles, day-night, fog, vignette]
key-files:
  created:
    - src/renderer/components/ParticleOverlay.tsx
  modified:
    - src/renderer/components/PortScene.tsx
    - src/renderer/components/Shell.tsx
    - src/renderer/components/PortMarker.tsx
    - src/renderer/index.css
decisions:
  - Parallax max shift set to 10px with 0.15s ease-out for subtle smoothness
  - Particle count tuned lower for seagulls (12) vs dust/fireflies (20)
  - Day/night uses turn % 12 months mapped to 4 seasons
  - Fog dissolve uses Leaflet Circle with CSS animation rather than custom canvas
metrics:
  duration: 2m 12s
  completed: 2026-03-31
  tasks: 5
  files: 5
---

# Phase 25: Visual Immersion Summary

Five ambient visual effects layered onto port scenes and map for greater immersion, with zero changes to game logic.

## Completed Tasks

### 1. VIS-01: Parallax Depth on Port Scenes
- Mouse position tracked relative to PortScene container
- Port illustration shifts up to +/-10px on X/Y with 0.15s ease-out transition
- Image container uses `inset: -12px` to prevent edge gaps during parallax shift
- Resets to center on mouse leave
- **Commit:** `15d0d35`

### 2. VIS-02: Ambient Particles per Region
- New `ParticleOverlay` component with CSS-animated divs
- Region mapping: egypt -> tan dust motes (particleDrift), greece -> yellow fireflies (particlePulse), coastal -> white seagull streaks (particleGlide)
- 12-20 particles with randomized positions, delays, sizes, and opacity
- Three new `@keyframes` in index.css
- **Commit:** `15d0d35`

### 3. VIS-03: Day/Night Tinting
- Inline IIFE in Shell.tsx computes tint color from `currentTurn % 12`
- Spring (months 2-4): warm gold `rgba(255, 200, 80, 0.08)`
- Summer (months 5-7): transparent (no overlay)
- Autumn (months 8-10): amber `rgba(200, 120, 50, 0.12)`
- Winter (months 11, 0, 1): blue-grey `rgba(80, 100, 150, 0.15)`
- 1.5s CSS transition for smooth tint changes between turns
- **Commit:** `530c18c`

### 4. VIS-04: Map Fog Dissolve on Port Discovery
- PortMarker tracks previous accessLevel via useRef
- On transition from `unknown` to `discovered`/`unlocked`, renders a Leaflet Circle with `fog-dissolve` CSS class
- Animation: 1.8s opacity fade + blur reduction (4px -> 0)
- Circle auto-removes after 2s timeout
- **Commit:** `50f71e7`

### 5. VIS-05: Vignette Border on Port Scenes
- Radial gradient overlay: transparent center, dark sepia edges
- `pointer-events: none` so it never blocks interaction
- Gradient stops: transparent 55%, rgba(61,43,31,0.25) 80%, rgba(30,20,10,0.55) 100%
- **Commit:** `15d0d35`

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all effects are fully wired with real data sources (region, currentTurn, accessLevel).

## Self-Check: PASSED

- ParticleOverlay.tsx: FOUND
- Commits 15d0d35, 530c18c, 50f71e7: FOUND
- TypeScript: clean (no errors)

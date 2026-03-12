---
phase: 03-port-experience
plan: "06"
subsystem: ui
tags: [web-audio-api, audio, ambient, synthesizer, react-hooks]

requires:
  - phase: 03-port-experience
    provides: Shell.tsx with useAudioManager wired for ambient audio on first interaction

provides:
  - useGeneratedAmbient hook — synthesized Mediterranean soundscape, zero file dependencies
  - Shell.tsx wired to call generatedAmbient.start() on first click instead of fetching missing MP3

affects:
  - Any future audio work referencing Shell.tsx ambient integration
  - Any plan adding real audio assets (can restore useAudioManager alongside this hook)

tech-stack:
  added: []
  patterns:
    - "Module-level singleton pattern for Web Audio API — matches useAudioManager pattern; hook just returns singleton reference"
    - "Recursive scheduler pattern for periodic audio events — setTimeout-based chirp scheduling without leaking references"
    - "visibilitychange handler at module load — auto suspend/resume AudioContext with tab focus"

key-files:
  created:
    - src/renderer/hooks/useGeneratedAmbient.ts
  modified:
    - src/renderer/components/Shell.tsx

key-decisions:
  - "Web Audio synthesis instead of file fetch — /audio/ambient-port.mp3 doesn't exist and prior download attempts failed; synthesis is more reliable and zero-dependency"
  - "useAudioManager preserved unchanged — not removed; remains available for future file-based audio integration"
  - "4-layer soundscape: filtered noise (ocean waves) + LFO modulation, detuned sine oscillators (wind), recursive chirp scheduler (seagulls), master gain with fade-in"
  - "Module-level singleton pattern — mirrors useAudioManager; AudioContext and all nodes persist across React re-renders"

patterns-established:
  - "Synthesized ambient audio: Web Audio API oscillators/noise nodes for zero-dependency ambient sound"

duration: 22min
completed: 2026-03-12
---

# Phase 3 Plan 06: Generated Ambient Soundscape Summary

**Synthesized Mediterranean port ambient audio via Web Audio API — 4-layer noise + oscillator soundscape that requires no file fetch, replacing the missing `/audio/ambient-port.mp3` dependency in Shell.tsx**

## Performance

- **Duration:** 22 min
- **Started:** 2026-03-12T16:01:51Z
- **Completed:** 2026-03-12T16:23:11Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `useGeneratedAmbient` hook that synthesizes a full Mediterranean port soundscape (ocean waves, wind drone, seagull calls) entirely from Web Audio API oscillators and noise nodes — no network requests
- Replaced non-functional `audio.playAmbient('/audio/ambient-port.mp3')` in Shell.tsx with `generatedAmbient.start()` — ambient audio now works on first click
- Audio failures are fully non-fatal: all errors caught inside the hook, never propagated to the component; app never crashes due to audio

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useGeneratedAmbient hook with synthesized soundscape** - `726d2d5` (feat)
2. **Task 2: Update Shell.tsx to use useGeneratedAmbient on first interaction** - `e24461a` (feat)

**Plan metadata:** (pending)

## Files Created/Modified

- `src/renderer/hooks/useGeneratedAmbient.ts` - Web Audio API synthesized ambient soundscape; module-level singleton with `start()` / `suspend()` interface; visibilitychange handler auto-resumes on tab focus
- `src/renderer/components/Shell.tsx` - Import swapped from `useAudioManager` to `useGeneratedAmbient`; `handleFirstInteraction` now calls `generatedAmbient.start()` instead of fetching missing MP3

## Decisions Made

- **Web Audio synthesis instead of file fetch** — `/audio/ambient-port.mp3` does not exist and prior download attempts failed. Web Audio synthesis is more reliable (zero external dependencies) and matches the project's no-external-dependency philosophy.
- **Preserved useAudioManager** — The original hook is not removed; it remains available for future file-based audio integration without requiring additional refactoring.
- **4-layer soundscape design** — Ocean waves (white noise buffer → lowpass filter → LFO modulation), wind drone (55 Hz + 58 Hz detuned oscillators for natural beating), seagull chirps (recursive setTimeout scheduler, 8-15s random interval), master gain with 3-second fade-in.
- **Module-level singleton pattern** — Mirrors the established `useAudioManager` pattern; hook returns singleton reference so AudioContext and all audio nodes persist across React re-renders and component remounts.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors in `ShipMarker.tsx` (MotionLayer `on` signature incompatibility from leaflet.motion untyped library) appeared in `tsc --noEmit` output. These are unrelated to this plan and were present before execution. Confirmed zero new errors introduced by this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Ambient audio is fully functional on first user interaction with no file dependencies
- `useAudioManager` is preserved and can be wired alongside `useGeneratedAmbient` for sound effects in a future phase
- No blockers for future work

---
*Phase: 03-port-experience*
*Completed: 2026-03-12*

/**
 * Sailing utilities — pure functions for animation timing and coordinate interpolation.
 *
 * Phase 11: Per-turn sailing animation support.
 * These functions are used by the frontend to animate ship movement
 * and by the IPC layer to return structured turn results.
 */

import type { VoyageEvent } from '../shared/game-types';
import type { Season } from './weather';

// ── Animation Utilities ─────────────────────────────────────────────────────

const MIN_ANIMATION_MS = 3000;
const MAX_ANIMATION_MS = 10000;
const MS_PER_TURN = 4000;

/**
 * Calculate animation duration in milliseconds proportional to voyage turn count.
 * 4000ms (4s) per turn — each turn is one month of sailing. Voyages are typically
 * 1-2 months, so animations range from 4s to 8s. Clamped to [3000, 10000] ms.
 */
export function calculateAnimationDuration(durationTurns: number): number {
  return Math.min(MAX_ANIMATION_MS, Math.max(MIN_ANIMATION_MS, durationTurns * MS_PER_TURN));
}

/**
 * Linearly interpolate between two [lat, lng] coordinates.
 * t=0 returns start, t=1 returns end, t=0.5 returns midpoint.
 */
export function interpolateLatLng(
  start: [number, number],
  end: [number, number],
  t: number
): [number, number] {
  return [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t,
  ];
}

// ── IPC Contract Type ───────────────────────────────────────────────────────

/**
 * Result returned by the game:advanceSailingTurn IPC handler.
 * Consumed by the renderer to update the sailing overlay and animation.
 */
export interface SailingTurnResult {
  turnNumber: number;        // 1-based current turn in voyage
  totalTurns: number;        // total voyage duration in turns
  event: VoyageEvent | null; // event rolled for this turn (null = uneventful)
  weatherDescription: string;// seasonal weather text
  season: Season;            // current season
  monthName: string;         // Athenian month name
  arrived: boolean;          // true if this was the final turn
}

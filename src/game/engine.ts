/**
 * Game engine — delegates FSM transitions via handleAction.
 *
 * This module is the boundary between IPC handlers and the FSM.
 * Future expansion (turn increment, gold calculation, event triggers)
 * happens here without changing handleAction or the IPC layer.
 *
 * Re-exports voyage and economy utilities so callers can import from one place.
 */

import { handleAction } from './state';
import type { GameState, GameAction, GameResult } from './types';

export { handleAction };

// Re-export voyage and economy utilities
export { haversineDistanceKm, calculateVoyageDuration, getReachablePorts } from './voyage';
export { calculateMarketPrice, advancePortEconomy } from './economy';

/**
 * performAction — apply an action via the FSM and return a GameResult.
 * Catches invalid transition errors and returns success: false.
 */
export function performAction(current: GameState, action: GameAction): GameResult {
  try {
    const next = handleAction(current, action);
    return { success: true, state: next };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, state: current, error: message };
  }
}

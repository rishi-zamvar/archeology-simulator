/**
 * Game domain types — discriminated union FSM states and actions.
 *
 * GameState is a discriminated union: each type member is mutually exclusive.
 * This prevents impossible states at compile time (cannot be 'trading' and
 * 'sailing' simultaneously) and enables exhaustive switch statements.
 */

import type { VoyageRoute, VoyageEvent } from '../shared/game-types';

// ---------- Tutorial ----------

/**
 * TutorialPhase tracks the onboarding progression for new players.
 * Optional on all state variants for backward compatibility with existing saves.
 *
 * Flow: map_intro → port_intro → trade_intro → sailing_intro → completed
 * New games start at map_intro; loaded saves default to completed.
 */
export type TutorialPhase =
  | { type: 'map_intro' }
  | { type: 'port_intro' }
  | { type: 'trade_intro' }
  | { type: 'sailing_intro' }
  | { type: 'completed' };

// ---------- States ----------

export type IdleState = {
  type: 'idle';
  currentTurn: number;
  tutorialPhase?: TutorialPhase;
};

export type TradingState = {
  type: 'trading';
  currentTurn: number;
  selectedPort: string;
  tutorialPhase?: TutorialPhase;
};

export type SailingState = {
  type: 'sailing';
  currentTurn: number;
  destination: string;
  eta: number;
  // Phase 2 additions — optional for backward compat with existing saves/tests
  departurePortId?: string;
  route?: VoyageRoute;
  tutorialPhase?: TutorialPhase;
};

export type EncounteredState = {
  type: 'encountered';
  currentTurn: number;
  eventType: string;
  // Phase 2 addition — optional for backward compat
  event?: VoyageEvent;
  tutorialPhase?: TutorialPhase;
};

export type GameState = IdleState | TradingState | SailingState | EncounteredState;

// ---------- Actions ----------

export type StartTradeAction = {
  type: 'START_TRADE';
  port: string;
};

export type CompleteTradeAction = {
  type: 'COMPLETE_TRADE';
};

export type SetSailAction = {
  type: 'SET_SAIL';
  destination: string;
  eta: number;
};

export type ArriveAction = {
  type: 'ARRIVE';
};

export type EncounterAction = {
  type: 'ENCOUNTER';
  eventType: string;
};

export type ResolveAction = {
  type: 'RESOLVE';
};

export type TutorialSkipAction = {
  type: 'TUTORIAL_SKIP';
};

export type TutorialAdvanceAction = {
  type: 'TUTORIAL_ADVANCE';
};

export type GameAction =
  | StartTradeAction
  | CompleteTradeAction
  | SetSailAction
  | ArriveAction
  | EncounterAction
  | ResolveAction
  | TutorialSkipAction
  | TutorialAdvanceAction;

// ---------- Result ----------

export type GameResult = {
  success: boolean;
  state: GameState;
  error?: string;
};

/**
 * Game domain types — discriminated union FSM states and actions.
 *
 * GameState is a discriminated union: each type member is mutually exclusive.
 * This prevents impossible states at compile time (cannot be 'trading' and
 * 'sailing' simultaneously) and enables exhaustive switch statements.
 */

import type { VoyageRoute, VoyageEvent } from '../shared/game-types';

// ---------- States ----------

export type IdleState = {
  type: 'idle';
  currentTurn: number;
};

export type TradingState = {
  type: 'trading';
  currentTurn: number;
  selectedPort: string;
};

export type SailingState = {
  type: 'sailing';
  currentTurn: number;
  destination: string;
  eta: number;
  // Phase 2 additions — optional for backward compat with existing saves/tests
  departurePortId?: string;
  route?: VoyageRoute;
};

export type EncounteredState = {
  type: 'encountered';
  currentTurn: number;
  eventType: string;
  // Phase 2 addition — optional for backward compat
  event?: VoyageEvent;
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

export type GameAction =
  | StartTradeAction
  | CompleteTradeAction
  | SetSailAction
  | ArriveAction
  | EncounterAction
  | ResolveAction;

// ---------- Result ----------

export type GameResult = {
  success: boolean;
  state: GameState;
  error?: string;
};

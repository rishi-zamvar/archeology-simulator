/**
 * Game FSM — finite state machine for game state transitions.
 *
 * handleAction() is a pure function that takes the current state and an action
 * and returns the next state. Invalid transitions throw a typed error.
 *
 * The exhaustive switch on current.type guarantees TypeScript reports a
 * compile error if a new GameState type is added without adding a handler
 * (via the `never` assertion at the end of each outer switch arm).
 */

import type { GameState, GameAction } from './types';

/**
 * Apply a game action to the current state, returning the next state.
 * Throws Error('Invalid transition: {from} -> {action.type}') for invalid transitions.
 */
export function handleAction(current: GameState, action: GameAction): GameState {
  switch (current.type) {
    case 'idle': {
      switch (action.type) {
        case 'START_TRADE':
          return {
            type: 'trading',
            currentTurn: current.currentTurn,
            selectedPort: action.port,
          };
        case 'SET_SAIL':
          return {
            type: 'sailing',
            currentTurn: current.currentTurn,
            destination: action.destination,
            eta: action.eta,
          };
        default:
          throw new Error(`Invalid transition: idle -> ${action.type}`);
      }
    }

    case 'trading': {
      switch (action.type) {
        case 'COMPLETE_TRADE':
          return {
            type: 'idle',
            currentTurn: current.currentTurn,
          };
        default:
          throw new Error(`Invalid transition: trading -> ${action.type}`);
      }
    }

    case 'sailing': {
      switch (action.type) {
        case 'ARRIVE':
          return {
            type: 'idle',
            currentTurn: current.currentTurn,
          };
        case 'ENCOUNTER':
          return {
            type: 'encountered',
            currentTurn: current.currentTurn,
            eventType: action.eventType,
          };
        default:
          throw new Error(`Invalid transition: sailing -> ${action.type}`);
      }
    }

    case 'encountered': {
      switch (action.type) {
        case 'RESOLVE':
          return {
            type: 'idle',
            currentTurn: current.currentTurn,
          };
        default:
          throw new Error(`Invalid transition: encountered -> ${action.type}`);
      }
    }

    default: {
      // Exhaustiveness check: if a new GameState type is added without a handler,
      // TypeScript will report a compile error here.
      const _exhaustive: never = current;
      throw new Error(`Unhandled state: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

export type { GameState, GameAction } from './types';

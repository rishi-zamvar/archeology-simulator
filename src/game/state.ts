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

import type { GameState, GameAction, TutorialPhase } from './types';

/**
 * Auto-advance tutorial phase based on a game action.
 * Returns the next tutorial phase, or the unchanged phase if no transition applies.
 * Returns undefined if phase is undefined (backward compat).
 */
function autoAdvanceTutorial(
  phase: TutorialPhase | undefined,
  actionType: GameAction['type']
): TutorialPhase | undefined {
  if (!phase || phase.type === 'completed') return phase;
  switch (actionType) {
    case 'START_TRADE':
      if (phase.type === 'map_intro' || phase.type === 'port_intro') {
        return { type: 'trade_intro' };
      }
      break;
    case 'SET_SAIL':
      if (phase.type === 'trade_intro') return { type: 'sailing_intro' };
      if (phase.type === 'sailing_intro') return { type: 'completed' };
      break;
    case 'ARRIVE':
      if (phase.type === 'map_intro') return { type: 'port_intro' };
      break;
  }
  return phase;
}

/**
 * Step tutorial phase forward by one step (used by TUTORIAL_ADVANCE action).
 */
function stepTutorialPhase(phase: TutorialPhase | undefined): TutorialPhase {
  if (!phase) return { type: 'completed' };
  switch (phase.type) {
    case 'map_intro': return { type: 'port_intro' };
    case 'port_intro': return { type: 'trade_intro' };
    case 'trade_intro': return { type: 'sailing_intro' };
    case 'sailing_intro': return { type: 'completed' };
    case 'completed': return { type: 'completed' };
  }
}

/**
 * Apply a game action to the current state, returning the next state.
 * Throws Error('Invalid transition: {from} -> {action.type}') for invalid transitions.
 */
export function handleAction(current: GameState, action: GameAction): GameState {
  // Tutorial-only actions are valid from any game state variant
  if (action.type === 'TUTORIAL_SKIP') {
    return { ...current, tutorialPhase: { type: 'completed' } };
  }
  if (action.type === 'TUTORIAL_ADVANCE') {
    return { ...current, tutorialPhase: stepTutorialPhase(current.tutorialPhase) };
  }

  switch (current.type) {
    case 'idle': {
      switch (action.type) {
        case 'START_TRADE':
          return {
            type: 'trading',
            currentTurn: current.currentTurn,
            selectedPort: action.port,
            tutorialPhase: autoAdvanceTutorial(current.tutorialPhase, action.type),
          };
        case 'SET_SAIL':
          return {
            type: 'sailing',
            currentTurn: current.currentTurn,
            destination: action.destination,
            eta: action.eta,
            tutorialPhase: autoAdvanceTutorial(current.tutorialPhase, action.type),
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
            tutorialPhase: current.tutorialPhase,
          };
        case 'START_TRADE':
          // Allow switching ports while already trading
          return {
            type: 'trading',
            currentTurn: current.currentTurn,
            selectedPort: action.port,
            tutorialPhase: current.tutorialPhase,
          };
        case 'SET_SAIL':
          return {
            type: 'sailing',
            currentTurn: current.currentTurn,
            destination: action.destination,
            eta: action.eta,
            tutorialPhase: autoAdvanceTutorial(current.tutorialPhase, action.type),
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
            tutorialPhase: autoAdvanceTutorial(current.tutorialPhase, action.type),
          };
        case 'ENCOUNTER':
          return {
            type: 'encountered',
            currentTurn: current.currentTurn,
            eventType: action.eventType,
            tutorialPhase: current.tutorialPhase,
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
            tutorialPhase: current.tutorialPhase,
          };
        case 'RESUME_SAILING':
          return {
            type: 'sailing',
            currentTurn: current.currentTurn,
            destination: action.destination,
            eta: action.eta,
            departurePortId: action.departurePortId,
            voyageTurnsTotal: action.voyageTurnsTotal,
            voyageTurnsElapsed: action.voyageTurnsElapsed,
            tutorialPhase: current.tutorialPhase,
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

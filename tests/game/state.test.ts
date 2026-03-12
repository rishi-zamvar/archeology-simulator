/**
 * FSM state machine tests — TDD RED phase
 *
 * Tests valid transitions, invalid transitions throwing typed errors,
 * and exhaustive handling of all state types.
 */

import { describe, it, expect } from 'vitest';
import type { GameState, GameAction } from '../../src/game/types';

describe('handleAction() — FSM valid transitions', () => {
  it('idle + START_TRADE -> trading with selectedPort', async () => {
    const { handleAction } = await import('../../src/game/state');
    const current: GameState = { type: 'idle', currentTurn: 1 };
    const action: GameAction = { type: 'START_TRADE', port: 'Alexandria' };
    const next = handleAction(current, action);
    expect(next).toEqual({ type: 'trading', currentTurn: 1, selectedPort: 'Alexandria' });
  });

  it('trading + COMPLETE_TRADE -> idle', async () => {
    const { handleAction } = await import('../../src/game/state');
    const current: GameState = { type: 'trading', currentTurn: 2, selectedPort: 'Carthage' };
    const action: GameAction = { type: 'COMPLETE_TRADE' };
    const next = handleAction(current, action);
    expect(next).toEqual({ type: 'idle', currentTurn: 2 });
  });

  it('idle + SET_SAIL -> sailing with destination and eta', async () => {
    const { handleAction } = await import('../../src/game/state');
    const current: GameState = { type: 'idle', currentTurn: 5 };
    const action: GameAction = { type: 'SET_SAIL', destination: 'Rome', eta: 3 };
    const next = handleAction(current, action);
    expect(next).toEqual({ type: 'sailing', currentTurn: 5, destination: 'Rome', eta: 3 });
  });

  it('sailing + ARRIVE -> idle', async () => {
    const { handleAction } = await import('../../src/game/state');
    const current: GameState = { type: 'sailing', currentTurn: 5, destination: 'Rome', eta: 0 };
    const action: GameAction = { type: 'ARRIVE' };
    const next = handleAction(current, action);
    expect(next).toEqual({ type: 'idle', currentTurn: 5 });
  });

  it('sailing + ENCOUNTER -> encountered with eventType', async () => {
    const { handleAction } = await import('../../src/game/state');
    const current: GameState = { type: 'sailing', currentTurn: 3, destination: 'Athens', eta: 2 };
    const action: GameAction = { type: 'ENCOUNTER', eventType: 'pirates' };
    const next = handleAction(current, action);
    expect(next).toEqual({ type: 'encountered', currentTurn: 3, eventType: 'pirates' });
  });

  it('encountered + RESOLVE -> idle', async () => {
    const { handleAction } = await import('../../src/game/state');
    const current: GameState = { type: 'encountered', currentTurn: 4, eventType: 'storm' };
    const action: GameAction = { type: 'RESOLVE' };
    const next = handleAction(current, action);
    expect(next).toEqual({ type: 'idle', currentTurn: 4 });
  });
});

describe('handleAction() — FSM invalid transitions throw', () => {
  it('trading + SET_SAIL throws "Invalid transition: trading -> SET_SAIL"', async () => {
    const { handleAction } = await import('../../src/game/state');
    const current: GameState = { type: 'trading', currentTurn: 2, selectedPort: 'Carthage' };
    const action: GameAction = { type: 'SET_SAIL', destination: 'Rome', eta: 3 };
    expect(() => handleAction(current, action)).toThrowError(
      'Invalid transition: trading -> SET_SAIL'
    );
  });

  it('idle + ARRIVE throws "Invalid transition: idle -> ARRIVE"', async () => {
    const { handleAction } = await import('../../src/game/state');
    const current: GameState = { type: 'idle', currentTurn: 1 };
    const action: GameAction = { type: 'ARRIVE' };
    expect(() => handleAction(current, action)).toThrowError(
      'Invalid transition: idle -> ARRIVE'
    );
  });

  it('idle + RESOLVE throws "Invalid transition: idle -> RESOLVE"', async () => {
    const { handleAction } = await import('../../src/game/state');
    const current: GameState = { type: 'idle', currentTurn: 1 };
    const action: GameAction = { type: 'RESOLVE' };
    expect(() => handleAction(current, action)).toThrowError(
      'Invalid transition: idle -> RESOLVE'
    );
  });

  it('sailing + START_TRADE throws "Invalid transition: sailing -> START_TRADE"', async () => {
    const { handleAction } = await import('../../src/game/state');
    const current: GameState = { type: 'sailing', currentTurn: 3, destination: 'Athens', eta: 1 };
    const action: GameAction = { type: 'START_TRADE', port: 'Athens' };
    expect(() => handleAction(current, action)).toThrowError(
      'Invalid transition: sailing -> START_TRADE'
    );
  });

  it('encountered + COMPLETE_TRADE throws "Invalid transition: encountered -> COMPLETE_TRADE"', async () => {
    const { handleAction } = await import('../../src/game/state');
    const current: GameState = { type: 'encountered', currentTurn: 4, eventType: 'storm' };
    const action: GameAction = { type: 'COMPLETE_TRADE' };
    expect(() => handleAction(current, action)).toThrowError(
      'Invalid transition: encountered -> COMPLETE_TRADE'
    );
  });

  it('idle + ENCOUNTER throws "Invalid transition: idle -> ENCOUNTER"', async () => {
    const { handleAction } = await import('../../src/game/state');
    const current: GameState = { type: 'idle', currentTurn: 1 };
    const action: GameAction = { type: 'ENCOUNTER', eventType: 'storm' };
    expect(() => handleAction(current, action)).toThrowError(
      'Invalid transition: idle -> ENCOUNTER'
    );
  });
});

describe('handleAction() — return value immutability', () => {
  it('does not mutate the input state', async () => {
    const { handleAction } = await import('../../src/game/state');
    const current: GameState = { type: 'idle', currentTurn: 1 };
    const frozen = Object.freeze({ ...current });
    const action: GameAction = { type: 'START_TRADE', port: 'Alexandria' };
    const next = handleAction(frozen as GameState, action);
    expect(next).not.toBe(frozen);
    expect(frozen.type).toBe('idle');
  });
});

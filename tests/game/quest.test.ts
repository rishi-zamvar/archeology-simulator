/**
 * Quest engine tests -- QUEST-01/02/03
 *
 * Tests the pure quest engine functions: evaluateObjective,
 * advanceQuest, loadQuestDefinitions.
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateObjective,
  advanceQuest,
  loadQuestDefinitions,
} from '../../src/game/quest';
import type { GameContext } from '../../src/game/dialogue';
import type {
  QuestObjective,
  QuestDefinition,
  QuestProgress,
} from '../../src/shared/game-types';

// -- Helper ------------------------------------------------------------------

function makeContext(overrides: Partial<GameContext> = {}): GameContext {
  return {
    questProgress: new Map(),
    reputation: new Map(),
    visitedPorts: new Set(),
    cargo: [],
    currentTurn: 1,
    season: 'summer',
    currentPortId: null,
    recentTrades: [],
    ...overrides,
  };
}

function makeQuest(overrides: Partial<QuestDefinition> = {}): QuestDefinition {
  return {
    id: 'test_quest',
    name: 'Test Quest',
    description: 'A test quest',
    objectives: [],
    prerequisites: null,
    rewards: [],
    historicalNote: 'Test note',
    ...overrides,
  };
}

function makeProgress(overrides: Partial<QuestProgress> = {}): QuestProgress {
  return {
    questId: 'test_quest',
    status: 'active',
    currentObjective: 0,
    ...overrides,
  };
}

// -- evaluateObjective -------------------------------------------------------

describe('evaluateObjective', () => {
  describe('visit_port', () => {
    const objective: QuestObjective = {
      id: 'obj_visit',
      type: 'visit_port',
      description: 'Visit Tyre',
      portId: 'tyre',
    };

    it('test_givenPortVisited_whenEvaluateVisitPort_thenTrue', () => {
      const ctx = makeContext({ visitedPorts: new Set(['tyre']) });
      expect(evaluateObjective(objective, ctx)).toBe(true);
    });

    it('test_givenPortNotVisited_whenEvaluateVisitPort_thenFalse', () => {
      const ctx = makeContext({ visitedPorts: new Set(['athens']) });
      expect(evaluateObjective(objective, ctx)).toBe(false);
    });
  });

  describe('deliver_cargo', () => {
    const objective: QuestObjective = {
      id: 'obj_deliver',
      type: 'deliver_cargo',
      description: 'Deliver pottery to Tyre',
      portId: 'tyre',
      goodId: 'attic_pottery',
      minQuantity: 5,
    };

    it('test_givenEnoughCargoAtCorrectPort_whenEvaluateDeliverCargo_thenTrue', () => {
      const ctx = makeContext({
        cargo: [{ goodId: 'attic_pottery', quantity: 7 }],
        currentPortId: 'tyre',
      });
      expect(evaluateObjective(objective, ctx)).toBe(true);
    });

    it('test_givenEnoughCargoAtWrongPort_whenEvaluateDeliverCargo_thenFalse', () => {
      const ctx = makeContext({
        cargo: [{ goodId: 'attic_pottery', quantity: 7 }],
        currentPortId: 'athens',
      });
      expect(evaluateObjective(objective, ctx)).toBe(false);
    });

    it('test_givenNotEnoughCargo_whenEvaluateDeliverCargo_thenFalse', () => {
      const ctx = makeContext({
        cargo: [{ goodId: 'attic_pottery', quantity: 2 }],
        currentPortId: 'tyre',
      });
      expect(evaluateObjective(objective, ctx)).toBe(false);
    });
  });

  describe('complete_trade', () => {
    const objective: QuestObjective = {
      id: 'obj_trade',
      type: 'complete_trade',
      description: 'Buy pottery at Athens',
      portId: 'athens',
      goodId: 'attic_pottery',
      action: 'buy',
    };

    it('test_givenMatchingTrade_whenEvaluateCompleteTrade_thenTrue', () => {
      const ctx = makeContext({
        recentTrades: [
          { goodId: 'attic_pottery', portId: 'athens', action: 'buy', quantity: 5 },
        ],
      });
      expect(evaluateObjective(objective, ctx)).toBe(true);
    });

    it('test_givenNoMatchingTrade_whenEvaluateCompleteTrade_thenFalse', () => {
      const ctx = makeContext({
        recentTrades: [
          { goodId: 'wine', portId: 'athens', action: 'buy', quantity: 3 },
        ],
      });
      expect(evaluateObjective(objective, ctx)).toBe(false);
    });

    it('test_givenWrongAction_whenEvaluateCompleteTrade_thenFalse', () => {
      const ctx = makeContext({
        recentTrades: [
          { goodId: 'attic_pottery', portId: 'athens', action: 'sell', quantity: 5 },
        ],
      });
      expect(evaluateObjective(objective, ctx)).toBe(false);
    });
  });

  describe('talk_to_npc', () => {
    const objective: QuestObjective = {
      id: 'obj_talk',
      type: 'talk_to_npc',
      description: 'Talk to Nikias',
      npcId: 'nikias',
    };

    it('test_givenStub_whenEvaluateTalkToNpc_thenFalse', () => {
      const ctx = makeContext();
      expect(evaluateObjective(objective, ctx)).toBe(false);
    });
  });
});

// -- advanceQuest ------------------------------------------------------------

describe('advanceQuest', () => {
  const visitTyre: QuestObjective = {
    id: 'obj_visit_tyre',
    type: 'visit_port',
    description: 'Visit Tyre',
    portId: 'tyre',
  };
  const deliverPottery: QuestObjective = {
    id: 'obj_deliver_pottery',
    type: 'deliver_cargo',
    description: 'Deliver pottery',
    portId: 'tyre',
    goodId: 'attic_pottery',
    minQuantity: 5,
  };

  it('test_givenObjectiveMet_whenAdvanceQuest_thenIncrementsCurrentObjective', () => {
    const quest = makeQuest({ objectives: [visitTyre, deliverPottery] });
    const progress = makeProgress({ currentObjective: 0 });
    const ctx = makeContext({ visitedPorts: new Set(['tyre']) });

    const result = advanceQuest(quest, progress, ctx);
    expect(result.currentObjective).toBe(1);
    expect(result.status).toBe('active');
  });

  it('test_givenLastObjectiveMet_whenAdvanceQuest_thenStatusCompleted', () => {
    const quest = makeQuest({ objectives: [visitTyre] });
    const progress = makeProgress({ currentObjective: 0 });
    const ctx = makeContext({ visitedPorts: new Set(['tyre']) });

    const result = advanceQuest(quest, progress, ctx);
    expect(result.status).toBe('completed');
    expect(result.completedAt).toBeDefined();
  });

  it('test_givenObjectiveNotMet_whenAdvanceQuest_thenUnchanged', () => {
    const quest = makeQuest({ objectives: [visitTyre] });
    const progress = makeProgress({ currentObjective: 0 });
    const ctx = makeContext({ visitedPorts: new Set(['athens']) });

    const result = advanceQuest(quest, progress, ctx);
    expect(result.currentObjective).toBe(0);
    expect(result.status).toBe('active');
  });

  it('test_givenQuestNotActive_whenAdvanceQuest_thenUnchanged', () => {
    const quest = makeQuest({ objectives: [visitTyre] });
    const progress = makeProgress({ status: 'completed', currentObjective: 0 });
    const ctx = makeContext({ visitedPorts: new Set(['tyre']) });

    const result = advanceQuest(quest, progress, ctx);
    expect(result.status).toBe('completed');
    expect(result.currentObjective).toBe(0);
  });
});

// -- loadQuestDefinitions ----------------------------------------------------

describe('loadQuestDefinitions', () => {
  it('test_givenValidData_whenLoadQuestDefinitions_thenReturnsMap', () => {
    const data = {
      quests: [
        makeQuest({ id: 'q1', name: 'Quest 1' }),
        makeQuest({ id: 'q2', name: 'Quest 2' }),
      ],
    };
    const map = loadQuestDefinitions(data);
    expect(map.size).toBe(2);
    expect(map.get('q1')?.name).toBe('Quest 1');
    expect(map.get('q2')?.name).toBe('Quest 2');
  });

  it('test_givenEmptyQuests_whenLoadQuestDefinitions_thenReturnsEmptyMap', () => {
    const data = { quests: [] };
    const map = loadQuestDefinitions(data);
    expect(map.size).toBe(0);
  });
});

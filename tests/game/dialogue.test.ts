/**
 * Dialogue engine tests — NPC-02
 *
 * Tests the pure dialogue engine functions: evaluateCondition,
 * getAvailableChoices, getNextNode, findEntryNode.
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  getAvailableChoices,
  getNextNode,
  findEntryNode,
  GameContext,
} from '../../src/game/dialogue';
import type {
  CompositeCondition,
  DialogueNode,
  DialogueFile,
} from '../../src/shared/game-types';

// ── Helper ───────────────────────────────────────────────────────────────────

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

// ── evaluateCondition ────────────────────────────────────────────────────────

describe('evaluateCondition', () => {
  describe('quest conditions', () => {
    it('test_givenQuestActive_whenCheckActive_thenTrue', () => {
      const ctx = makeContext({ questProgress: new Map([['main_quest', 'active']]) });
      const condition: CompositeCondition = { type: 'quest', id: 'main_quest', status: 'active' };
      expect(evaluateCondition(condition, ctx)).toBe(true);
    });

    it('test_givenQuestActive_whenCheckCompleted_thenFalse', () => {
      const ctx = makeContext({ questProgress: new Map([['main_quest', 'active']]) });
      const condition: CompositeCondition = { type: 'quest', id: 'main_quest', status: 'completed' };
      expect(evaluateCondition(condition, ctx)).toBe(false);
    });

    it('test_givenQuestAbsent_whenCheckNotStarted_thenTrue', () => {
      const ctx = makeContext();
      const condition: CompositeCondition = { type: 'quest', id: 'main_quest', status: 'not_started' };
      expect(evaluateCondition(condition, ctx)).toBe(true);
    });

    it('test_givenQuestAbsent_whenCheckActive_thenFalse', () => {
      const ctx = makeContext();
      const condition: CompositeCondition = { type: 'quest', id: 'main_quest', status: 'active' };
      expect(evaluateCondition(condition, ctx)).toBe(false);
    });
  });

  describe('reputation conditions', () => {
    it('test_givenReputation15_whenMinIs10_thenTrue', () => {
      const ctx = makeContext({ reputation: new Map([['greece', 15]]) });
      const condition: CompositeCondition = { type: 'reputation', region: 'greece', min: 10 };
      expect(evaluateCondition(condition, ctx)).toBe(true);
    });

    it('test_givenReputation5_whenMinIs10_thenFalse', () => {
      const ctx = makeContext({ reputation: new Map([['greece', 5]]) });
      const condition: CompositeCondition = { type: 'reputation', region: 'greece', min: 10 };
      expect(evaluateCondition(condition, ctx)).toBe(false);
    });

    it('test_givenReputation15_whenMaxIs10_thenFalse', () => {
      const ctx = makeContext({ reputation: new Map([['greece', 15]]) });
      const condition: CompositeCondition = { type: 'reputation', region: 'greece', max: 10 };
      expect(evaluateCondition(condition, ctx)).toBe(false);
    });

    it('test_givenReputation5_whenMinMaxBounds_thenTrue', () => {
      const ctx = makeContext({ reputation: new Map([['greece', 5]]) });
      const condition: CompositeCondition = { type: 'reputation', region: 'greece', min: 0, max: 10 };
      expect(evaluateCondition(condition, ctx)).toBe(true);
    });

    it('test_givenMissingRegion_whenMinIs0_thenTrue', () => {
      const ctx = makeContext();
      const condition: CompositeCondition = { type: 'reputation', region: 'greece', min: 0 };
      expect(evaluateCondition(condition, ctx)).toBe(true);
    });
  });

  describe('visited_port conditions', () => {
    it('test_givenPortVisited_whenCheckVisited_thenTrue', () => {
      const ctx = makeContext({ visitedPorts: new Set(['athens']) });
      const condition: CompositeCondition = { type: 'visited_port', portId: 'athens' };
      expect(evaluateCondition(condition, ctx)).toBe(true);
    });

    it('test_givenPortNotVisited_whenCheckVisited_thenFalse', () => {
      const ctx = makeContext();
      const condition: CompositeCondition = { type: 'visited_port', portId: 'athens' };
      expect(evaluateCondition(condition, ctx)).toBe(false);
    });
  });

  describe('has_cargo conditions', () => {
    it('test_givenCargo10_whenMinQuantity5_thenTrue', () => {
      const ctx = makeContext({ cargo: [{ goodId: 'purple_dye', quantity: 10 }] });
      const condition: CompositeCondition = { type: 'has_cargo', goodId: 'purple_dye', minQuantity: 5 };
      expect(evaluateCondition(condition, ctx)).toBe(true);
    });

    it('test_givenCargo2_whenMinQuantity5_thenFalse', () => {
      const ctx = makeContext({ cargo: [{ goodId: 'purple_dye', quantity: 2 }] });
      const condition: CompositeCondition = { type: 'has_cargo', goodId: 'purple_dye', minQuantity: 5 };
      expect(evaluateCondition(condition, ctx)).toBe(false);
    });

    it('test_givenNoCargo_whenCheckHasCargo_thenFalse', () => {
      const ctx = makeContext();
      const condition: CompositeCondition = { type: 'has_cargo', goodId: 'purple_dye' };
      expect(evaluateCondition(condition, ctx)).toBe(false);
    });

    it('test_givenCargo1_whenNoMinQuantity_thenTrueDefaultsTo1', () => {
      const ctx = makeContext({ cargo: [{ goodId: 'wheat', quantity: 1 }] });
      const condition: CompositeCondition = { type: 'has_cargo', goodId: 'wheat' };
      expect(evaluateCondition(condition, ctx)).toBe(true);
    });
  });

  describe('turn_range conditions', () => {
    it('test_givenTurn5_whenMin3Max10_thenTrue', () => {
      const ctx = makeContext({ currentTurn: 5 });
      const condition: CompositeCondition = { type: 'turn_range', min: 3, max: 10 };
      expect(evaluateCondition(condition, ctx)).toBe(true);
    });

    it('test_givenTurn2_whenMin3_thenFalse', () => {
      const ctx = makeContext({ currentTurn: 2 });
      const condition: CompositeCondition = { type: 'turn_range', min: 3 };
      expect(evaluateCondition(condition, ctx)).toBe(false);
    });

    it('test_givenTurn15_whenMax10_thenFalse', () => {
      const ctx = makeContext({ currentTurn: 15 });
      const condition: CompositeCondition = { type: 'turn_range', max: 10 };
      expect(evaluateCondition(condition, ctx)).toBe(false);
    });
  });

  describe('season conditions', () => {
    it('test_givenSummer_whenCheckSummer_thenTrue', () => {
      const ctx = makeContext({ season: 'summer' });
      const condition: CompositeCondition = { type: 'season', season: 'summer' };
      expect(evaluateCondition(condition, ctx)).toBe(true);
    });

    it('test_givenSummer_whenCheckWinter_thenFalse', () => {
      const ctx = makeContext({ season: 'summer' });
      const condition: CompositeCondition = { type: 'season', season: 'winter' };
      expect(evaluateCondition(condition, ctx)).toBe(false);
    });
  });

  describe('composite conditions ($and, $or, $not)', () => {
    it('test_givenBothMet_whenAnd_thenTrue', () => {
      const ctx = makeContext({
        questProgress: new Map([['main_quest', 'active']]),
        reputation: new Map([['greece', 15]]),
      });
      const condition: CompositeCondition = {
        $and: [
          { type: 'quest', id: 'main_quest', status: 'active' },
          { type: 'reputation', region: 'greece', min: 10 },
        ],
      };
      expect(evaluateCondition(condition, ctx)).toBe(true);
    });

    it('test_givenOneFails_whenAnd_thenFalse', () => {
      const ctx = makeContext({
        questProgress: new Map([['main_quest', 'active']]),
        reputation: new Map([['greece', 5]]),
      });
      const condition: CompositeCondition = {
        $and: [
          { type: 'quest', id: 'main_quest', status: 'active' },
          { type: 'reputation', region: 'greece', min: 10 },
        ],
      };
      expect(evaluateCondition(condition, ctx)).toBe(false);
    });

    it('test_givenOneMetOneFails_whenOr_thenTrue', () => {
      const ctx = makeContext({
        visitedPorts: new Set(['athens']),
      });
      const condition: CompositeCondition = {
        $or: [
          { type: 'visited_port', portId: 'athens' },
          { type: 'visited_port', portId: 'sidon' },
        ],
      };
      expect(evaluateCondition(condition, ctx)).toBe(true);
    });

    it('test_givenNoneMet_whenOr_thenFalse', () => {
      const ctx = makeContext();
      const condition: CompositeCondition = {
        $or: [
          { type: 'visited_port', portId: 'athens' },
          { type: 'visited_port', portId: 'sidon' },
        ],
      };
      expect(evaluateCondition(condition, ctx)).toBe(false);
    });

    it('test_givenConditionTrue_whenNot_thenFalse', () => {
      const ctx = makeContext({ visitedPorts: new Set(['athens']) });
      const condition: CompositeCondition = {
        $not: { type: 'visited_port', portId: 'athens' },
      };
      expect(evaluateCondition(condition, ctx)).toBe(false);
    });

    it('test_givenConditionFalse_whenNot_thenTrue', () => {
      const ctx = makeContext();
      const condition: CompositeCondition = {
        $not: { type: 'visited_port', portId: 'athens' },
      };
      expect(evaluateCondition(condition, ctx)).toBe(true);
    });
  });
});

// ── getAvailableChoices ──────────────────────────────────────────────────────

describe('getAvailableChoices', () => {
  it('test_givenMixedConditions_whenGetChoices_thenOnlyMetReturned', () => {
    const ctx = makeContext({ visitedPorts: new Set(['athens']) });
    const node: DialogueNode = {
      id: 'test',
      speaker: 'Test',
      text: 'Hello',
      choices: [
        { text: 'Always available', next: 'a', effects: [] },
        { text: 'Condition met', next: 'b', effects: [], conditions: { type: 'visited_port', portId: 'athens' } },
        { text: 'Condition unmet', next: 'c', effects: [], conditions: { type: 'visited_port', portId: 'sidon' } },
      ],
    };
    const result = getAvailableChoices(node, ctx);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('Always available');
    expect(result[1].text).toBe('Condition met');
  });

  it('test_givenNoConditions_whenGetChoices_thenAllReturned', () => {
    const ctx = makeContext();
    const node: DialogueNode = {
      id: 'test',
      speaker: 'Test',
      text: 'Hello',
      choices: [
        { text: 'Choice A', next: 'a', effects: [] },
        { text: 'Choice B', next: 'b', effects: [] },
      ],
    };
    const result = getAvailableChoices(node, ctx);
    expect(result).toHaveLength(2);
  });

  it('test_givenEmptyChoices_whenGetChoices_thenEmptyArray', () => {
    const ctx = makeContext();
    const node: DialogueNode = {
      id: 'terminal',
      speaker: 'Test',
      text: 'Farewell',
      choices: [],
    };
    const result = getAvailableChoices(node, ctx);
    expect(result).toHaveLength(0);
  });
});

// ── getNextNode ──────────────────────────────────────────────────────────────

describe('getNextNode', () => {
  const nodes: DialogueNode[] = [
    { id: 'greeting', speaker: 'A', text: 'Hi', choices: [] },
    { id: 'farewell', speaker: 'A', text: 'Bye', choices: [] },
  ];

  it('test_givenValidId_whenGetNextNode_thenReturnsNode', () => {
    const result = getNextNode(nodes, 'greeting');
    expect(result).toBeDefined();
    expect(result!.id).toBe('greeting');
  });

  it('test_givenInvalidId_whenGetNextNode_thenReturnsUndefined', () => {
    const result = getNextNode(nodes, 'nonexistent');
    expect(result).toBeUndefined();
  });
});

// ── findEntryNode ────────────────────────────────────────────────────────────

describe('findEntryNode', () => {
  it('test_givenConditionsMet_whenFindEntry_thenReturnsRootNode', () => {
    const ctx = makeContext({ questProgress: new Map([['main_quest', 'active']]) });
    const file: DialogueFile = {
      npc_id: 'test',
      port_id: 'test',
      root_node: 'greeting',
      nodes: [
        {
          id: 'greeting',
          speaker: 'Test',
          text: 'Hello',
          conditions: { type: 'quest', id: 'main_quest', status: 'active' },
          choices: [],
        },
      ],
    };
    const result = findEntryNode(file, ctx);
    expect(result).toBeDefined();
    expect(result!.id).toBe('greeting');
  });

  it('test_givenConditionsFail_whenFindEntry_thenReturnsUndefined', () => {
    const ctx = makeContext();
    const file: DialogueFile = {
      npc_id: 'test',
      port_id: 'test',
      root_node: 'greeting',
      nodes: [
        {
          id: 'greeting',
          speaker: 'Test',
          text: 'Hello',
          conditions: { type: 'quest', id: 'main_quest', status: 'active' },
          choices: [],
        },
      ],
    };
    const result = findEntryNode(file, ctx);
    expect(result).toBeUndefined();
  });

  it('test_givenNoConditions_whenFindEntry_thenReturnsRootNode', () => {
    const ctx = makeContext();
    const file: DialogueFile = {
      npc_id: 'test',
      port_id: 'test',
      root_node: 'greeting',
      nodes: [
        { id: 'greeting', speaker: 'Test', text: 'Hello', choices: [] },
      ],
    };
    const result = findEntryNode(file, ctx);
    expect(result).toBeDefined();
    expect(result!.id).toBe('greeting');
  });

  it('test_givenMissingRootNode_whenFindEntry_thenReturnsUndefined', () => {
    const ctx = makeContext();
    const file: DialogueFile = {
      npc_id: 'test',
      port_id: 'test',
      root_node: 'nonexistent',
      nodes: [
        { id: 'greeting', speaker: 'Test', text: 'Hello', choices: [] },
      ],
    };
    const result = findEntryNode(file, ctx);
    expect(result).toBeUndefined();
  });
});

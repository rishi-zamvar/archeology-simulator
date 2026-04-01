/**
 * Dialogue engine — Pure functions for evaluating dialogue conditions,
 * filtering choices, and navigating dialogue trees.
 *
 * Pure functions only. No side effects, no Node.js/Electron imports.
 * Importable from both main and renderer processes.
 */

import type {
  QuestStatus,
  CompositeCondition,
  DialogueCondition,
  DialogueNode,
  DialogueChoice,
  DialogueFile,
} from '../shared/game-types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface GameContext {
  questProgress: Map<string, QuestStatus>;
  reputation: Map<string, number>;
  visitedPorts: Set<string>;
  cargo: Array<{ goodId: string; quantity: number }>;
  currentTurn: number;
  season: string;
  currentPortId: string | null;
  recentTrades: Array<{ goodId: string; portId: string; action: 'buy' | 'sell'; quantity: number }>;
  npcDialogueState: Map<string, { timesSpoken: number; lastNodeId: string | null }>;
}

// ── Type Guards ──────────────────────────────────────────────────────────────

function isAndCondition(c: CompositeCondition): c is { $and: CompositeCondition[] } {
  return '$and' in c;
}

function isOrCondition(c: CompositeCondition): c is { $or: CompositeCondition[] } {
  return '$or' in c;
}

function isNotCondition(c: CompositeCondition): c is { $not: CompositeCondition } {
  return '$not' in c;
}

// ── Leaf Condition Evaluator ─────────────────────────────────────────────────

function evaluateLeafCondition(condition: DialogueCondition, ctx: GameContext): boolean {
  switch (condition.type) {
    case 'quest': {
      const current = ctx.questProgress.get(condition.id) ?? 'not_started';
      return current === condition.status;
    }
    case 'reputation': {
      const score = ctx.reputation.get(condition.region) ?? 0;
      if (condition.min !== undefined && score < condition.min) return false;
      if (condition.max !== undefined && score > condition.max) return false;
      return true;
    }
    case 'visited_port': {
      return ctx.visitedPorts.has(condition.portId);
    }
    case 'has_cargo': {
      const item = ctx.cargo.find(c => c.goodId === condition.goodId);
      if (!item) return false;
      const minQty = condition.minQuantity ?? 1;
      return item.quantity >= minQty;
    }
    case 'turn_range': {
      if (condition.min !== undefined && ctx.currentTurn < condition.min) return false;
      if (condition.max !== undefined && ctx.currentTurn > condition.max) return false;
      return true;
    }
    case 'season': {
      return ctx.season === condition.season;
    }
    default:
      return false;
  }
}

// ── Public Functions ─────────────────────────────────────────────────────────

/**
 * Evaluate a composite condition against the current game context.
 * Supports AND/OR/NOT composition and all 6 leaf condition types.
 */
export function evaluateCondition(condition: CompositeCondition, ctx: GameContext): boolean {
  if (isAndCondition(condition)) {
    return condition.$and.every(sub => evaluateCondition(sub, ctx));
  }
  if (isOrCondition(condition)) {
    return condition.$or.some(sub => evaluateCondition(sub, ctx));
  }
  if (isNotCondition(condition)) {
    return !evaluateCondition(condition.$not, ctx);
  }
  return evaluateLeafCondition(condition as DialogueCondition, ctx);
}

/**
 * Get available choices for a dialogue node, filtering out choices
 * whose conditions are not met. Unmet conditions mean HIDDEN, not greyed out.
 */
export function getAvailableChoices(node: DialogueNode, ctx: GameContext): DialogueChoice[] {
  return node.choices.filter(choice =>
    !choice.conditions || evaluateCondition(choice.conditions, ctx)
  );
}

/**
 * Find a dialogue node by ID in a list of nodes.
 * Returns undefined if the node is not found.
 */
export function getNextNode(nodes: DialogueNode[], nodeId: string): DialogueNode | undefined {
  return nodes.find(n => n.id === nodeId);
}

/**
 * Find the entry node for a dialogue file.
 * Returns the root node if its conditions are met (or has no conditions).
 * Returns undefined if the root node's conditions fail.
 */
export function findEntryNode(file: DialogueFile, ctx: GameContext): DialogueNode | undefined {
  const rootNode = file.nodes.find(n => n.id === file.root_node);
  if (!rootNode) return undefined;
  if (rootNode.conditions && !evaluateCondition(rootNode.conditions, ctx)) {
    return undefined;
  }
  return rootNode;
}

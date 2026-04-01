/**
 * Quest engine -- Pure functions for evaluating quest objectives
 * and advancing quest progress.
 *
 * Pure functions only. No side effects, no Node.js/Electron imports.
 * Importable from both main and renderer processes.
 */

import type { GameContext } from './dialogue';
import type {
  QuestObjective,
  QuestDefinition,
  QuestProgress,
} from '../shared/game-types';

// -- Public Functions --------------------------------------------------------

/**
 * Evaluate whether a single quest objective is satisfied
 * given the current game context.
 */
export function evaluateObjective(objective: QuestObjective, ctx: GameContext): boolean {
  switch (objective.type) {
    case 'visit_port':
      return ctx.visitedPorts.has(objective.portId!);

    case 'deliver_cargo': {
      if (ctx.currentPortId !== objective.portId) return false;
      const item = ctx.cargo.find(c => c.goodId === objective.goodId);
      if (!item) return false;
      return item.quantity >= (objective.minQuantity ?? 1);
    }

    case 'complete_trade':
      return ctx.recentTrades.some(
        t =>
          t.goodId === objective.goodId &&
          t.portId === objective.portId &&
          (!objective.action || t.action === objective.action),
      );

    case 'talk_to_npc': {
      const npcState = ctx.npcDialogueState.get(objective.npcId!);
      return npcState !== undefined && npcState.timesSpoken > 0;
    }

    case 'complete_quest': {
      const targetQuestStatus = ctx.questProgress.get(objective.questId!);
      return targetQuestStatus === 'completed';
    }

    default:
      return false;
  }
}

/**
 * Attempt to advance a quest by evaluating its current objective.
 * If the objective is met, increment currentObjective.
 * If all objectives are complete, set status to 'completed'.
 * Returns a new QuestProgress (never mutates the input).
 */
export function advanceQuest(
  quest: QuestDefinition,
  progress: QuestProgress,
  ctx: GameContext,
): QuestProgress {
  if (progress.status !== 'active') {
    return progress;
  }

  let current = progress;

  // Loop to advance through multiple consecutively-satisfied objectives
  // in a single call (important for meta-quests like merchants_odyssey
  // where multiple complete_quest objectives may be satisfied at once).
  while (current.status === 'active') {
    const currentObj = quest.objectives[current.currentObjective];
    if (!currentObj || !evaluateObjective(currentObj, ctx)) {
      break;
    }

    const nextObjective = current.currentObjective + 1;

    if (nextObjective >= quest.objectives.length) {
      current = {
        ...current,
        currentObjective: nextObjective,
        status: 'completed',
        completedAt: new Date().toISOString(),
      };
    } else {
      current = {
        ...current,
        currentObjective: nextObjective,
      };
    }
  }

  return current === progress ? progress : current;
}

/**
 * Evaluate all active quests against the current game context,
 * returning updated progress for any that advanced.
 */
export function evaluateActiveQuests(
  definitions: Map<string, QuestDefinition>,
  progressMap: Map<string, QuestProgress>,
  ctx: GameContext,
): Map<string, QuestProgress> {
  const updated = new Map(progressMap);

  for (const [questId, progress] of progressMap) {
    if (progress.status !== 'active') continue;
    const quest = definitions.get(questId);
    if (!quest) continue;

    const newProgress = advanceQuest(quest, progress, ctx);
    if (newProgress !== progress) {
      updated.set(questId, newProgress);
    }
  }

  return updated;
}

/**
 * Parse quest definition JSON data into a lookup map.
 */
export function loadQuestDefinitions(
  questsData: { quests: QuestDefinition[] },
): Map<string, QuestDefinition> {
  const map = new Map<string, QuestDefinition>();
  for (const quest of questsData.quests) {
    map.set(quest.id, quest);
  }
  return map;
}

/**
 * IPC handlers for quest channels.
 *
 * registerQuestIPCHandlers(db) wires:
 *   quest:getActive   — return active quests with their definitions
 *   quest:getAll      — return all quests with progress status
 *
 * evaluateActiveQuests(db) is exported for use by game.ts after
 * trade and arrival actions. It is NOT an IPC handler.
 */

import path from 'path';
import fs from 'fs';
import type Database from 'better-sqlite3';
import { wrapHandler } from '../lib/ipc-wrapper';
import { createLogger } from '../lib/logger';
import { getResourcesBase } from '../lib/paths';
import { insertJournalEntryIfUnderCap } from '../db/queries';
import {
  advanceQuest,
  loadQuestDefinitions,
} from '../../game/quest';
import { buildGameContext } from './dialogue';
import type {
  QuestDefinition,
  QuestProgress,
  QuestStatus,
} from '../../shared/game-types';

const log = createLogger('QuestIPC');

// ── Module-level quest definition cache ──────────────────────────────────────

let questDefinitions: Map<string, QuestDefinition> | null = null;

function getQuestDefinitions(): Map<string, QuestDefinition> {
  if (questDefinitions) return questDefinitions;

  const questsPath = path.join(getResourcesBase(), 'data', 'quests.json');
  if (!fs.existsSync(questsPath)) {
    log.warn('Quests data file not found', { path: questsPath });
    questDefinitions = new Map();
    return questDefinitions;
  }

  try {
    const raw = fs.readFileSync(questsPath, 'utf-8');
    const parsed = JSON.parse(raw) as { quests: QuestDefinition[] };
    questDefinitions = loadQuestDefinitions(parsed);
    log.info('Quest definitions loaded', { count: questDefinitions.size });
  } catch (err) {
    log.warn('Failed to parse quests.json', { error: String(err) });
    questDefinitions = new Map();
  }

  return questDefinitions;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadQuestProgressFromDB(db: Database.Database): Map<string, QuestProgress> {
  const rows = db.prepare('SELECT quest_id, status, current_objective, started_at, completed_at FROM quest_progress').all() as Array<{
    quest_id: string;
    status: string;
    current_objective: number;
    started_at: string | null;
    completed_at: string | null;
  }>;

  const map = new Map<string, QuestProgress>();
  for (const row of rows) {
    map.set(row.quest_id, {
      questId: row.quest_id,
      status: row.status as QuestStatus,
      currentObjective: row.current_objective,
      startedAt: row.started_at ?? undefined,
      completedAt: row.completed_at ?? undefined,
    });
  }
  return map;
}

// ── Evaluate active quests (called by game.ts after trades/arrivals) ────────

/**
 * Evaluate all active quests against the current game context.
 * If any quest advances or completes, update the DB and apply rewards.
 * Returns array of changed QuestProgress entries.
 */
export function evaluateActiveQuests(db: Database.Database): QuestProgress[] {
  const definitions = getQuestDefinitions();
  if (definitions.size === 0) return [];

  const progressMap = loadQuestProgressFromDB(db);
  const ctx = buildGameContext(db);
  const changed: QuestProgress[] = [];

  for (const [questId, progress] of progressMap) {
    if (progress.status !== 'active') continue;
    const quest = definitions.get(questId);
    if (!quest) continue;

    const newProgress = advanceQuest(quest, progress, ctx);
    if (newProgress !== progress) {
      // Progress changed — update DB
      db.prepare(`
        UPDATE quest_progress
        SET status = ?, current_objective = ?, completed_at = ?
        WHERE quest_id = ?
      `).run(newProgress.status, newProgress.currentObjective, newProgress.completedAt ?? null, questId);

      log.info('Quest advanced', {
        questId,
        objective: newProgress.currentObjective,
        status: newProgress.status,
      });

      // Phase 20: Log objective completion to journal
      if (newProgress.currentObjective > progress.currentObjective) {
        const completedObj = quest.objectives[progress.currentObjective];
        if (completedObj) {
          insertJournalEntryIfUnderCap(db, ctx.currentTurn, 'quest',
            `${quest.name}: ${completedObj.description}`,
            { questId, questName: quest.name, milestone: completedObj.description },
            'quest'
          );
        }
      }

      // If quest completed, apply rewards + log completion
      if (newProgress.status === 'completed') {
        insertJournalEntryIfUnderCap(db, ctx.currentTurn, 'quest',
          `${quest.name} Complete`,
          { questId, questName: quest.name, milestone: 'Quest completed' },
          'narrative'
        );
        applyQuestRewards(db, quest, ctx.currentTurn);
      }

      changed.push(newProgress);
    }
  }

  return changed;
}

/**
 * Apply quest rewards: reputation changes, journal entries, gold.
 */
function applyQuestRewards(db: Database.Database, quest: QuestDefinition, currentTurn: number): void {
  for (const reward of quest.rewards) {
    switch (reward.type) {
      case 'reputation_change': {
        const region = reward.region!;
        const delta = reward.delta!;
        db.prepare(`
          INSERT INTO reputation (region, score)
          VALUES (?, ?)
          ON CONFLICT(region) DO UPDATE SET score = score + excluded.score
        `).run(region, delta);
        log.info('Quest reward: reputation', { questId: quest.id, region, delta });
        break;
      }
      case 'journal_entry': {
        insertJournalEntryIfUnderCap(db, currentTurn, 'quest', reward.title!, {
          questId: quest.id,
          questName: quest.name,
          milestone: reward.title!,
        }, 'quest');
        log.info('Quest reward: journal entry', { questId: quest.id, title: reward.title });
        break;
      }
      case 'gold': {
        const amount = reward.amount!;
        db.prepare(`UPDATE player_inventory SET gold = gold + ? WHERE id = 1`).run(amount);
        log.info('Quest reward: gold', { questId: quest.id, amount });
        break;
      }
    }
  }
}

// ── IPC Handler Registration ────────────────────────────────────────────────

export function registerQuestIPCHandlers(db: Database.Database): void {
  /**
   * quest:getActive — return active quests with their definitions.
   */
  wrapHandler('quest:getActive', async () => {
    const definitions = getQuestDefinitions();
    const rows = db.prepare(
      "SELECT quest_id, status, current_objective, started_at, completed_at FROM quest_progress WHERE status = 'active'"
    ).all() as Array<{
      quest_id: string;
      status: string;
      current_objective: number;
      started_at: string | null;
      completed_at: string | null;
    }>;

    const results: Array<{ quest: QuestDefinition; progress: QuestProgress }> = [];
    for (const row of rows) {
      const quest = definitions.get(row.quest_id);
      if (!quest) continue;
      results.push({
        quest,
        progress: {
          questId: row.quest_id,
          status: row.status as QuestStatus,
          currentObjective: row.current_objective,
          startedAt: row.started_at ?? undefined,
          completedAt: row.completed_at ?? undefined,
        },
      });
    }

    return results;
  });

  /**
   * quest:getAll — return all quests with progress status.
   * Quests not yet in quest_progress are included with status 'available'
   * if their prerequisites are met.
   */
  wrapHandler('quest:getAll', async () => {
    const definitions = getQuestDefinitions();
    const progressMap = loadQuestProgressFromDB(db);

    const results: Array<{ quest: QuestDefinition; progress: QuestProgress }> = [];

    for (const [questId, quest] of definitions) {
      const existingProgress = progressMap.get(questId);
      if (existingProgress) {
        results.push({ quest, progress: existingProgress });
      } else {
        // Quest not started — show as available (prerequisites checked by renderer)
        results.push({
          quest,
          progress: {
            questId,
            status: 'available',
            currentObjective: 0,
          },
        });
      }
    }

    return results;
  });
}

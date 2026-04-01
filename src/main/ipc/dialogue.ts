/**
 * IPC handlers for dialogue channels.
 *
 * registerDialogueIPCHandlers(db) wires:
 *   dialogue:getNodes         — return dialogue node + available choices for an NPC
 *   dialogue:advanceNode      — apply choice effects and return the next node
 *   dialogue:getAvailableNpcs — return NPCs available at a given port
 */

import path from 'path';
import fs from 'fs';
import type Database from 'better-sqlite3';
import { app } from 'electron';
import { wrapHandler } from '../lib/ipc-wrapper';
import { createLogger } from '../lib/logger';
import { loadGameState, insertJournalEntry } from '../db/queries';
import { getResourcesBase } from '../lib/paths';
import { getSeason } from '../../game/weather';
import {
  evaluateCondition,
  getAvailableChoices,
  getNextNode,
  findEntryNode,
} from '../../game/dialogue';
import type { GameContext } from '../../game/dialogue';
import type {
  DialogueFile,
  DialogueNode,
  DialogueChoice,
  DialogueEffect,
  QuestStatus,
} from '../../shared/game-types';

const log = createLogger('DialogueIPC');

// ── Module-level dialogue file cache ────────────────────────────────────────

const dialogueCache = new Map<string, DialogueFile>();

function getDialogueDir(): string {
  return path.join(getResourcesBase(), 'data', 'dialogue');
}

function loadAllDialogueFiles(): DialogueFile[] {
  const dir = getDialogueDir();
  if (!fs.existsSync(dir)) {
    log.warn('Dialogue directory not found', { dir });
    return [];
  }

  const files: DialogueFile[] = [];
  for (const filename of fs.readdirSync(dir)) {
    if (!filename.endsWith('.json')) continue;

    // Check cache first
    const cached = dialogueCache.get(filename);
    if (cached) {
      files.push(cached);
      continue;
    }

    try {
      const raw = fs.readFileSync(path.join(dir, filename), 'utf-8');
      const parsed = JSON.parse(raw) as DialogueFile;
      dialogueCache.set(filename, parsed);
      files.push(parsed);
    } catch (err) {
      log.warn('Failed to parse dialogue file', { filename, error: String(err) });
    }
  }
  return files;
}

function findDialogueFileForNpc(npcId: string): DialogueFile | undefined {
  // Check cache first
  for (const cached of dialogueCache.values()) {
    if (cached.npc_id === npcId) return cached;
  }
  // Load all files (populates cache)
  const allFiles = loadAllDialogueFiles();
  return allFiles.find(f => f.npc_id === npcId);
}

function findDialogueFilesForPort(portId: string): DialogueFile[] {
  const allFiles = loadAllDialogueFiles();
  return allFiles.filter(f => f.port_id === portId);
}

// ── Build GameContext from DB ───────────────────────────────────────────────

export function buildGameContext(db: Database.Database): GameContext {
  const state = loadGameState(db);
  const currentTurn = state?.currentTurn ?? 0;
  const { season } = getSeason(currentTurn);

  // Quest progress
  const questProgress = new Map<string, QuestStatus>();
  const questRows = db.prepare('SELECT quest_id, status FROM quest_progress').all() as Array<{ quest_id: string; status: string }>;
  for (const row of questRows) {
    questProgress.set(row.quest_id, row.status as QuestStatus);
  }

  // Reputation
  const reputation = new Map<string, number>();
  const repRows = db.prepare('SELECT region, score FROM reputation').all() as Array<{ region: string; score: number }>;
  for (const row of repRows) {
    reputation.set(row.region, row.score);
  }

  // Visited ports (derived from port_access where discovered = 1)
  const visitedPorts = new Set<string>();
  const portRows = db.prepare('SELECT port_id FROM port_access WHERE discovered = 1').all() as Array<{ port_id: string }>;
  for (const row of portRows) {
    visitedPorts.add(row.port_id);
  }

  // Cargo
  const invRow = db.prepare('SELECT cargo_json FROM player_inventory WHERE id = 1').get() as { cargo_json: string } | undefined;
  const cargo: Array<{ goodId: string; quantity: number }> = [];
  if (invRow?.cargo_json) {
    try {
      const parsed = JSON.parse(invRow.cargo_json) as Array<{ goodId: string; quantity: number }>;
      cargo.push(...parsed);
    } catch {
      // Ignore parse errors
    }
  }

  // Current port ID — derived from game state
  let currentPortId: string | null = null;
  if (state && 'type' in state && state.type === 'trading' && 'selectedPort' in state) {
    currentPortId = (state as { selectedPort?: string }).selectedPort ?? null;
  }

  // Recent trades — last 10 transactions for quest objective evaluation
  const recentTrades: Array<{ goodId: string; portId: string; action: 'buy' | 'sell'; quantity: number }> = [];
  const txRows = db.prepare(
    'SELECT good_id, port_id, action, quantity FROM transaction_history ORDER BY id DESC LIMIT 10'
  ).all() as Array<{ good_id: string; port_id: string; action: string; quantity: number }>;
  for (const row of txRows) {
    recentTrades.push({
      goodId: row.good_id,
      portId: row.port_id,
      action: row.action as 'buy' | 'sell',
      quantity: row.quantity,
    });
  }

  // NPC dialogue state for talk_to_npc quest objective evaluation
  const npcDialogueState = new Map<string, { timesSpoken: number; lastNodeId: string | null }>();
  const npcRows = db.prepare('SELECT npc_id, times_spoken, last_node_id FROM npc_dialogue_state').all() as Array<{ npc_id: string; times_spoken: number; last_node_id: string | null }>;
  for (const row of npcRows) {
    npcDialogueState.set(row.npc_id, { timesSpoken: row.times_spoken, lastNodeId: row.last_node_id });
  }

  return {
    questProgress,
    reputation,
    visitedPorts,
    cargo,
    currentTurn,
    season,
    currentPortId,
    recentTrades,
    npcDialogueState,
  };
}

// ── Apply dialogue effects ──────────────────────────────────────────────────

function applyEffects(db: Database.Database, effects: DialogueEffect[], currentTurn: number): string[] {
  const applied: string[] = [];

  for (const effect of effects) {
    switch (effect.type) {
      case 'quest_update': {
        const questId = effect.questId as string;
        const status = effect.status as string;
        db.prepare(`
          INSERT INTO quest_progress (quest_id, status, current_objective, started_at)
          VALUES (?, ?, 0, datetime('now'))
          ON CONFLICT(quest_id) DO UPDATE SET status = excluded.status
        `).run(questId, status);
        applied.push(`quest_update: ${questId} -> ${status}`);
        break;
      }
      case 'reputation_change': {
        const region = effect.region as string;
        const delta = effect.delta as number;
        db.prepare(`
          INSERT INTO reputation (region, score)
          VALUES (?, ?)
          ON CONFLICT(region) DO UPDATE SET score = score + excluded.score
        `).run(region, delta);
        applied.push(`reputation_change: ${region} ${delta >= 0 ? '+' : ''}${delta}`);
        break;
      }
      case 'journal_entry': {
        const title = effect.title as string;
        const text = effect.text as string;
        insertJournalEntry(db, currentTurn, 'note', title, { text });
        applied.push(`journal_entry: ${title}`);
        break;
      }
      case 'port_unlock': {
        // TODO: Phase 19 — port unlocking via dialogue effects
        applied.push(`port_unlock: stubbed`);
        break;
      }
      case 'trade_offer': {
        // TODO: Phase 15 — trade offers via dialogue effects
        applied.push(`trade_offer: stubbed`);
        break;
      }
    }
  }

  return applied;
}

// ── IPC Handler Registration ────────────────────────────────────────────────

export function registerDialogueIPCHandlers(db: Database.Database): void {
  /**
   * dialogue:getNodes — return dialogue node + available choices for an NPC.
   * Looks up NPC dialogue file, builds GameContext, finds entry node.
   */
  wrapHandler<{ node: DialogueNode; availableChoices: DialogueChoice[]; npcId: string }, [string]>(
    'dialogue:getNodes',
    async (npcId) => {
      const dialogueFile = findDialogueFileForNpc(npcId);
      if (!dialogueFile) {
        throw new Error(`No dialogue file found for NPC: ${npcId}`);
      }

      const ctx = buildGameContext(db);

      // Check if NPC has a last_node_id in npc_dialogue_state
      const npcState = db.prepare('SELECT last_node_id FROM npc_dialogue_state WHERE npc_id = ?').get(npcId) as { last_node_id: string | null } | undefined;

      let node: DialogueNode | undefined;
      if (npcState?.last_node_id) {
        node = getNextNode(dialogueFile.nodes, npcState.last_node_id);
      }

      // Fall back to entry node if no last node or last node not found
      if (!node) {
        node = findEntryNode(dialogueFile, ctx);
      }

      if (!node) {
        throw new Error(`No available dialogue for NPC: ${npcId}`);
      }

      const availableChoices = getAvailableChoices(node, ctx);

      log.info('Dialogue started', { npcId, nodeId: node.id, choiceCount: availableChoices.length });

      return { node, availableChoices, npcId };
    },
    (npcId) => {
      if (!npcId || typeof npcId !== 'string') return 'npcId required';
      return null;
    },
  );

  /**
   * dialogue:advanceNode — apply choice effects and return the next node.
   * Re-filters choices with fresh GameContext to prevent stale condition evaluation.
   */
  wrapHandler<{ node: DialogueNode | null; availableChoices: DialogueChoice[]; effectsApplied: string[] }, [string, string, number]>(
    'dialogue:advanceNode',
    async (npcId, nodeId, choiceIndex) => {
      const dialogueFile = findDialogueFileForNpc(npcId);
      if (!dialogueFile) {
        throw new Error(`No dialogue file found for NPC: ${npcId}`);
      }

      const currentNode = getNextNode(dialogueFile.nodes, nodeId);
      if (!currentNode) {
        throw new Error(`Node not found: ${nodeId}`);
      }

      // Re-filter choices with fresh GameContext (Pitfall 2)
      const ctx = buildGameContext(db);
      const availableChoices = getAvailableChoices(currentNode, ctx);

      if (choiceIndex < 0 || choiceIndex >= availableChoices.length) {
        throw new Error(`Invalid choice index: ${choiceIndex} (${availableChoices.length} choices available)`);
      }

      const selectedChoice = availableChoices[choiceIndex];

      // Apply effects
      const effectsApplied = applyEffects(db, selectedChoice.effects, ctx.currentTurn);

      // Update npc_dialogue_state
      db.prepare(`
        INSERT INTO npc_dialogue_state (npc_id, last_node_id, times_spoken, last_spoken_turn)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(npc_id) DO UPDATE SET
          last_node_id = excluded.last_node_id,
          times_spoken = times_spoken + 1,
          last_spoken_turn = excluded.last_spoken_turn
      `).run(npcId, selectedChoice.next, ctx.currentTurn);

      // Rebuild GameContext after effects
      const freshCtx = buildGameContext(db);

      // Get next node
      const nextNode = getNextNode(dialogueFile.nodes, selectedChoice.next);
      const nextChoices = nextNode ? getAvailableChoices(nextNode, freshCtx) : [];

      log.info('Dialogue advanced', {
        npcId,
        fromNode: nodeId,
        toNode: selectedChoice.next,
        effectCount: effectsApplied.length,
      });

      return {
        node: nextNode ?? null,
        availableChoices: nextChoices,
        effectsApplied,
      };
    },
    (npcId, nodeId, choiceIndex) => {
      if (!npcId || typeof npcId !== 'string') return 'npcId required';
      if (!nodeId || typeof nodeId !== 'string') return 'nodeId required';
      if (typeof choiceIndex !== 'number') return 'choiceIndex required';
      return null;
    },
  );

  /**
   * dialogue:getAvailableNpcs — return NPCs available at a given port.
   * Scans dialogue files for matching port_id, checks entry conditions.
   */
  wrapHandler<Array<{ npcId: string; name: string }>, [string]>(
    'dialogue:getAvailableNpcs',
    async (portId) => {
      const portFiles = findDialogueFilesForPort(portId);
      if (portFiles.length === 0) return [];

      const ctx = buildGameContext(db);
      const available: Array<{ npcId: string; name: string }> = [];

      for (const file of portFiles) {
        const entryNode = findEntryNode(file, ctx);
        if (entryNode) {
          available.push({
            npcId: file.npc_id,
            name: entryNode.speaker,
          });
        }
      }

      log.info('Available NPCs queried', { portId, count: available.length });

      return available;
    },
    (portId) => {
      if (!portId || typeof portId !== 'string') return 'portId required';
      return null;
    },
  );
}

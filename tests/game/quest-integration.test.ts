/**
 * Quest integration tests -- QUEST-01/02/03
 *
 * Tests the full quest lifecycle using an in-memory SQLite database,
 * verifying that evaluateActiveQuests correctly advances quests through
 * objectives and applies rewards on completion.
 */

import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Database } from 'better-sqlite3';

// Mock Electron's app before importing modules that depend on it
vi.mock('electron', () => ({
  app: {
    getAppPath: () => path.resolve(__dirname, '../../'),
  },
}));

import { evaluateActiveQuests } from '../../src/main/ipc/quest';
import { initializeDatabase } from '../../src/main/db/schema';
import { seedPorts, seedGoods, seedPortInventory } from '../../src/main/db/queries';

let db: Database;

// ── Helpers ──────────────────────────────────────────────────────────────────

function activateQuest(database: Database, questId: string): void {
  database.prepare(`
    INSERT INTO quest_progress (quest_id, status, current_objective, started_at)
    VALUES (?, 'active', 0, datetime('now'))
  `).run(questId);
}

function setCurrentPort(database: Database, portId: string): void {
  const state = { type: 'trading', selectedPort: portId, currentTurn: 1 };
  database.prepare(`
    INSERT INTO game_state (id, state_json) VALUES (1, ?)
    ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json
  `).run(JSON.stringify(state));
}

function addCargo(database: Database, goodId: string, qty: number): void {
  const invRow = database.prepare('SELECT cargo_json FROM player_inventory WHERE id = 1').get() as { cargo_json: string } | undefined;
  const cargo = invRow ? JSON.parse(invRow.cargo_json) as Array<{ goodId: string; quantity: number }> : [];
  const existing = cargo.find((c: { goodId: string }) => c.goodId === goodId);
  if (existing) {
    existing.quantity += qty;
  } else {
    cargo.push({ goodId, quantity: qty, boughtAtPrice: 100, boughtAtPort: 'test', boughtAtTurn: 1 });
  }
  database.prepare('UPDATE player_inventory SET cargo_json = ? WHERE id = 1').run(JSON.stringify(cargo));
}

function addTrade(database: Database, portId: string, goodId: string, action: 'buy' | 'sell', qty: number): void {
  database.prepare(`
    INSERT INTO transaction_history (turn, port_id, good_id, action, quantity, price_per_unit, total_value)
    VALUES (1, ?, ?, ?, ?, 100, ?)
  `).run(portId, goodId, action, qty, qty * 100);
}

function getQuestProgress(database: Database, questId: string): { status: string; current_objective: number; completed_at: string | null } | undefined {
  return database.prepare('SELECT status, current_objective, completed_at FROM quest_progress WHERE quest_id = ?').get(questId) as { status: string; current_objective: number; completed_at: string | null } | undefined;
}

// ── Setup ────────────────────────────────────────────────────────────────────

describe('Quest Integration: evaluateActiveQuests', () => {
  beforeEach(() => {
    db = initializeDatabase(':memory:');
    seedPorts(db);
    seedGoods(db);
    seedPortInventory(db);

    // Seed player inventory
    db.prepare(`
      INSERT OR IGNORE INTO player_inventory (id, gold, cargo_capacity, cargo_json)
      VALUES (1, 1000, 50, '[]')
    `).run();
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  // ── Tyrian Commission Lifecycle ──────────────────────────────────────────

  it('test_givenQuestActivated_whenBuyPotteryAtAthens_thenObjectiveAdvancesTo1', () => {
    activateQuest(db, 'tyrian_commission');
    setCurrentPort(db, 'athens');
    addTrade(db, 'athens', 'attic_pottery', 'buy', 5);

    const changed = evaluateActiveQuests(db);

    expect(changed.length).toBe(1);
    const progress = getQuestProgress(db, 'tyrian_commission');
    expect(progress).toBeDefined();
    expect(progress!.current_objective).toBe(1);
    expect(progress!.status).toBe('active');
  });

  it('test_givenQuestAtObjective1_whenDeliverPotteryToTyre_thenObjectiveAdvancesTo2', () => {
    activateQuest(db, 'tyrian_commission');
    // Advance to objective 1 manually
    db.prepare('UPDATE quest_progress SET current_objective = 1 WHERE quest_id = ?').run('tyrian_commission');

    setCurrentPort(db, 'tyre');
    addCargo(db, 'attic_pottery', 5);

    const changed = evaluateActiveQuests(db);

    expect(changed.length).toBe(1);
    const progress = getQuestProgress(db, 'tyrian_commission');
    expect(progress).toBeDefined();
    expect(progress!.current_objective).toBe(2);
    expect(progress!.status).toBe('active');
  });

  it('test_givenQuestAtObjective2_whenBuyPurpleDyeAtTyre_thenObjectiveAdvancesTo3', () => {
    activateQuest(db, 'tyrian_commission');
    db.prepare('UPDATE quest_progress SET current_objective = 2 WHERE quest_id = ?').run('tyrian_commission');

    setCurrentPort(db, 'tyre');
    addTrade(db, 'tyre', 'purple_dye', 'buy', 3);

    const changed = evaluateActiveQuests(db);

    expect(changed.length).toBe(1);
    const progress = getQuestProgress(db, 'tyrian_commission');
    expect(progress).toBeDefined();
    expect(progress!.current_objective).toBe(3);
    expect(progress!.status).toBe('active');
  });

  it('test_givenQuestAtFinalObjective_whenDeliverPurpleDyeToAthens_thenQuestCompleted', () => {
    activateQuest(db, 'tyrian_commission');
    db.prepare('UPDATE quest_progress SET current_objective = 3 WHERE quest_id = ?').run('tyrian_commission');

    setCurrentPort(db, 'athens');
    addCargo(db, 'purple_dye', 3);

    const changed = evaluateActiveQuests(db);

    expect(changed.length).toBe(1);
    const progress = getQuestProgress(db, 'tyrian_commission');
    expect(progress).toBeDefined();
    expect(progress!.status).toBe('completed');
    expect(progress!.current_objective).toBe(4);
    expect(progress!.completed_at).not.toBeNull();
  });

  it('test_givenQuestCompleted_thenReputationAndJournalRewardsApplied', () => {
    activateQuest(db, 'tyrian_commission');
    db.prepare('UPDATE quest_progress SET current_objective = 3 WHERE quest_id = ?').run('tyrian_commission');

    setCurrentPort(db, 'athens');
    addCargo(db, 'purple_dye', 3);

    evaluateActiveQuests(db);

    // Verify reputation reward
    const repRow = db.prepare('SELECT score FROM reputation WHERE region = ?').get('greece') as { score: number } | undefined;
    expect(repRow).toBeDefined();
    expect(repRow!.score).toBe(10);

    // Verify journal entry reward
    const journalRow = db.prepare("SELECT title FROM journal_entries WHERE title = ?").get('The Tyrian Commission Complete') as { title: string } | undefined;
    expect(journalRow).toBeDefined();
  });

  // ── Edge Cases ───────────────────────────────────────────────────────────

  it('test_givenNoActiveQuests_whenEvaluate_thenNoErrorsAndNoChanges', () => {
    setCurrentPort(db, 'athens');

    const changed = evaluateActiveQuests(db);

    expect(changed.length).toBe(0);
  });

  it('test_givenQuestNotActive_whenEvaluate_thenQuestDoesNotAdvance', () => {
    // Insert a completed quest
    db.prepare(`
      INSERT INTO quest_progress (quest_id, status, current_objective, completed_at)
      VALUES ('tyrian_commission', 'completed', 4, datetime('now'))
    `).run();

    setCurrentPort(db, 'athens');
    addTrade(db, 'athens', 'attic_pottery', 'buy', 5);

    const changed = evaluateActiveQuests(db);

    expect(changed.length).toBe(0);
  });
});

/**
 * Trade goods tests — verifies new historically significant goods are seeded
 * with correct regional supply/demand patterns for all 25 ports.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';

let db: Database;

describe('Trade goods seeding', () => {
  beforeEach(async () => {
    const { initializeDatabase } = await import('../../src/main/db/schema');
    const { seedPorts, seedGoods, seedPortInventory } = await import('../../src/main/db/queries');
    db = initializeDatabase(':memory:');
    seedPorts(db);
    seedGoods(db);
    seedPortInventory(db);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('has at least 15 trade goods', () => {
    const row = db.prepare('SELECT COUNT(*) as count FROM goods').get() as { count: number };
    expect(row.count).toBeGreaterThanOrEqual(15);
  });

  it('papyrus supply highest in Egypt', () => {
    const rows = db.prepare(
      `SELECT port_id, supply FROM port_inventory WHERE good_id = 'papyrus' AND port_id IN ('alexandria', 'naukratis', 'memphis')`
    ).all() as Array<{ port_id: string; supply: number }>;

    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.supply).toBeGreaterThanOrEqual(10);
    }
  });

  it('silver supply highest in Iberia and Athens', () => {
    const iberiaRows = db.prepare(
      `SELECT port_id, supply FROM port_inventory WHERE good_id = 'silver' AND port_id IN ('gadir', 'emporion')`
    ).all() as Array<{ port_id: string; supply: number }>;

    for (const row of iberiaRows) {
      expect(row.supply).toBeGreaterThanOrEqual(8);
    }

    const athensRow = db.prepare(
      `SELECT supply FROM port_inventory WHERE good_id = 'silver' AND port_id = 'athens'`
    ).get() as { supply: number };
    expect(athensRow.supply).toBeGreaterThanOrEqual(6);
  });

  it('all 25 ports have inventory for all new goods', () => {
    const portCount = db.prepare(
      'SELECT COUNT(DISTINCT port_id) as count FROM port_inventory'
    ).get() as { count: number };
    expect(portCount.count).toBe(25);

    const newGoods = ['papyrus', 'silver', 'glass', 'garum', 'silphium'];
    for (const id of newGoods) {
      const row = db.prepare(
        'SELECT COUNT(*) as count FROM port_inventory WHERE good_id = ?'
      ).get(id) as { count: number };
      expect(row.count).toBe(25);
    }
  });

  it('silphium supply concentrated near Cyrenaica', () => {
    const leptisRow = db.prepare(
      `SELECT supply FROM port_inventory WHERE good_id = 'silphium' AND port_id = 'leptis'`
    ).get() as { supply: number };
    expect(leptisRow.supply).toBeGreaterThanOrEqual(6);

    // Most other ports should have supply <= 2
    const otherRows = db.prepare(
      `SELECT port_id, supply FROM port_inventory WHERE good_id = 'silphium' AND port_id != 'leptis' AND port_id != 'carthage'`
    ).all() as Array<{ port_id: string; supply: number }>;

    for (const row of otherRows) {
      expect(row.supply).toBeLessThanOrEqual(2);
    }
  });

  it('glass supply highest in Phoenician ports', () => {
    const rows = db.prepare(
      `SELECT port_id, supply FROM port_inventory WHERE good_id = 'glass' AND port_id IN ('tyre', 'sidon', 'byblos')`
    ).all() as Array<{ port_id: string; supply: number }>;

    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.supply).toBeGreaterThanOrEqual(8);
    }
  });

  it('garum supply highest in Iberia', () => {
    const rows = db.prepare(
      `SELECT port_id, supply FROM port_inventory WHERE good_id = 'garum' AND port_id IN ('gadir', 'emporion')`
    ).all() as Array<{ port_id: string; supply: number }>;

    for (const row of rows) {
      expect(row.supply).toBeGreaterThanOrEqual(8);
    }
  });
});

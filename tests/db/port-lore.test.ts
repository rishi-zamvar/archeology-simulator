/**
 * Port lore and ambient description tests.
 *
 * Verifies that:
 * - seedPortLore populates lore for all 25 ports with cited sources
 * - getPortLore returns parsed data with correct types
 * - seedPorts backfills ambient_description for all 25 ports
 * - Port count matches expected 25
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';

let db: Database;

describe('Port lore and ambient descriptions', () => {
  beforeEach(async () => {
    const { initializeDatabase } = await import('../../src/main/db/schema');
    const { seedPorts, seedGoods, seedPortLore } = await import('../../src/main/db/queries');
    db = initializeDatabase(':memory:');
    seedGoods(db);
    seedPorts(db);
    seedPortLore(db);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('seeds lore for all 25 ports', () => {
    const row = db.prepare('SELECT COUNT(*) as count FROM port_lore').get() as { count: number };
    expect(row.count).toBe(25);
  });

  it('getPortLore returns parsed lore with sources', async () => {
    const { getPortLore } = await import('../../src/main/db/queries');
    const lore = getPortLore(db, 'athens');
    expect(lore).not.toBeNull();
    expect(lore!.history).toBeTruthy();
    expect(typeof lore!.history).toBe('string');
    expect(lore!.primarySources).toBeInstanceOf(Array);
    expect(lore!.primarySources.length).toBeGreaterThan(0);
    expect(lore!.historicalPeriod).toBe('circa 540-530 BCE');
  });

  it('ambient descriptions seeded for all ports', () => {
    const row = db.prepare('SELECT COUNT(*) as count FROM ports WHERE ambient_description IS NOT NULL').get() as { count: number };
    expect(row.count).toBe(25);
  });

  it('port count is at least 25', () => {
    const row = db.prepare('SELECT COUNT(*) as count FROM ports').get() as { count: number };
    expect(row.count).toBeGreaterThanOrEqual(25);
  });

  it('every port lore has at least one primary source', () => {
    const rows = db.prepare('SELECT port_id, primary_sources_json FROM port_lore').all() as Array<{
      port_id: string;
      primary_sources_json: string;
    }>;
    expect(rows.length).toBe(25);
    for (const row of rows) {
      const sources = JSON.parse(row.primary_sources_json) as string[];
      expect(sources.length, `Port ${row.port_id} should have at least 1 primary source`).toBeGreaterThanOrEqual(1);
    }
  });
});

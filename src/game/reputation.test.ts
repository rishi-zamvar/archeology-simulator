/**
 * Reputation logic tests -- REP-01/02/03
 *
 * Tests the pure reputation functions: tier calculation, price modifiers,
 * trade reputation gain, and price application.
 */

import { describe, it, expect } from 'vitest';
import {
  getReputationTier,
  getReputationPriceModifier,
  getTradeReputationGain,
  applyReputationToPrice,
  REPUTATION_TIERS,
} from './reputation';

// ── Tier Calculation ────────────────────────────────────────────────────────

describe('getReputationTier', () => {
  it('returns Stranger for score 0', () => {
    expect(getReputationTier(0)).toEqual({ name: 'Stranger', level: 0 });
  });

  it('returns Stranger for score 19 (just below Known Trader)', () => {
    expect(getReputationTier(19)).toEqual({ name: 'Stranger', level: 0 });
  });

  it('returns Known Trader for score 20', () => {
    expect(getReputationTier(20)).toEqual({ name: 'Known Trader', level: 1 });
  });

  it('returns Known Trader for score 49', () => {
    expect(getReputationTier(49)).toEqual({ name: 'Known Trader', level: 1 });
  });

  it('returns Trusted Partner for score 50', () => {
    expect(getReputationTier(50)).toEqual({ name: 'Trusted Partner', level: 2 });
  });

  it('returns Trusted Partner for score 79', () => {
    expect(getReputationTier(79)).toEqual({ name: 'Trusted Partner', level: 2 });
  });

  it('returns Proxenos for score 80', () => {
    expect(getReputationTier(80)).toEqual({ name: 'Proxenos', level: 3 });
  });

  it('returns Proxenos for score 150 (no upper bound)', () => {
    expect(getReputationTier(150)).toEqual({ name: 'Proxenos', level: 3 });
  });

  it('returns Stranger for negative score (clamped to 0)', () => {
    expect(getReputationTier(-5)).toEqual({ name: 'Stranger', level: 0 });
  });
});

// ── Price Modifier ──────────────────────────────────────────────────────────

describe('getReputationPriceModifier', () => {
  it('returns 0 for Stranger (tier level 0)', () => {
    expect(getReputationPriceModifier(0)).toBe(0);
  });

  it('returns 0.05 for Known Trader (tier level 1)', () => {
    expect(getReputationPriceModifier(1)).toBe(0.05);
  });

  it('returns 0.10 for Trusted Partner (tier level 2)', () => {
    expect(getReputationPriceModifier(2)).toBe(0.10);
  });

  it('returns 0.20 for Proxenos (tier level 3)', () => {
    expect(getReputationPriceModifier(3)).toBe(0.20);
  });
});

// ── Trade Reputation Gain ───────────────────────────────────────────────────

describe('getTradeReputationGain', () => {
  it('returns 1 for small trade (100g)', () => {
    expect(getTradeReputationGain(100)).toBe(1);
  });

  it('returns 2 for medium trade (500g)', () => {
    expect(getTradeReputationGain(500)).toBe(2);
  });

  it('returns 3 for large trade (1000g, capped)', () => {
    expect(getTradeReputationGain(1000)).toBe(3);
  });
});

// ── Apply Reputation to Price ───────────────────────────────────────────────

describe('applyReputationToPrice', () => {
  it('applies 10% discount on buy (100g -> 90g)', () => {
    expect(applyReputationToPrice(100, 0.10)).toBe(90);
  });

  it('applies 10% bonus on sell (100g -> 110g)', () => {
    expect(applyReputationToPrice(100, 0.10, 'sell')).toBe(110);
  });

  it('floors buy price at 1g minimum', () => {
    expect(applyReputationToPrice(1, 0.20)).toBe(1);
  });

  it('sell price rounds correctly for small values', () => {
    expect(applyReputationToPrice(2, 0.20, 'sell')).toBe(2);
  });
});

// ── REPUTATION_TIERS Export ─────────────────────────────────────────────────

describe('REPUTATION_TIERS', () => {
  it('is exported as a readonly array with 4 tiers', () => {
    expect(REPUTATION_TIERS).toHaveLength(4);
    expect(REPUTATION_TIERS[0]).toEqual({ name: 'Stranger', minScore: 0, priceModifier: 0 });
    expect(REPUTATION_TIERS[1]).toEqual({ name: 'Known Trader', minScore: 20, priceModifier: 0.05 });
    expect(REPUTATION_TIERS[2]).toEqual({ name: 'Trusted Partner', minScore: 50, priceModifier: 0.10 });
    expect(REPUTATION_TIERS[3]).toEqual({ name: 'Proxenos', minScore: 80, priceModifier: 0.20 });
  });
});

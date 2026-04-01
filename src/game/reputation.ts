/**
 * Reputation logic -- REP-01/02/03
 *
 * Pure functions for reputation tier calculation, price modifiers,
 * and trade reputation gain. No DB dependency -- importable from
 * both main and renderer processes.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ReputationTier {
  readonly name: string;
  readonly minScore: number;
  readonly priceModifier: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const REPUTATION_TIERS: readonly ReputationTier[] = [
  { name: 'Stranger', minScore: 0, priceModifier: 0 },
  { name: 'Known Trader', minScore: 20, priceModifier: 0.05 },
  { name: 'Trusted Partner', minScore: 50, priceModifier: 0.10 },
  { name: 'Proxenos', minScore: 80, priceModifier: 0.20 },
] as const;

// ── Functions ────────────────────────────────────────────────────────────────

/**
 * Determine the reputation tier for a given score.
 * Clamps negative scores to 0. Returns the highest tier where score >= minScore.
 */
export function getReputationTier(score: number): { name: string; level: number } {
  const clamped = Math.max(0, score);
  let level = 0;
  for (let i = REPUTATION_TIERS.length - 1; i >= 0; i--) {
    if (clamped >= REPUTATION_TIERS[i].minScore) {
      level = i;
      break;
    }
  }
  return { name: REPUTATION_TIERS[level].name, level };
}

/**
 * Get the price modifier for a given tier level (0-3).
 * Clamps to valid range.
 */
export function getReputationPriceModifier(tierLevel: number): number {
  const clamped = Math.max(0, Math.min(REPUTATION_TIERS.length - 1, tierLevel));
  return REPUTATION_TIERS[clamped].priceModifier;
}

/**
 * Calculate reputation points gained from a trade.
 * Minimum 1 point per trade (REP-03 recovery path), max 3.
 */
export function getTradeReputationGain(totalValue: number): number {
  return Math.min(3, Math.max(1, Math.floor(totalValue / 250)));
}

/**
 * Apply a reputation modifier to a price.
 * Buy: discount (lower price). Sell: bonus (higher price).
 * Floor at 1g minimum per REP-02.
 */
export function applyReputationToPrice(
  basePrice: number,
  modifier: number,
  action: 'buy' | 'sell' = 'buy'
): number {
  if (action === 'sell') {
    return Math.max(1, Math.round(basePrice * (1 + modifier)));
  }
  return Math.max(1, Math.round(basePrice * (1 - modifier)));
}

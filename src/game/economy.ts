/**
 * Economy simulation — supply/demand price calculation and port economy advance.
 *
 * calculateMarketPrice: applies supply/demand delta with elasticity, capped ±50%.
 * advancePortEconomy: recalculates prices for all goods at a port for one turn.
 *
 * Formula: basePrice × (1 + (demand - supply) × elasticity)
 * Cap: price cannot fall below 50% or rise above 150% of base price.
 */

import type { MarketGood } from '../shared/game-types';

/**
 * Calculate the current market price for a good given supply, demand, and elasticity.
 *
 * @param basePrice  - Base price of the good in denarii
 * @param supply     - Units supplied per turn at this port
 * @param demand     - Units demanded per turn at this port
 * @param elasticity - Price sensitivity to supply/demand delta (default 0.02)
 * @returns Calculated price rounded to nearest integer, capped ±50% of base
 */
export function calculateMarketPrice(
  basePrice: number,
  supply: number,
  demand: number,
  elasticity: number = 0.02
): number {
  const delta = demand - supply;
  const multiplier = 1 + delta * elasticity;
  return Math.round(
    Math.max(basePrice * 0.5, Math.min(basePrice * 1.5, basePrice * multiplier))
  );
}

/**
 * Advance a port's economy by one turn.
 * Recalculates current prices from the existing supply/demand values.
 * Does not mutate the input array — returns new array with updated prices.
 */
export function advancePortEconomy(goods: MarketGood[]): MarketGood[] {
  return goods.map(g => ({
    ...g,
    currentPrice: calculateMarketPrice(g.basePrice, g.supply, g.demand),
  }));
}

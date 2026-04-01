/**
 * Voyage calculations — haversine distance and turn-based duration.
 *
 * Historical basis (600-500 BCE Mediterranean):
 * - Merchant ships hugged coastlines, averaging ~150 km/day
 * - Sailed only during daylight, beaching each night for resupply
 * - ~25 sailing days per month (weather permitting)
 * - Ships needed to stop at ports for water, food, and hull maintenance
 *
 * One game turn = one Athenian calendar month (~30 days).
 * Monthly range: ~150 km/day × 25 sailing days = ~3,750 km/month.
 * Max voyage: 2 months before needing to resupply at a coastal port.
 *
 * Reference voyage durations (historical sources):
 * - Athens → Alexandria:    ~970 km,  7-10 days  → 1 month
 * - Rome → Carthage:        ~600 km,  ~7 days    → 1 month
 * - Rome → Alexandria:      ~2,100 km, 14-20 days → 1 month
 * - Athens → Antioch:       ~1,100 km, 8-12 days  → 1 month
 * - Carthage → Antioch:     ~2,800 km, 20-25 days → 1 month
 * - Emporion → Alexandria:  ~3,200 km, 25-35 days → 1 month
 * - Emporion → Antioch:     ~3,800 km, 30-40 days → 2 months
 *
 * Sources: Lionel Casson "Ships and Seamanship in the Ancient World",
 *          TAPA 82:136-148 "Speed Under Sail of Ancient Ships" (1951)
 */

import type { Port, VoyageRoute } from '../shared/game-types';

/** Monthly sailing range in km (150 km/day × 25 days). */
const KM_PER_MONTH = 3750;

/**
 * Calculate the great-circle distance between two ports using the haversine formula.
 * Returns distance in kilometres.
 */
export function haversineDistanceKm(from: Port, to: Port): number {
  const R = 6371; // Earth radius in km
  const dLat = (to.lat - from.lat) * (Math.PI / 180);
  const dLng = (to.lng - from.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * (Math.PI / 180)) *
      Math.cos(to.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate voyage duration in turns (months).
 * Based on ancient merchant ship coastal sailing: ~3,750 km/month.
 * Minimum of 1 turn (month) for any voyage.
 */
export function calculateVoyageDuration(from: Port, to: Port): number {
  const km = haversineDistanceKm(from, to);
  const months = km / KM_PER_MONTH;
  return Math.max(1, Math.ceil(months));
}

/**
 * Returns all ports reachable from a given port within maxTurns months.
 * Default max: 2 months — ships must resupply at coastal ports.
 * Excludes the departure port itself. Sorted by duration (nearest first).
 */
export function getReachablePorts(
  fromPortId: string,
  allPorts: Port[],
  maxTurns: number = 2
): Array<{ port: Port; route: VoyageRoute }> {
  const from = allPorts.find(p => p.id === fromPortId);
  if (!from) return [];

  return allPorts
    .filter(p => p.id !== fromPortId)
    .map(to => {
      const distanceKm = haversineDistanceKm(from, to);
      const durationTurns = calculateVoyageDuration(from, to);
      return {
        port: to,
        route: { fromPortId, toPortId: to.id, distanceKm, durationTurns },
      };
    })
    .filter(r => r.route.durationTurns <= maxTurns)
    .sort((a, b) => a.route.durationTurns - b.route.durationTurns);
}

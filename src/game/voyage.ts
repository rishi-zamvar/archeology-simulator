/**
 * Voyage calculations — haversine distance and turn-based duration.
 *
 * Ancient merchant ships averaged ~4 knots under sail (day + night combined).
 * One game turn = one day of sailing.
 *
 * haversineDistanceKm: great-circle distance using the haversine formula.
 * calculateVoyageDuration: converts km to days, minimum 1 turn.
 * getReachablePorts: returns all ports reachable within maxTurns sailing days.
 */

import type { Port, VoyageRoute } from '../shared/game-types';

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
 * Calculate voyage duration in turns (days).
 * Ancient merchant ships averaged 4 knots across 24 hours of sailing.
 * Minimum of 1 turn for any voyage.
 */
export function calculateVoyageDuration(from: Port, to: Port): number {
  const km = haversineDistanceKm(from, to);
  const nauticalMiles = km / 1.852;
  const days = nauticalMiles / (4 * 24); // 4 knots × 24 hrs/day
  return Math.max(1, Math.ceil(days));
}

/**
 * Returns all ports reachable from a given port within maxTurns sailing days.
 * Excludes the departure port itself. Sorted by duration (nearest first).
 */
export function getReachablePorts(
  fromPortId: string,
  allPorts: Port[],
  maxTurns: number = 5
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

/**
 * Sea routes — maritime waypoints that keep ship paths over water.
 *
 * Ancient ships hugged coastlines and navigated through known sea lanes.
 * Straight-line routes often cut through land (e.g., Rome→Alexandria
 * would go through North Africa). This module provides waypoint-based
 * routes that curve around land masses.
 *
 * Key Mediterranean obstacles:
 * - Italian peninsula (between Rome and eastern ports)
 * - Sicily/Tunisia narrows (central Mediterranean chokepoint)
 * - Peloponnese (southern Greece)
 * - Crete (between Greece and Egypt)
 * - North African coast (between Carthage and Levant)
 */

/** Waypoint: [lat, lng] */
type Waypoint = [number, number];

/**
 * Named sea waypoints used to construct routes.
 * These represent historically important navigation points.
 */
const SEA_WAYPOINTS = {
  // Southern Italy / Sicily strait
  sicily_south:     [36.8, 15.2] as Waypoint,   // south of Sicily
  messina_strait:   [38.2, 15.6] as Waypoint,   // Strait of Messina
  // Central Mediterranean
  malta_channel:    [35.5, 14.5] as Waypoint,   // south of Malta
  crete_west:       [35.2, 23.5] as Waypoint,   // west of Crete
  crete_east:       [35.0, 26.5] as Waypoint,   // east of Crete
  // Eastern Mediterranean
  rhodes:           [36.2, 28.0] as Waypoint,   // near Rhodes
  cyprus_south:     [34.5, 33.0] as Waypoint,   // south of Cyprus
  // Southern approaches
  libyan_sea:       [33.5, 20.0] as Waypoint,   // open Libyan Sea
  egypt_coast:      [31.5, 28.0] as Waypoint,   // approaching Alexandria
  // Western Mediterranean
  sardinia_south:   [38.5, 9.5] as Waypoint,    // south of Sardinia
  tyrrhenian:       [39.5, 13.0] as Waypoint,   // Tyrrhenian Sea (off Naples)
} as const;

const W = SEA_WAYPOINTS;

/**
 * Pre-defined maritime routes between port pairs.
 * Each route is an array of waypoints (excluding start and end ports,
 * which are added automatically).
 *
 * Routes are defined for both directions — the reverse is auto-generated.
 */
const ROUTE_WAYPOINTS: Record<string, Waypoint[]> = {
  // Rome → Athens: down Italian coast, around toe of boot, across Ionian Sea
  'rome->athens': [W.tyrrhenian, W.messina_strait, W.sicily_south],

  // Rome → Alexandria: down coast, through Sicily strait, across to Egypt
  'rome->alexandria': [W.tyrrhenian, W.messina_strait, W.sicily_south, W.malta_channel, W.libyan_sea, W.egypt_coast],

  // Rome → Carthage: short hop across Tyrrhenian Sea
  'rome->carthage': [W.tyrrhenian, W.sardinia_south],

  // Rome → Antioch: long route around Italy, through Greek islands
  'rome->antioch': [W.tyrrhenian, W.messina_strait, W.sicily_south, W.crete_west, W.crete_east, W.rhodes, W.cyprus_south],

  // Athens → Alexandria: south past Crete to Egyptian coast
  'athens->alexandria': [W.crete_west, W.crete_east, W.egypt_coast],

  // Athens → Antioch: island-hop through eastern Aegean
  'athens->antioch': [W.rhodes, W.cyprus_south],

  // Athens → Carthage: west past Peloponnese, across central Med
  'athens->carthage': [W.crete_west, W.malta_channel],

  // Carthage → Alexandria: east along North African coast
  'carthage->alexandria': [W.malta_channel, W.libyan_sea, W.egypt_coast],

  // Carthage → Antioch: across central Med, through eastern islands
  'carthage->antioch': [W.malta_channel, W.crete_west, W.crete_east, W.rhodes, W.cyprus_south],

  // Alexandria → Antioch: northeast along Levantine coast
  'alexandria->antioch': [W.cyprus_south],
};

/**
 * Get the sea route waypoints between two ports.
 * Returns an array of [lat, lng] points including start and end.
 * If no specific route is defined, returns a direct line (fallback).
 */
export function getSeaRoute(
  fromPortId: string,
  toPortId: string,
  fromCoords: [number, number],
  toCoords: [number, number]
): Waypoint[] {
  const forwardKey = `${fromPortId}->${toPortId}`;
  const reverseKey = `${toPortId}->${fromPortId}`;

  const waypoints = ROUTE_WAYPOINTS[forwardKey];
  if (waypoints) {
    return [fromCoords, ...waypoints, toCoords];
  }

  const reverseWaypoints = ROUTE_WAYPOINTS[reverseKey];
  if (reverseWaypoints) {
    return [fromCoords, ...reverseWaypoints.slice().reverse(), toCoords];
  }

  // Fallback: direct line (no known route)
  return [fromCoords, toCoords];
}

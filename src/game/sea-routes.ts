/**
 * Sea routes — graph-based maritime waypoints that keep ship paths over water.
 *
 * Each port connects to a nearby sea waypoint. Routes between ports are built
 * by connecting: port → nearest waypoint → graph path → destination waypoint → port.
 * This ensures ships always sail on water, curving around land masses.
 *
 * The waypoint graph has edges between connected sea nodes. A simple BFS
 * finds the shortest path through the graph for any port pair.
 */

type Waypoint = [number, number];

/**
 * Sea waypoints — navigation nodes in open water.
 */
const WAYPOINTS: Record<string, Waypoint> = {
  // Western Mediterranean
  gibraltar:        [35.9, -5.5],
  iberia_south:     [36.5, -2.0],
  sardinia_west:    [39.5, 8.0],
  sardinia_south:   [38.5, 9.5],

  // Central Mediterranean
  tyrrhenian:       [39.5, 13.0],
  sicily_north:     [38.5, 13.5],
  sicily_south:     [36.8, 15.2],
  malta_channel:    [35.5, 14.5],
  ionian_west:      [38.0, 17.0],

  // Greece
  ionian_sea:       [38.0, 19.5],
  peloponnese_s:    [36.4, 22.5],
  saronic:          [37.6, 23.5],
  aegean_west:      [37.5, 25.0],
  aegean_south:     [36.5, 25.5],
  aegean_east:      [37.5, 27.0],

  // Eastern Mediterranean
  rhodes:           [36.2, 28.0],
  crete_west:       [35.2, 23.5],
  crete_east:       [35.0, 26.5],
  cyprus_south:     [34.5, 33.0],
  levant_coast:     [34.0, 35.0],

  // Southern Mediterranean
  libyan_sea:       [33.5, 20.0],
  egypt_coast:      [31.5, 28.0],
  egypt_west:       [31.5, 25.0],

  // Black Sea approach
  marmara:          [40.5, 29.0],
};

/**
 * Waypoint graph edges — which waypoints connect to each other.
 * Bidirectional (if A→B exists, B→A is implied).
 */
const EDGES: [string, string][] = [
  // Western chain
  ['gibraltar', 'iberia_south'],
  ['iberia_south', 'sardinia_west'],
  ['sardinia_west', 'sardinia_south'],
  ['sardinia_south', 'malta_channel'],
  ['sardinia_south', 'tyrrhenian'],

  // Italian coast
  ['tyrrhenian', 'sicily_north'],
  ['sicily_north', 'sicily_south'],
  ['sicily_south', 'malta_channel'],
  ['sicily_south', 'ionian_west'],
  ['tyrrhenian', 'ionian_west'],

  // Ionian → Greece
  ['ionian_west', 'ionian_sea'],
  ['ionian_sea', 'peloponnese_s'],
  ['ionian_sea', 'saronic'],

  // Greece internal
  ['saronic', 'peloponnese_s'],
  ['saronic', 'aegean_west'],
  ['aegean_west', 'aegean_east'],
  ['aegean_west', 'aegean_south'],
  ['aegean_south', 'aegean_east'],
  ['saronic', 'marmara'],
  ['aegean_east', 'marmara'],

  // Crete passages
  ['peloponnese_s', 'crete_west'],
  ['aegean_south', 'crete_east'],
  ['crete_west', 'crete_east'],
  ['crete_west', 'libyan_sea'],

  // Eastern Mediterranean
  ['aegean_east', 'rhodes'],
  ['crete_east', 'rhodes'],
  ['rhodes', 'cyprus_south'],
  ['cyprus_south', 'levant_coast'],
  ['cyprus_south', 'egypt_coast'],

  // Southern passages
  ['malta_channel', 'libyan_sea'],
  ['libyan_sea', 'egypt_west'],
  ['egypt_west', 'egypt_coast'],
  ['egypt_coast', 'levant_coast'],
];

/**
 * Each port's nearest sea waypoint(s). The port connects to these
 * to enter the waypoint graph.
 */
const PORT_WAYPOINTS: Record<string, string[]> = {
  // Greece
  athens:     ['saronic'],
  corinth:    ['saronic'],
  sparta:     ['peloponnese_s'],
  miletos:    ['aegean_east'],
  byzantion:  ['marmara'],
  knossos:    ['crete_west', 'crete_east'],

  // Italy
  ostia:      ['tyrrhenian'],
  taras:      ['ionian_west'],
  syracuse:   ['sicily_south'],

  // Western
  massalia:   ['sardinia_west'],
  emporion:   ['iberia_south'],
  gadir:      ['gibraltar'],

  // North Africa
  carthage:   ['malta_channel'],
  cyrene:     ['libyan_sea'],
  leptis:     ['libyan_sea'],

  // Egypt
  alexandria: ['egypt_coast'],
  memphis:    ['egypt_coast'],

  // Levant
  tyre:       ['levant_coast'],
  sidon:      ['levant_coast'],
  byblos:     ['levant_coast'],
  antioch:    ['levant_coast', 'cyprus_south'],
};

// Build adjacency list from edges
const ADJ = new Map<string, Set<string>>();
for (const [a, b] of EDGES) {
  if (!ADJ.has(a)) ADJ.set(a, new Set());
  if (!ADJ.has(b)) ADJ.set(b, new Set());
  ADJ.get(a)!.add(b);
  ADJ.get(b)!.add(a);
}

/**
 * BFS shortest path through waypoint graph.
 */
function bfsPath(startNodes: string[], endNodes: string[]): string[] | null {
  const endSet = new Set(endNodes);
  const queue: string[][] = startNodes.map(n => [n]);
  const visited = new Set<string>(startNodes);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (endSet.has(current)) return path;

    const neighbors = ADJ.get(current);
    if (!neighbors) continue;

    for (const next of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return null;
}

/**
 * Get the sea route between two ports as an array of [lat, lng] coordinates.
 * Routes go: port → nearest waypoint → BFS through graph → destination waypoint → port.
 */
export function getSeaRoute(
  fromPortId: string,
  toPortId: string,
  fromCoords: Waypoint,
  toCoords: Waypoint
): Waypoint[] {
  const fromWaypoints = PORT_WAYPOINTS[fromPortId];
  const toWaypoints = PORT_WAYPOINTS[toPortId];

  // If ports share a waypoint (very close), direct route
  if (fromWaypoints && toWaypoints) {
    for (const fw of fromWaypoints) {
      if (toWaypoints.includes(fw)) {
        return [fromCoords, WAYPOINTS[fw], toCoords];
      }
    }
  }

  // BFS through waypoint graph
  if (fromWaypoints && toWaypoints) {
    const path = bfsPath(fromWaypoints, toWaypoints);
    if (path) {
      const coords: Waypoint[] = [fromCoords];
      for (const nodeId of path) {
        coords.push(WAYPOINTS[nodeId]);
      }
      coords.push(toCoords);
      return coords;
    }
  }

  // Fallback: direct line (unknown ports)
  return [fromCoords, toCoords];
}

/**
 * Get all port IDs directly connected to a given port via the waypoint graph.
 * Two ports are "connected" if they share at least one waypoint or
 * are within 1 hop of each other in the graph.
 */
export function getConnectedPorts(portId: string): string[] {
  const myWaypoints = PORT_WAYPOINTS[portId];
  if (!myWaypoints) return [];

  // Collect all waypoints within 3 hops (ensures port chains connect)
  const reachable = new Set<string>();
  for (const wp of myWaypoints) {
    reachable.add(wp);
    const hop1 = ADJ.get(wp);
    if (hop1) {
      for (const n1 of hop1) {
        reachable.add(n1);
        const hop2 = ADJ.get(n1);
        if (hop2) {
          for (const n2 of hop2) {
            reachable.add(n2);
            const hop3 = ADJ.get(n2);
            if (hop3) { for (const n3 of hop3) reachable.add(n3); }
          }
        }
      }
    }
  }

  // Find ports whose waypoints overlap with reachable set
  const connected: string[] = [];
  for (const [pid, waypoints] of Object.entries(PORT_WAYPOINTS)) {
    if (pid === portId) continue;
    if (waypoints.some(wp => reachable.has(wp))) {
      connected.push(pid);
    }
  }
  return connected;
}

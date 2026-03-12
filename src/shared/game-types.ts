/**
 * Game domain types shared between main process logic and renderer.
 *
 * GamePhase is the FSM discriminant — the set of mutually exclusive
 * game states. Using a union type prevents impossible combinations at
 * compile time (you cannot be both 'trading' and 'sailing').
 */

export type GamePhase = 'idle' | 'trading' | 'sailing' | 'encountered';

/**
 * Port — historically accurate Mediterranean port with Pleiades coordinates.
 */
export interface Port {
  id: string;           // e.g. 'athens', 'carthage'
  ancientName: string;  // e.g. 'Athenai', 'Karchedon'
  modernName: string;   // e.g. 'Athens', 'Carthage'
  lat: number;
  lng: number;
  region: 'greece' | 'levant' | 'egypt' | 'italy' | 'iberia' | 'north_africa';
  description: string;  // 1-2 sentence student-accessible description
  pleiadesId?: string;  // e.g. '579885'
  culturalDescription?: string; // richer historical/cultural context for port info panel
}

/**
 * Good — a tradeable commodity with a base price.
 */
export interface Good {
  id: string;           // e.g. 'wheat', 'olive_oil'
  name: string;
  basePrice: number;    // denarii per unit
  description: string;
}

/**
 * MarketGood — a Good as it appears at a specific port, with supply/demand dynamics.
 */
export interface MarketGood extends Good {
  portId: string;
  supply: number;       // units produced per turn at this port
  demand: number;       // units consumed per turn at this port
  currentPrice: number; // calculated by economy.ts
}

/**
 * CargoItem — a good the player is carrying, with purchase provenance.
 */
export interface CargoItem {
  goodId: string;
  quantity: number;
  boughtAtPrice: number;
  boughtAtPort: string;
}

/**
 * PlayerInventory — the player's wealth and cargo hold state.
 */
export interface PlayerInventory {
  gold: number;
  cargoItems: CargoItem[];
  cargoCapacity: number;  // max units (one ship type: 50)
  currentCargo: number;   // sum of all quantities
}

/**
 * TransactionRecord — a single buy or sell event for audit trail.
 */
export interface TransactionRecord {
  id?: number;
  turn: number;
  portId: string;
  goodId: string;
  action: 'buy' | 'sell';
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
}

/**
 * VoyageRoute — the calculated route between two ports.
 */
export interface VoyageRoute {
  fromPortId: string;
  toPortId: string;
  distanceKm: number;
  durationTurns: number;
}

export type VoyageEventType = 'storm' | 'pirate' | 'calm';

/**
 * VoyageEvent — an event the player may encounter during a voyage.
 */
export interface VoyageEvent {
  id: string;
  type: VoyageEventType;
  title: string;
  description: string;
  choices: VoyageEventChoice[];
}

/**
 * VoyageEventChoice — one option when resolving a voyage event.
 */
export interface VoyageEventChoice {
  id: string;
  label: string;
  outcome: string;  // human-readable consequence description
}

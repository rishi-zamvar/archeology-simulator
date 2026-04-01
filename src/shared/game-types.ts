/**
 * Game domain types shared between main process logic and renderer.
 *
 * GamePhase is the FSM discriminant — the set of mutually exclusive
 * game states. Using a union type prevents impossible combinations at
 * compile time (you cannot be both 'trading' and 'sailing').
 */

export type GamePhase = 'idle' | 'trading' | 'sailing' | 'encountered';

/**
 * PortRegion — the six Mediterranean trading spheres.
 */
export type PortRegion = 'greece' | 'levant' | 'egypt' | 'italy' | 'iberia' | 'north_africa';

/**
 * Port — historically accurate Mediterranean port with Pleiades coordinates.
 */
export interface Port {
  id: string;           // e.g. 'athens', 'carthage'
  ancientName: string;  // e.g. 'Athenai', 'Karchedon'
  modernName: string;   // e.g. 'Athens', 'Carthage'
  lat: number;
  lng: number;
  region: PortRegion;
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
  boughtAtTurn?: number;
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

// ─── Journal ─────────────────────────────────────────────────────────────────

export type JournalEntryType = 'trade' | 'voyage_event' | 'arrival' | 'departure' | 'note';

export type TradeBody = { goodId: string; goodName: string; qty: number; pricePerUnit: number; totalValue: number; portId: string; portName: string; action: 'buy' | 'sell' };
export type EventBody = { eventType: string; choiceId: string; outcome: string; goldDelta: number };
export type ArrivalBody = { portId: string; portName: string };
export type DepartureBody = { portId: string; portName: string; destination: string };
export type NoteBody = { text: string };

export type JournalBodyMap = {
  trade: TradeBody;
  voyage_event: EventBody;
  arrival: ArrivalBody;
  departure: DepartureBody;
  note: NoteBody;
};

export interface JournalEntry {
  id: number;
  turn: number;
  entryType: JournalEntryType;
  title: string;
  body: JournalBodyMap[JournalEntryType];
  createdAt: string;
}

// --- v2.0 Quest/NPC/Reputation/Port Tables ---

export type QuestStatus = 'available' | 'active' | 'completed' | 'failed';

export interface QuestProgress {
  questId: string;
  status: QuestStatus;
  currentObjective: number;
  startedAt?: string;
  completedAt?: string;
}

export interface NpcDialogueState {
  npcId: string;
  lastNodeId?: string;
  timesSpoken: number;
  lastSpokenTurn?: number;
}

export interface Reputation {
  region: string;
  score: number;
}

export interface PortLore {
  portId: string;
  history: string;
  culture: string;
  tradeSpecialization: string;
  notableFacts: string[];
  historicalPeriod: string;
  primarySources: string[];
}

export interface PortAccess {
  portId: string;
  discovered: boolean;
  discoveredTurn?: number;
  unlockMethod?: string;
}

// --- v2.0 Dialogue Engine Types ---

export type ConditionType = 'quest' | 'reputation' | 'visited_port' | 'has_cargo' | 'turn_range' | 'season';

export interface QuestCondition { type: 'quest'; id: string; status: QuestStatus | 'not_started'; }
export interface ReputationCondition { type: 'reputation'; region: string; min?: number; max?: number; }
export interface VisitedPortCondition { type: 'visited_port'; portId: string; }
export interface HasCargoCondition { type: 'has_cargo'; goodId: string; minQuantity?: number; }
export interface TurnRangeCondition { type: 'turn_range'; min?: number; max?: number; }
export interface SeasonCondition { type: 'season'; season: string; }

export type DialogueCondition =
  | QuestCondition | ReputationCondition | VisitedPortCondition
  | HasCargoCondition | TurnRangeCondition | SeasonCondition;

export type CompositeCondition =
  | DialogueCondition
  | { $and: CompositeCondition[] }
  | { $or: CompositeCondition[] }
  | { $not: CompositeCondition };

export type EffectType = 'quest_update' | 'reputation_change' | 'port_unlock' | 'journal_entry' | 'trade_offer';

export interface DialogueEffect {
  type: EffectType;
  [key: string]: unknown;
}

export interface DialogueChoice {
  text: string;
  next: string;
  effects: DialogueEffect[];
  conditions?: CompositeCondition;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  conditions?: CompositeCondition;
  choices: DialogueChoice[];
}

export interface DialogueFile {
  npc_id: string;
  port_id: string;
  root_node: string;
  nodes: DialogueNode[];
}

/**
 * IPC message contracts shared between main process and renderer.
 *
 * These types define the shape of data that crosses the contextBridge
 * boundary. Both sides must agree on these contracts.
 *
 * GameState, GameAction, and GameResult are re-exported from src/game/types
 * so the renderer can import from this single boundary file without knowing
 * the internal structure of the game module.
 */

export type { GameState, GameAction, GameResult } from '../game/types';
export type { Port, MarketGood, VoyageRoute, PlayerInventory, TransactionRecord, VoyageEvent, JournalEntry } from './game-types';
export type { CuratedImage } from '../main/db/queries';

/**
 * Discriminated union returned by every IPC handler.
 * Handlers NEVER return raw values or throw — always return IPCResponse<T>.
 */
export type IPCResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * The contextBridge API surface exposed as window.api in the renderer.
 * This is the ONLY way the renderer communicates with the main process.
 */
export interface IPCBridge {
  game: {
    // Phase 1: core FSM channels
    load: () => Promise<IPCResponse<import('../game/types').GameState>>;
    save: (state: import('../game/types').GameState) => Promise<IPCResponse<import('../game/types').GameState>>;
    action: (action: import('../game/types').GameAction) => Promise<IPCResponse<import('../game/types').GameResult>>;

    // Phase 2: port and market data channels
    getPorts: () => Promise<IPCResponse<import('./game-types').Port[]>>;
    getPortDetails: (portId: string) => Promise<IPCResponse<import('./game-types').Port | null>>;
    getMarketPrices: (portId: string) => Promise<IPCResponse<import('./game-types').MarketGood[]>>;
    getReachablePorts: (fromPortId: string, currentTurn?: number) => Promise<IPCResponse<Array<{ port: import('./game-types').Port; route: import('./game-types').VoyageRoute }>>>;
    getPlayerInventory: () => Promise<IPCResponse<import('./game-types').PlayerInventory>>;

    // Phase 2 Plan 3: trade channels
    buyGood: (portId: string, goodId: string, qty: number) => Promise<IPCResponse<import('./game-types').PlayerInventory>>;
    sellGood: (portId: string, goodId: string, qty: number) => Promise<IPCResponse<import('./game-types').PlayerInventory>>;
    getTransactionHistory: (limit?: number) => Promise<IPCResponse<import('./game-types').TransactionRecord[]>>;

    // Phase 2 Plan 4: voyage event channels
    getPendingEvent: () => Promise<IPCResponse<import('./game-types').VoyageEvent | null>>;
    resolveEvent: (
      eventId: string,
      choiceId: string
    ) => Promise<IPCResponse<{ outcome: import('../game/events').EventOutcome; message: string }>>;

    // Phase 4 Plan 2: curated offline images
    getCuratedImages: (query: { goodId?: string; portId?: string }) => Promise<IPCResponse<import('../main/db/queries').CuratedImage[]>>;

    // Phase 11: per-turn sailing advancement
    advanceSailingTurn: () => Promise<IPCResponse<import('../game/sailing').SailingTurnResult>>;

    // Phase 9 Plan 3: seasonal weather — wait for spring
    waitForSpring: () => Promise<IPCResponse<import('../game/types').GameResult>>;

    // Phase 12: title screen
    hasSave: () => Promise<IPCResponse<boolean>>;
    newGame: () => Promise<IPCResponse<import('../game/types').GameState>>;

    // Phase 20: Journey stats for conclusion screen
    getJourneyStats: () => Promise<IPCResponse<{ portsVisited: number; goodsTraded: number; turnsElapsed: number; questsCompleted: number; goldEarned: number }>>;

    // Phase 16: Port lore
    getPortLore: (portId: string) => Promise<IPCResponse<import('./game-types').PortLore | null>>;

    // Phase 18: Reputation
    getPortReputation: (portId: string) => Promise<IPCResponse<{ region: string; score: number; tierName: string; tierLevel: number }>>;

    // Phase 19: Port Access
    getPortAccessLevel: (portId: string) => Promise<IPCResponse<import('./game-types').PortAccessLevel>>;
    getAllPortAccess: () => Promise<IPCResponse<import('./game-types').PortAccessInfo[]>>;
    autoDiscoverPort: (portId: string, turn: number) => Promise<IPCResponse<boolean>>;

    // Scan resources/images/ for available image files on disk
    scanResourceImages: () => Promise<IPCResponse<{
      ports: Record<string, string>;
      goods: Record<string, string[]>;
    }>>;
  };
  /** Phase 14: Dialogue Engine */
  dialogue: {
    getNodes: (npcId: string) => Promise<IPCResponse<{ node: import('./game-types').DialogueNode; availableChoices: import('./game-types').DialogueChoice[]; npcId: string; portraitUrl: string | null }>>;
    advanceNode: (npcId: string, nodeId: string, choiceIndex: number) => Promise<IPCResponse<{ node: import('./game-types').DialogueNode | null; availableChoices: import('./game-types').DialogueChoice[]; effectsApplied: string[] }>>;
    getAvailableNpcs: (portId: string) => Promise<IPCResponse<Array<{ npcId: string; name: string; portraitUrl: string | null }>>>;
  };
  /** Phase 15: Quest System */
  quest: {
    getActive: () => Promise<IPCResponse<Array<{ quest: import('./game-types').QuestDefinition; progress: import('./game-types').QuestProgress }>>>;
    getAll: () => Promise<IPCResponse<Array<{ quest: import('./game-types').QuestDefinition; progress: import('./game-types').QuestProgress }>>>;
  };
  /** Phase 10: Captain's Journal */
  journal: {
    getEntries: (limit?: number) => Promise<IPCResponse<import('./game-types').JournalEntry[]>>;
    addNote: (title: string, text: string) => Promise<IPCResponse<void>>;
  };
  /** Subscribe to a push event from main process. Returns cleanup function. */
  subscribe: (event: string, callback: (data: unknown) => void) => () => void;
}

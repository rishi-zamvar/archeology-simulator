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
export type { Port, MarketGood, VoyageRoute, PlayerInventory, TransactionRecord, VoyageEvent } from './game-types';
export type { CachedArtifact } from '../main/db/queries';
export type { CuratedImage } from '../main/db/queries';

/**
 * Discriminated union returned by every IPC handler.
 * Handlers NEVER return raw values or throw — always return IPCResponse<T>.
 */
export type IPCResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * A candidate image sourced from Met Museum or Wikimedia Commons.
 * Used in Phase 5 image-sourcing flows where the user must approve each
 * candidate before any download occurs.
 *
 * Both portId and goodId are optional so this type covers port sourcing
 * (05-01) and good sourcing (05-02) with a single interface.
 */
export interface ImageCandidate {
  id: string;
  portId?: string;
  goodId?: string;
  sourceUrl: string;
  imageUrl: string;
  title: string;
  attribution: string;
  source: 'met' | 'wikimedia';
}

/**
 * The contextBridge API surface exposed as window.api in the renderer.
 * This is the ONLY way the renderer communicates with the main process.
 */
export interface IPCBridge {
  game: {
    // Phase 1: core FSM channels
    load: () => Promise<import('../game/types').GameState>;
    save: (state: import('../game/types').GameState) => Promise<import('../game/types').GameResult>;
    action: (action: import('../game/types').GameAction) => Promise<import('../game/types').GameResult>;

    // Phase 2: port and market data channels
    getPorts: () => Promise<import('./game-types').Port[]>;
    getPortDetails: (portId: string) => Promise<import('./game-types').Port | null>;
    getMarketPrices: (portId: string) => Promise<import('./game-types').MarketGood[]>;
    getReachablePorts: (fromPortId: string) => Promise<Array<{ port: import('./game-types').Port; route: import('./game-types').VoyageRoute }>>;
    getPlayerInventory: () => Promise<import('./game-types').PlayerInventory>;

    // Phase 2 Plan 3: trade channels
    buyGood: (portId: string, goodId: string, qty: number) => Promise<import('./game-types').PlayerInventory>;
    sellGood: (portId: string, goodId: string, qty: number) => Promise<import('./game-types').PlayerInventory>;
    getTransactionHistory: (limit?: number) => Promise<import('./game-types').TransactionRecord[]>;

    // Phase 2 Plan 4: voyage event channels
    getPendingEvent: () => Promise<import('./game-types').VoyageEvent | null>;
    resolveEvent: (
      eventId: string,
      choiceId: string
    ) => Promise<{ success: boolean; error?: string; outcome?: import('../game/events').EventOutcome; message?: string }>;

    // Phase 3 Plan 2: museum artifact images
    getArtifacts: (goodId: string) => Promise<import('../main/db/queries').CachedArtifact[]>;

    // Phase 4 Plan 2: curated offline images
    getCuratedImages: (query: { goodId?: string; portId?: string }) => Promise<import('../main/db/queries').CuratedImage[]>;

    // Phase 5 Plan 1: port illustration sourcing
    searchPortCandidates: (args: { portId: string }) => Promise<ImageCandidate[]>;

    // Scan resources/images/ for available image files on disk
    scanResourceImages: () => Promise<{
      ports: Record<string, string>;
      goods: Record<string, string[]>;
    }>;
  };
  /** Subscribe to a push event from main process. Returns cleanup function. */
  subscribe: (event: string, callback: (data: unknown) => void) => () => void;
}

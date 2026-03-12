/**
 * IPC message contracts shared between main process and renderer.
 *
 * These types define the shape of data that crosses the contextBridge
 * boundary. Both sides must agree on these contracts.
 */

export type GameState = {
  type: 'idle' | 'trading' | 'sailing' | 'encountered';
  currentTurn: number;
  [key: string]: unknown;
};

export type GameAction = {
  type: string;
  payload?: unknown;
};

export type GameResult = {
  success: boolean;
  state: GameState;
  error?: string;
};

/**
 * The contextBridge API surface exposed as window.api in the renderer.
 * This is the ONLY way the renderer communicates with the main process.
 */
export interface IPCBridge {
  game: {
    load: () => Promise<GameState>;
    save: (state: GameState) => Promise<GameResult>;
    action: (action: GameAction) => Promise<GameResult>;
  };
  /** Subscribe to a push event from main process. Returns cleanup function. */
  subscribe: (event: string, callback: (data: unknown) => void) => () => void;
}

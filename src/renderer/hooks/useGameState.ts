/**
 * useGameState — canonical IPC hook for renderer components.
 *
 * Establishes the pattern all renderer components use to connect to game state:
 *   - Load on mount via window.api.game.load()
 *   - Subscribe to 'game:updated' push events from main process
 *   - CRITICAL: cleanup unsubscribes on unmount to prevent memory leaks
 *
 * The cleanup return in useEffect #2 prevents the listener from accumulating
 * across React StrictMode double-mounts and across component remounts.
 */

import { useState, useEffect, useCallback } from 'react';
import type { GameState, GameAction, GameResult, IPCResponse } from '../../shared/ipc-types';

interface UseGameStateReturn {
  state: GameState | null;
  isLoading: boolean;
  error: Error | null;
  updateGame: (action: GameAction) => Promise<IPCResponse<GameResult>>;
}

export function useGameState(): UseGameStateReturn {
  const [state, setState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Effect #1: Load initial game state on mount
  useEffect(() => {
    let cancelled = false;

    if (!window.api?.game?.load) { setIsLoading(false); return; }
    window.api.game.load()
      .then((response) => {
        if (!cancelled) {
          if (!response.success) throw new Error(response.error);
          setState(response.data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Effect #2: Subscribe to push events from the main process.
  // CRITICAL: returning the cleanup function unsubscribes the listener on unmount.
  // Without this return, every remount registers an additional listener — a memory leak.
  useEffect(() => {
    if (!window.api?.subscribe) return;
    const cleanup = window.api.subscribe('game:updated', (data: unknown) => {
      setState(data as GameState);
    });

    return cleanup;
  }, []);

  const updateGame = useCallback(async (action: GameAction): Promise<IPCResponse<GameResult>> => {
    return window.api.game.action(action);
  }, []);

  return { state, isLoading, error, updateGame };
}

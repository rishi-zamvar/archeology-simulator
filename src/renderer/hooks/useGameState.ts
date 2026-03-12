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
import type { GameState, GameAction, GameResult } from '../../shared/ipc-types';

interface UseGameStateReturn {
  state: GameState | null;
  isLoading: boolean;
  error: Error | null;
  updateGame: (action: GameAction) => Promise<GameResult>;
}

export function useGameState(): UseGameStateReturn {
  const [state, setState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Effect #1: Load initial game state on mount
  useEffect(() => {
    let cancelled = false;

    window.api.game.load()
      .then((loaded) => {
        if (!cancelled) {
          setState(loaded);
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
    const cleanup = window.api.subscribe('game:updated', (data: unknown) => {
      setState(data as GameState);
    });

    return cleanup;
  }, []);

  const updateGame = useCallback(async (action: GameAction): Promise<GameResult> => {
    return window.api.game.action(action);
  }, []);

  return { state, isLoading, error, updateGame };
}

/**
 * useMapPorts — loads all port data from the main process on mount.
 *
 * Used by MapArea to populate Leaflet markers. Follows the same
 * abort-controller-free pattern as useGameState: a `cancelled` flag
 * prevents state updates after unmount.
 */

import { useState, useEffect } from 'react';
import type { Port } from '../../shared/game-types';

interface UseMapPortsReturn {
  ports: Port[];
  isLoading: boolean;
  error: Error | null;
}

export function useMapPorts(): UseMapPortsReturn {
  const [ports, setPorts] = useState<Port[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    window.api.game.getPorts()
      .then((loaded) => {
        if (!cancelled) {
          setPorts(loaded);
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

  return { ports, isLoading, error };
}

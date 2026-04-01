/**
 * useMapPorts — loads all port data and access levels from the main process on mount.
 *
 * Used by MapArea to populate Leaflet markers with tiered access display.
 * Returns portAccessMap alongside ports for rendering unknown/discovered/unlocked tiers.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Port, PortAccessLevel } from '../../shared/game-types';

interface UseMapPortsReturn {
  ports: Port[];
  portAccessMap: Map<string, PortAccessLevel>;
  isLoading: boolean;
  error: Error | null;
  refreshAccess: () => void;
}

export function useMapPorts(): UseMapPortsReturn {
  const [ports, setPorts] = useState<Port[]>([]);
  const [portAccessMap, setPortAccessMap] = useState<Map<string, PortAccessLevel>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshAccessKey, setRefreshAccessKey] = useState(0);

  // Load ports once on mount
  useEffect(() => {
    let cancelled = false;

    window.api.game.getPorts()
      .then((response) => {
        if (!cancelled) {
          if (!response.success) throw new Error(response.error);
          setPorts(response.data);
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

  // Load access levels on mount and whenever refreshAccessKey changes
  useEffect(() => {
    let cancelled = false;

    window.api.game.getAllPortAccess()
      .then((response) => {
        if (!cancelled) {
          if (!response.success) return;
          const map = new Map<string, PortAccessLevel>();
          for (const info of response.data) {
            map.set(info.portId, info.status);
          }
          setPortAccessMap(map);
        }
      })
      .catch(() => {
        // Non-fatal: default to unknown for all ports
      });

    return () => {
      cancelled = true;
    };
  }, [refreshAccessKey]);

  const refreshAccess = useCallback(() => {
    setRefreshAccessKey((k) => k + 1);
  }, []);

  return { ports, portAccessMap, isLoading, error, refreshAccess };
}

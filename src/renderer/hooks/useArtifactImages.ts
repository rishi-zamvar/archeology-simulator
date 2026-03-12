/**
 * useArtifactImages — fetches museum artifact images for a list of trade good IDs.
 *
 * Calls window.api.game.getArtifacts(goodId) once per good via Promise.all.
 * The main process returns cached results within 24h, otherwise fetches from
 * Met Museum API → Wikimedia Commons → placeholder.
 *
 * The hook is keyed on a sorted join of goodIds so it only re-fetches when the
 * set of goods actually changes (not on every render).
 *
 * Cancellation flag prevents stale setState calls if the component unmounts
 * while a fetch is in flight.
 */

import { useEffect, useState } from 'react';
import type { CachedArtifact } from '../../shared/ipc-types';

export function useArtifactImages(goodIds: string[]): Map<string, CachedArtifact[]> {
  const [artifacts, setArtifacts] = useState<Map<string, CachedArtifact[]>>(new Map());

  // Stable key so useEffect only triggers on meaningful changes.
  const key = goodIds.slice().sort().join(',');

  useEffect(() => {
    if (goodIds.length === 0) return;
    let cancelled = false;

    Promise.all(goodIds.map((id) => window.api.game.getArtifacts(id)))
      .then((results) => {
        if (cancelled) return;
        const map = new Map<string, CachedArtifact[]>();
        goodIds.forEach((id, idx) => map.set(id, results[idx] ?? []));
        setArtifacts(map);
      })
      .catch((err: unknown) => {
        console.error('[useArtifactImages] fetch error:', err);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return artifacts;
}

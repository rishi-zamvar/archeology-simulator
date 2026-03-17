/**
 * useResourceImages — scans resources/images/ for available curated image files.
 *
 * Calls window.api.game.scanResourceImages() once on mount. Returns a map of
 * available port images and good images as resource-image:// protocol URLs
 * that can be used directly in <img src="...">.
 *
 * Components check this before falling back to SVG or API-fetched images.
 */

import { useEffect, useState } from 'react';

interface ResourceImages {
  /** Map of portId → resource-image:// URL (one image per port) */
  ports: Record<string, string>;
  /** Map of goodId → array of resource-image:// URLs */
  goods: Record<string, string[]>;
  /** True once the scan has completed */
  ready: boolean;
}

export function useResourceImages(): ResourceImages {
  const [state, setState] = useState<ResourceImages>({
    ports: {},
    goods: {},
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;

    window.api.game.scanResourceImages()
      .then((response) => {
        if (cancelled) return;
        if (!response.success) throw new Error(response.error);
        // Convert relative paths to resource-image:// protocol URLs
        const ports: Record<string, string> = {};
        for (const [portId, relPath] of Object.entries(response.data.ports)) {
          ports[portId] = `resource-image:///${relPath}`;
        }
        const goods: Record<string, string[]> = {};
        for (const [goodId, relPaths] of Object.entries(response.data.goods)) {
          goods[goodId] = relPaths.map((p: string) => `resource-image:///${p}`);
        }
        setState({ ports, goods, ready: true });
      })
      .catch((err: unknown) => {
        console.error('[useResourceImages] scan error:', err);
        setState((prev) => ({ ...prev, ready: true }));
      });

    return () => { cancelled = true; };
  }, []);

  return state;
}

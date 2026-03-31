/**
 * useResourceImages — scans resources/images/ for available curated image files
 * and enriches each entry with attribution metadata from the curated_images table.
 *
 * Calls window.api.game.scanResourceImages() once on mount, then fetches
 * attribution via getCuratedImages for each portId/goodId found. Returns
 * enriched objects with url + attribution + sourceUrl.
 *
 * Components use this to display curated images with proper attribution.
 */

import { useEffect, useState } from 'react';

export interface ResourceImageEntry {
  url: string;
  attribution: string;
  sourceUrl: string;
}

interface ResourceImages {
  /** Map of portId → enriched image entry (one image per port) */
  ports: Record<string, ResourceImageEntry>;
  /** Map of goodId → array of enriched image entries */
  goods: Record<string, ResourceImageEntry[]>;
  /** True once both scan and attribution queries have completed */
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

    (async () => {
      try {
        // 1. Scan disk for available image files
        const scanResponse = await window.api.game.scanResourceImages();
        if (cancelled) return;
        if (!scanResponse.success) throw new Error(scanResponse.error);

        const { ports: portPaths, goods: goodPaths } = scanResponse.data;

        // 2. Fetch attribution metadata in parallel for all ports and goods
        const portIds = Object.keys(portPaths);
        const goodIds = Object.keys(goodPaths);

        const portAttrPromises = portIds.map((portId) =>
          window.api.game.getCuratedImages({ portId }).then((r) => ({
            id: portId,
            result: r,
          }))
        );

        const goodAttrPromises = goodIds.map((goodId) =>
          window.api.game.getCuratedImages({ goodId }).then((r) => ({
            id: goodId,
            result: r,
          }))
        );

        const [portAttrResults, goodAttrResults] = await Promise.all([
          Promise.all(portAttrPromises),
          Promise.all(goodAttrPromises),
        ]);

        if (cancelled) return;

        // 3. Build attribution lookup maps keyed by filePath
        // Port attribution: portId → { attribution, sourceUrl } keyed by filePath
        const portAttrByFile = new Map<string, { attribution: string; sourceUrl: string }>();
        for (const { result } of portAttrResults) {
          if (result.success) {
            for (const img of result.data) {
              portAttrByFile.set(img.filePath, {
                attribution: img.attribution,
                sourceUrl: img.sourceUrl ?? '',
              });
            }
          }
        }

        // Good attribution: same structure
        const goodAttrByFile = new Map<string, { attribution: string; sourceUrl: string }>();
        for (const { result } of goodAttrResults) {
          if (result.success) {
            for (const img of result.data) {
              goodAttrByFile.set(img.filePath, {
                attribution: img.attribution,
                sourceUrl: img.sourceUrl ?? '',
              });
            }
          }
        }

        // 4. Build enriched port map
        const ports: Record<string, ResourceImageEntry> = {};
        for (const [portId, relPath] of Object.entries(portPaths)) {
          const url = `resource-image:///${relPath}`;
          const attr = portAttrByFile.get(relPath);
          ports[portId] = {
            url,
            attribution: attr?.attribution ?? '',
            sourceUrl: attr?.sourceUrl ?? '',
          };
        }

        // 5. Build enriched goods map
        const goods: Record<string, ResourceImageEntry[]> = {};
        for (const [goodId, relPaths] of Object.entries(goodPaths)) {
          goods[goodId] = relPaths.map((p: string) => {
            const url = `resource-image:///${p}`;
            const attr = goodAttrByFile.get(p);
            return {
              url,
              attribution: attr?.attribution ?? '',
              sourceUrl: attr?.sourceUrl ?? '',
            };
          });
        }

        setState({ ports, goods, ready: true });
      } catch (err: unknown) {
        console.error('[useResourceImages] scan/attribution error:', err);
        if (!cancelled) {
          setState((prev) => ({ ...prev, ready: true }));
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return state;
}

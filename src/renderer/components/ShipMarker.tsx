/**
 * ShipMarker -- animated ship along sea route.
 *
 * Single leaflet.motion polyline for smooth animation. No zoom changes.
 * Double-click to skip. Turns advanced after animation completes.
 *
 * MUST be rendered inside a MapContainer.
 */

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { SailingState } from '../../game/types';
import { calculateAnimationDuration } from '../../game/sailing';
import { getSeaRoute } from '../../game/sea-routes';
import type { SailingTurnResult } from '../../game/sailing';

import 'leaflet.motion/dist/leaflet.motion.js';

interface MotionLayer {
  motionStart: () => void;
  motionStop: () => void;
  on: (event: string, fn: (...args: unknown[]) => void) => MotionLayer;
  addTo: (map: L.Map) => MotionLayer;
  remove: () => MotionLayer;
}

type LeafletWithMotion = typeof L & {
  motion: {
    polyline: (
      latlngs: [number, number][],
      options: Record<string, unknown>,
      motionOptions: { auto?: boolean; duration?: number },
      markerOptions?: { icon?: L.DivIcon; showMarker?: boolean; removeOnEnd?: boolean }
    ) => MotionLayer;
  };
};

function createShipIcon(): L.DivIcon {
  return L.divIcon({
    className: 'ship-icon',
    html: `<div style="width:64px;height:40px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(2px 2px 4px rgba(0,0,0,0.3));">
      <img src="resource-image:///trireme.png" width="64" height="40" style="object-fit:contain;" alt="trireme" />
    </div>`,
    iconSize: [64, 40],
    iconAnchor: [32, 20],
  });
}

interface ShipMarkerProps {
  sailingState: SailingState;
  portCoords: Map<string, [number, number]>;
  onTurnAdvanced?: (result: SailingTurnResult) => void;
  onVoyageStarted?: (totalTurns: number) => void;
}

export default function ShipMarker({
  sailingState,
  portCoords,
  onTurnAdvanced,
  onVoyageStarted,
}: ShipMarkerProps): null {
  const map = useMap();
  const motionRef = useRef<MotionLayer | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);
  const doneRef = useRef(false);

  const { destination, departurePortId } = sailingState;

  useEffect(() => {
    const destCoords = portCoords.get(destination);
    const deptCoords = departurePortId ? portCoords.get(departurePortId) : undefined;
    if (!destCoords) return;

    doneRef.current = false;

    const start: [number, number] = deptCoords ?? [destCoords[0] - 0.5, destCoords[1] - 0.5];
    const route = getSeaRoute(departurePortId ?? '', destination, start, destCoords);

    // Cleanup previous
    if (motionRef.current) { motionRef.current.motionStop(); map.removeLayer(motionRef.current as unknown as L.Layer); }
    if (routeRef.current) { map.removeLayer(routeRef.current); }

    // Dashed route line
    const line = L.polyline(route, { color: '#7a5c45', weight: 2, dashArray: '10, 8', opacity: 0.7 });
    line.addTo(map);
    routeRef.current = line;

    const totalTurns = sailingState.voyageTurnsTotal ?? 1;
    const durationMs = calculateAnimationDuration(totalTurns);

    onVoyageStarted?.(totalTurns);

    const lm = L as LeafletWithMotion;

    // Single smooth animation along full route
    const motion = lm.motion.polyline(
      route,
      { color: 'transparent', weight: 0 },
      { auto: true, duration: durationMs },
      { icon: createShipIcon(), showMarker: true, removeOnEnd: false },
    );
    motionRef.current = motion;
    motion.addTo(map);

    // When animation finishes, advance all turns and arrive
    async function finishVoyage() {
      if (doneRef.current) return;
      doneRef.current = true;

      // Stop and clean up animation
      if (motionRef.current) {
        motionRef.current.motionStop();
        map.removeLayer(motionRef.current as unknown as L.Layer);
        motionRef.current = null;
      }
      if (routeRef.current) {
        map.removeLayer(routeRef.current);
        routeRef.current = null;
      }

      // Advance all turns
      for (let i = 0; i < totalTurns; i++) {
        try {
          const result = await window.api.game.advanceSailingTurn();
          if (result.success && result.data) {
            onTurnAdvanced?.(result.data);
            if (result.data.event !== null) {
              // Wait for event resolution — accept 'sailing' OR 'idle' (last turn)
              await new Promise<void>(resolve => {
                const timeout = setTimeout(() => resolve(), 30000); // 30s safety
                const unsub = window.api.subscribe('game:updated', (data: unknown) => {
                  const t = (data as { type: string }).type;
                  if (t === 'sailing' || t === 'idle') {
                    clearTimeout(timeout);
                    unsub();
                    resolve();
                  }
                });
              });
            }
            if (result.data.arrived) break;
          }
        } catch {
          break; // Don't hang on IPC errors
        }
      }

      // Arrive at destination — try both actions, ignore errors if already transitioned
      try { await window.api.game.action({ type: 'ARRIVE' }); } catch { /* may already be idle */ }
      try { await window.api.game.action({ type: 'START_TRADE', port: destination }); } catch { /* non-fatal */ }
    }

    motion.on('motion-ended', () => { void finishVoyage(); });

    // Double-click to skip
    function handleSkip() { void finishVoyage(); }
    map.getContainer().addEventListener('dblclick', handleSkip);

    return () => {
      doneRef.current = true;
      map.getContainer().removeEventListener('dblclick', handleSkip);
      if (motionRef.current) { motionRef.current.motionStop(); map.removeLayer(motionRef.current as unknown as L.Layer); motionRef.current = null; }
      if (routeRef.current) { map.removeLayer(routeRef.current); routeRef.current = null; }
    };
  }, [map, destination, departurePortId, portCoords]);

  return null;
}

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
    html: `<div style="width:36px;height:24px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(1px 1px 2px rgba(61,43,31,0.4));">
      <svg width="36" height="24" viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M2,16 Q4,20 18,20 Q32,20 35,16 L33,14 Q30,18 18,18 Q6,18 3,14 Z" fill="#7a5c45" stroke="#3d2b1f" stroke-width="0.8"/>
        <path d="M35,16 L36,15 L35,14.5" fill="#5a3e2b" stroke="#3d2b1f" stroke-width="0.5"/>
        <path d="M5,15 Q18,13 31,15" fill="none" stroke="#3d2b1f" stroke-width="0.6"/>
        <line x1="18" y1="14" x2="18" y2="3" stroke="#3d2b1f" stroke-width="1.2"/>
        <path d="M18,4 Q24,6 26,10 L18,12 Z" fill="#f8edd8" stroke="#7a5c45" stroke-width="0.6"/>
        <path d="M18,4 Q12,6 10,10 L18,12 Z" fill="#efe0c8" stroke="#7a5c45" stroke-width="0.6"/>
        <line x1="10" y1="17" x2="8" y2="21" stroke="#5a3e2b" stroke-width="0.5" opacity="0.7"/>
        <line x1="14" y1="17" x2="12" y2="21" stroke="#5a3e2b" stroke-width="0.5" opacity="0.7"/>
        <line x1="18" y1="17" x2="16" y2="21" stroke="#5a3e2b" stroke-width="0.5" opacity="0.7"/>
        <line x1="22" y1="17" x2="20" y2="21" stroke="#5a3e2b" stroke-width="0.5" opacity="0.7"/>
        <line x1="26" y1="17" x2="24" y2="21" stroke="#5a3e2b" stroke-width="0.5" opacity="0.7"/>
        <path d="M2,16 Q1,12 3,10" fill="none" stroke="#3d2b1f" stroke-width="0.8"/>
      </svg>
    </div>`,
    iconSize: [36, 24],
    iconAnchor: [18, 12],
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
        const result = await window.api.game.advanceSailingTurn();
        if (result.success && result.data) {
          onTurnAdvanced?.(result.data);
          if (result.data.event !== null) {
            // Wait for event resolution
            await new Promise<void>(resolve => {
              const unsub = window.api.subscribe('game:updated', (data: unknown) => {
                if ((data as { type: string }).type === 'sailing') { unsub(); resolve(); }
              });
            });
          }
          if (result.data.arrived) break;
        }
      }

      // Arrive at destination
      await window.api.game.action({ type: 'ARRIVE' });
      await window.api.game.action({ type: 'START_TRADE', port: destination });
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

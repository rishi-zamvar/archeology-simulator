/**
 * ShipMarker -- animated ship marker with smooth sea route animation.
 *
 * Uses a single leaflet.motion polyline along the full sea route for
 * smooth continuous animation. No zoom forcing — camera gently pans.
 * Double-click anywhere to skip the animation and arrive instantly.
 *
 * MUST be rendered inside a MapContainer (uses useMap() hook internally).
 */

import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { SailingState } from '../../game/types';
import { calculateAnimationDuration } from '../../game/sailing';
import { getSeaRoute } from '../../game/sea-routes';
import type { SailingTurnResult } from '../../game/sailing';

// Import leaflet.motion for side-effects
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
      motionOptions: { auto?: boolean; duration?: number; speed?: number },
      markerOptions?: { icon?: L.Icon | L.DivIcon; showMarker?: boolean; removeOnEnd?: boolean }
    ) => MotionLayer;
  };
};

// Ship icon -- SVG trireme
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
  const motionLayerRef = useRef<MotionLayer | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const cleanedUpRef = useRef(false);
  const skipRequestedRef = useRef(false);

  const { destination, departurePortId } = sailingState;

  // Double-click to skip animation
  const handleSkip = useCallback(() => {
    skipRequestedRef.current = true;
  }, []);

  useEffect(() => {
    const destCoords = portCoords.get(destination);
    const deptCoords = departurePortId ? portCoords.get(departurePortId) : undefined;

    if (!destCoords) return;

    cleanedUpRef.current = false;
    skipRequestedRef.current = false;

    const startCoords: [number, number] = deptCoords ?? [destCoords[0] - 0.5, destCoords[1] - 0.5];
    const endCoords: [number, number] = destCoords;

    // Build sea route with waypoints
    const seaRoute = getSeaRoute(departurePortId ?? '', destination, startCoords, endCoords);

    // Clean up previous layers
    if (motionLayerRef.current) {
      motionLayerRef.current.motionStop();
      map.removeLayer(motionLayerRef.current as unknown as L.Layer);
      motionLayerRef.current = null;
    }
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    // Dashed route line
    const routeLine = L.polyline(seaRoute, {
      color: '#7a5c45',
      weight: 2,
      dashArray: '10, 8',
      opacity: 0.7,
    });
    routeLine.addTo(map);
    routeLineRef.current = routeLine;

    const totalTurns = sailingState.voyageTurnsTotal ?? 1;
    const totalMs = calculateAnimationDuration(totalTurns);

    // Don't force zoom — just gently pan to show the route without changing zoom level
    const routeBounds = L.latLngBounds(seaRoute.map(p => L.latLng(p[0], p[1])));
    map.flyToBounds(routeBounds.pad(0.3), { duration: 1, maxZoom: map.getZoom() });

    onVoyageStarted?.(totalTurns);

    const lm = L as LeafletWithMotion;

    // Listen for double-click to skip
    map.getContainer().addEventListener('dblclick', handleSkip);

    // Single smooth animation along the full route
    const motionLayer = lm.motion.polyline(
      seaRoute,
      { color: 'transparent', weight: 0 },
      { auto: true, duration: totalMs },
      { icon: createShipIcon(), showMarker: true, removeOnEnd: false },
    );

    motionLayerRef.current = motionLayer;
    motionLayer.addTo(map);

    // Advance turns on a timer (evenly spaced across animation)
    const msPerTurn = totalMs / totalTurns;
    let turnsAdvanced = 0;

    const turnTimer = setInterval(async () => {
      if (cleanedUpRef.current || turnsAdvanced >= totalTurns) {
        clearInterval(turnTimer);
        return;
      }

      turnsAdvanced++;
      const result = await window.api.game.advanceSailingTurn();

      if (cleanedUpRef.current) return;

      if (result.success && result.data) {
        onTurnAdvanced?.(result.data);

        if (result.data.event !== null) {
          // Pause animation for event
          motionLayer.motionStop();
          await waitForSailingResume();
          if (cleanedUpRef.current) return;
          motionLayer.motionStart();
        }

        if (result.data.arrived || skipRequestedRef.current) {
          clearInterval(turnTimer);
          // Skip remaining turns if double-clicked
          if (skipRequestedRef.current && !result.data.arrived) {
            while (turnsAdvanced < totalTurns) {
              turnsAdvanced++;
              const skipResult = await window.api.game.advanceSailingTurn();
              if (skipResult.success && skipResult.data) {
                onTurnAdvanced?.(skipResult.data);
                if (skipResult.data.arrived) break;
              }
            }
          }
          // Arrive
          motionLayer.motionStop();
          map.removeLayer(motionLayer as unknown as L.Layer);
          motionLayerRef.current = null;
          await window.api.game.action({ type: 'ARRIVE' });
          if (cleanedUpRef.current) return;
          await window.api.game.action({ type: 'START_TRADE', port: destination });
          return;
        }
      }
    }, msPerTurn);

    // Also handle motion-ended (animation finished naturally)
    motionLayer.on('motion-ended', async () => {
      clearInterval(turnTimer);
      if (cleanedUpRef.current) return;

      // Advance any remaining turns
      while (turnsAdvanced < totalTurns) {
        turnsAdvanced++;
        const result = await window.api.game.advanceSailingTurn();
        if (result.success && result.data) {
          onTurnAdvanced?.(result.data);
          if (result.data.arrived) break;
        }
      }

      motionLayer.motionStop();
      map.removeLayer(motionLayer as unknown as L.Layer);
      motionLayerRef.current = null;

      await window.api.game.action({ type: 'ARRIVE' });
      if (cleanedUpRef.current) return;
      await window.api.game.action({ type: 'START_TRADE', port: destination });
    });

    // Gentle camera follow using a periodic pan
    const followTimer = setInterval(() => {
      if (cleanedUpRef.current) {
        clearInterval(followTimer);
        return;
      }
      // Pan toward the destination gradually
      const progress = Math.min(1, turnsAdvanced / totalTurns);
      const idx = Math.min(seaRoute.length - 1, Math.floor(progress * (seaRoute.length - 1)));
      const target = seaRoute[idx];
      map.panTo(target, { animate: true, duration: 1, noMoveStart: true });
    }, 2000);

    function waitForSailingResume(): Promise<void> {
      return new Promise<void>((resolve) => {
        const unsubscribe = window.api.subscribe('game:updated', (data: unknown) => {
          const state = data as { type: string };
          if (state.type === 'sailing') {
            unsubscribe();
            resolve();
          }
        });
        const checkCleanup = setInterval(() => {
          if (cleanedUpRef.current) {
            clearInterval(checkCleanup);
            unsubscribe();
            resolve();
          }
        }, 200);
      });
    }

    return () => {
      cleanedUpRef.current = true;
      clearInterval(turnTimer);
      clearInterval(followTimer);
      map.getContainer().removeEventListener('dblclick', handleSkip);
      if (motionLayerRef.current) {
        motionLayerRef.current.motionStop();
        map.removeLayer(motionLayerRef.current as unknown as L.Layer);
        motionLayerRef.current = null;
      }
      if (routeLineRef.current) {
        map.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
      }
    };
  }, [map, destination, departurePortId, portCoords]);

  return null;
}

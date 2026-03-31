/**
 * ShipMarker -- animated ship marker with per-turn segmented animation.
 *
 * Phase 11 rewrite: replaces single-shot 5s animation with a turn-stepping
 * loop that calls advanceSailingTurn IPC per segment, pauses for event
 * resolution, and provides callbacks for the sailing overlay.
 *
 * Features:
 * - Static dashed sepia route line (SAIL-01)
 * - Distance-proportional animation duration (SAIL-02)
 * - Camera follow via map.panTo() (SAIL-03)
 * - Per-turn IPC calls driving animation with event pause/resume (SAIL-05)
 *
 * MUST be rendered inside a MapContainer (uses useMap() hook internally).
 * Renders nothing when gameState is not 'sailing'.
 *
 * leaflet.motion attaches to the global Leaflet `L` object -- no TS types,
 * so we import it for side-effects and cast L to access the motion API.
 */

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { SailingState } from '../../game/types';
import { calculateAnimationDuration, interpolateLatLng } from '../../game/sailing';
import type { SailingTurnResult } from '../../game/sailing';

// Import leaflet.motion for side-effects -- it mutates the global L
import 'leaflet.motion/dist/leaflet.motion.js';

// leaflet.motion layer type (duck-typed since there are no TS bindings)
interface MotionLayer {
  motionStart: () => void;
  motionStop: () => void;
  on: (event: string, fn: (...args: unknown[]) => void) => MotionLayer;
  addTo: (map: L.Map) => MotionLayer;
  remove: () => MotionLayer;
}

// Cast for accessing the motion API added to L by the side-effect import
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

// Ship icon -- SVG boat shape oriented east
function createShipIcon(): L.DivIcon {
  return L.divIcon({
    className: 'ship-icon',
    html: `<div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
      <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(10,10) rotate(-90)">
          <ellipse cx="0" cy="0" rx="7" ry="3.5" fill="#7a5c45" stroke="#3d2b1f" stroke-width="1"/>
          <line x1="0" y1="-3.5" x2="0" y2="-9" stroke="#3d2b1f" stroke-width="1.5"/>
          <path d="M0,-9 L5,-6 L0,-3.5 Z" fill="#f8edd8" stroke="#7a5c45" stroke-width="0.5"/>
        </g>
      </svg>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

interface ShipMarkerProps {
  sailingState: SailingState;
  /** All port coordinates keyed by portId */
  portCoords: Map<string, [number, number]>;
  /** Called after each advanceSailingTurn IPC call with turn result */
  onTurnAdvanced?: (result: SailingTurnResult) => void;
  /** Called at the start of the animation loop with total turns */
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

  const { destination, departurePortId } = sailingState;

  useEffect(() => {
    const destCoords = portCoords.get(destination);
    const deptCoords = departurePortId ? portCoords.get(departurePortId) : undefined;

    if (!destCoords) return; // Can't animate without destination coords

    cleanedUpRef.current = false;

    // Start point: departure port if known, otherwise nearby offset
    const startCoords: [number, number] = deptCoords ?? [destCoords[0] - 0.5, destCoords[1] - 0.5];
    const endCoords: [number, number] = destCoords;

    // Remove any previous motion layer
    if (motionLayerRef.current) {
      motionLayerRef.current.motionStop();
      map.removeLayer(motionLayerRef.current as unknown as L.Layer);
      motionLayerRef.current = null;
    }

    // Remove any previous route line
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    // 1. Static dashed route line (SAIL-01)
    const routeLine = L.polyline([startCoords, endCoords], {
      color: '#7a5c45',
      weight: 2,
      dashArray: '10, 8',
      opacity: 0.7,
    });
    routeLine.addTo(map);
    routeLineRef.current = routeLine;

    // 2. Calculate distance-proportional duration (SAIL-02)
    const totalTurns = sailingState.voyageTurnsTotal ?? 1;
    const totalMs = calculateAnimationDuration(totalTurns);
    const msPerTurn = totalMs / totalTurns;

    // 4. Camera: frame the full route initially (SAIL-03)
    map.fitBounds(L.latLngBounds(startCoords, endCoords).pad(0.2));

    // Notify overlay of voyage start
    onVoyageStarted?.(totalTurns);

    const lm = L as LeafletWithMotion;

    // 3. Segmented per-turn animation loop (SAIL-05)
    async function runVoyageAnimation() {
      for (let i = 0; i < totalTurns; i++) {
        if (cleanedUpRef.current) return;

        // Compute segment start/end via interpolation
        const t0 = i / totalTurns;
        const t1 = (i + 1) / totalTurns;
        const segStart = interpolateLatLng(startCoords, endCoords, t0);
        const segEnd = interpolateLatLng(startCoords, endCoords, t1);

        // Create a leaflet.motion polyline for this segment
        const segmentLayer = lm.motion.polyline(
          [segStart, segEnd],
          { color: 'transparent', weight: 0 },
          { auto: true, duration: msPerTurn },
          { icon: createShipIcon(), showMarker: true, removeOnEnd: false },
        );

        // Wait for segment animation to complete
        await new Promise<void>((resolve) => {
          segmentLayer.on('motion-ended', () => {
            resolve();
          });
          segmentLayer.addTo(map);
        });

        if (cleanedUpRef.current) {
          map.removeLayer(segmentLayer as unknown as L.Layer);
          return;
        }

        // Remove the segment motion layer
        segmentLayer.motionStop();
        map.removeLayer(segmentLayer as unknown as L.Layer);

        // Camera follow: pan to segment end (SAIL-03)
        map.panTo(segEnd, { animate: true, duration: 0.3 });

        // Call advanceSailingTurn IPC
        const result = await window.api.game.advanceSailingTurn();
        if (cleanedUpRef.current) return;

        if (result.success && result.data) {
          // Notify overlay of turn result
          onTurnAdvanced?.(result.data);

          // If an event occurred, wait for the game state to return to 'sailing'
          if (result.data.event !== null) {
            await waitForSailingResume();
            if (cleanedUpRef.current) return;
          }

          // If arrived, fire ARRIVE and START_TRADE, then break
          if (result.data.arrived) {
            await window.api.game.action({ type: 'ARRIVE' });
            if (cleanedUpRef.current) return;
            await window.api.game.action({ type: 'START_TRADE', port: destination });
            return;
          }
        }
      }
    }

    /**
     * Wait for the game state to return to 'sailing' after an encounter.
     * Subscribes to game:updated events and resolves when type === 'sailing'.
     */
    function waitForSailingResume(): Promise<void> {
      return new Promise<void>((resolve) => {
        const unsubscribe = window.api.subscribe('game:updated', (data: unknown) => {
          const state = data as { type: string };
          if (state.type === 'sailing') {
            unsubscribe();
            resolve();
          }
        });

        // Safety: if component unmounts while waiting, resolve to avoid dangling promise
        const checkCleanup = setInterval(() => {
          if (cleanedUpRef.current) {
            clearInterval(checkCleanup);
            unsubscribe();
            resolve();
          }
        }, 200);
      });
    }

    void runVoyageAnimation();

    return () => {
      cleanedUpRef.current = true;
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

  // No JSX -- purely imperative Leaflet layer management
  return null;
}

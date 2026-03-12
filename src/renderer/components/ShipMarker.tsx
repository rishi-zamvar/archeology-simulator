/**
 * ShipMarker — animated ship marker that follows a polyline during SailingState.
 *
 * Uses leaflet.motion (L.motion.polyline) to animate a ship icon along the
 * great-circle path between departure and destination ports.
 *
 * MUST be rendered inside a MapContainer (uses useMap() hook internally).
 * Renders nothing when gameState is not 'sailing'.
 *
 * leaflet.motion attaches to the global Leaflet `L` object — no TS types,
 * so we import it for side-effects and cast L to access the motion API.
 */

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { SailingState } from '../../game/types';

// Import leaflet.motion for side-effects — it mutates the global L
import 'leaflet.motion/dist/leaflet.motion.js';

// leaflet.motion layer type (duck-typed since there are no TS bindings)
interface MotionLayer extends L.Layer {
  motionStart: () => void;
  motionStop: () => void;
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

// Ship icon — SVG boat shape oriented east
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
}

export default function ShipMarker({ sailingState, portCoords }: ShipMarkerProps): null {
  const map = useMap();
  const motionLayerRef = useRef<MotionLayer | null>(null);

  const { destination, departurePortId } = sailingState;

  useEffect(() => {
    const destCoords = portCoords.get(destination);
    const deptCoords = departurePortId ? portCoords.get(departurePortId) : undefined;

    if (!destCoords) return; // Can't animate without destination coords

    // Start point: departure port if known, otherwise nearby offset
    const startCoords: [number, number] = deptCoords ?? [destCoords[0] - 0.5, destCoords[1] - 0.5];
    const endCoords: [number, number] = destCoords;

    // Remove any previous motion layer
    if (motionLayerRef.current) {
      motionLayerRef.current.motionStop();
      map.removeLayer(motionLayerRef.current);
      motionLayerRef.current = null;
    }

    const lm = L as LeafletWithMotion;

    // 30-second animation (visual feedback; actual game time tracked by FSM)
    const motionLayer = lm.motion.polyline(
      [startCoords, endCoords],
      {
        color: 'transparent',
        weight: 0,
      },
      {
        auto: true,
        duration: 30_000,
      },
      {
        icon: createShipIcon(),
        showMarker: true,
        removeOnEnd: false,
      }
    );

    motionLayer.addTo(map);
    motionLayerRef.current = motionLayer;

    return () => {
      if (motionLayerRef.current) {
        motionLayerRef.current.motionStop();
        map.removeLayer(motionLayerRef.current);
        motionLayerRef.current = null;
      }
    };
  }, [map, destination, departurePortId, portCoords]);

  // No JSX — purely imperative Leaflet layer management
  return null;
}

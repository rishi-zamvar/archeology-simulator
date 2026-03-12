/**
 * PortMarker — a single Leaflet Marker for a historical Mediterranean port.
 *
 * Renders a parchment-styled divIcon circle with the port's ancient name
 * as a permanent Tooltip. Clicking the marker dispatches port selection
 * to the parent via onPortClick.
 *
 * Must be rendered inside a MapContainer (via MarkerClusterGroup in MapArea).
 */

import React, { useCallback } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { Port } from '../../shared/game-types';

interface PortMarkerProps {
  port: Port;
  onPortClick: (portId: string) => void;
}

// Parchment-styled circle icon for port markers
function createPortIcon(): L.DivIcon {
  return L.divIcon({
    className: 'port-icon',
    html: `<div class="port-icon-inner"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    tooltipAnchor: [8, -4],
  });
}

export default function PortMarker({ port, onPortClick }: PortMarkerProps): React.ReactElement {
  const icon = createPortIcon();

  const handleClick = useCallback(() => {
    onPortClick(port.id);
  }, [port.id, onPortClick]);

  return (
    <Marker
      position={[port.lat, port.lng]}
      icon={icon}
      eventHandlers={{ click: handleClick }}
    >
      <Tooltip
        permanent
        direction="top"
        offset={[0, -10]}
        className="port-label"
      >
        {port.ancientName}
      </Tooltip>
    </Marker>
  );
}

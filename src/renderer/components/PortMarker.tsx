/**
 * PortMarker — a single Leaflet Marker for a historical Mediterranean port.
 *
 * Renders a tiered divIcon based on access level:
 *   - unknown: grey/faded circle with "?" tooltip
 *   - discovered: parchment-styled circle with port name (default)
 *   - unlocked: gold circle with port name
 *
 * Must be rendered inside a MapContainer (via MarkerClusterGroup in MapArea).
 */

import React, { useCallback, useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { Port, PortAccessLevel } from '../../shared/game-types';

interface PortMarkerProps {
  port: Port;
  accessLevel: PortAccessLevel;
  isQuestTarget?: boolean;
  onPortClick: (portId: string) => void;
}

// Tiered divIcon based on access level + quest target highlight
function createPortIcon(accessLevel: PortAccessLevel, isQuestTarget: boolean): L.DivIcon {
  let innerClass = 'port-icon-inner';
  if (isQuestTarget) {
    innerClass = 'port-icon-inner port-icon-inner-quest';
  } else if (accessLevel === 'unknown') {
    innerClass = 'port-icon-inner port-icon-inner-unknown';
  } else if (accessLevel === 'unlocked') {
    innerClass = 'port-icon-inner port-icon-inner-unlocked';
  }

  return L.divIcon({
    className: 'port-icon',
    html: `<div class="${innerClass}"></div>`,
    iconSize: isQuestTarget ? [18, 18] : [14, 14],
    iconAnchor: isQuestTarget ? [9, 9] : [7, 7],
    tooltipAnchor: [8, -4],
  });
}

export default function PortMarker({ port, accessLevel, isQuestTarget = false, onPortClick }: PortMarkerProps): React.ReactElement {
  const icon = useMemo(() => createPortIcon(accessLevel, isQuestTarget), [accessLevel, isQuestTarget]);

  const handleClick = useCallback(() => {
    onPortClick(port.id);
  }, [port.id, onPortClick]);

  const tooltipClass = isQuestTarget
    ? 'port-label port-label-quest'
    : accessLevel === 'unknown'
      ? 'port-label port-label-unknown'
      : 'port-label';
  const tooltipText = accessLevel === 'unknown' ? '?' : port.ancientName;

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
        className={tooltipClass}
      >
        {tooltipText}
      </Tooltip>
    </Marker>
  );
}

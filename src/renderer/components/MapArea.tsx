/**
 * MapArea — Leaflet map of the ancient Mediterranean.
 *
 * Replaces the Phase 1 placeholder. Renders:
 *   - OpenStreetMap TileLayer with sepia/parchment CSS filter
 *   - MarkerClusterGroup containing PortMarker for all 25 historical ports
 *   - Children slot for ShipMarker (needs to be inside MapContainer context)
 *
 * Port data is loaded once on mount via useMapPorts hook.
 * Port click dispatches to uiStore: sets selectedPortId and opens left panel.
 */

import React, { useCallback, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useMapPorts } from '../hooks/useMapPorts';
import { useUIStore } from '../stores/uiStore';
import PortMarker from './PortMarker';

interface MapAreaProps {
  children?: React.ReactNode;
  onPortSelected?: () => void;
  onRefreshAccessReady?: (refreshAccess: () => void) => void;
}

export default function MapArea({ children, onPortSelected, onRefreshAccessReady }: MapAreaProps): React.ReactElement {
  const { ports, portAccessMap, isLoading, error, refreshAccess } = useMapPorts();
  const { setSelectedPort } = useUIStore();

  // Report refreshAccess to parent (Shell) so it can trigger re-fetch after auto-discover
  useEffect(() => {
    onRefreshAccessReady?.(refreshAccess);
  }, [refreshAccess, onRefreshAccessReady]);

  const handlePortClick = useCallback((portId: string) => {
    setSelectedPort(portId);
    // Transition game FSM to trading state so buy/sell IPC works
    window.api.game.action({ type: 'START_TRADE', port: portId }).catch(() => {
      // Non-fatal: panels still show data, just can't buy/sell without trading state
    });
    // Notify parent to switch to port scene view
    onPortSelected?.();
  }, [setSelectedPort, onPortSelected]);

  if (error) {
    return (
      <div
        data-testid="map-area"
        className="flex-1 flex items-center justify-center"
        style={{ background: '#f0d9b5', color: '#7a5c45', fontFamily: 'Cinzel, serif' }}
      >
        Failed to load map data: {error.message}
      </div>
    );
  }

  return (
    <div
      data-testid="map-area"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <MapContainer
        center={[37.5, 20]}
        zoom={5}
        minZoom={4}
        maxZoom={10}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={false}
      >
        {/* Stamen Watercolor — painterly terrain with no modern roads or labels */}
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg"
          attribution="&copy; Stamen Design &copy; OpenStreetMap contributors"
        />

        {/* Port markers — clustered for performance at low zoom levels */}
        {!isLoading && ports.length > 0 && (
          <MarkerClusterGroup
            chunkedLoading
            disableClusteringAtZoom={7}
            showCoverageOnHover={false}
            spiderfyOnMaxZoom={true}
          >
            {ports.map((port) => (
              <PortMarker
                key={port.id}
                port={port}
                accessLevel={portAccessMap.get(port.id) ?? 'unknown'}
                onPortClick={handlePortClick}
              />
            ))}
          </MarkerClusterGroup>
        )}

        {/* ShipMarker and other children needing MapContainer context */}
        {children}
      </MapContainer>

      {/* Loading overlay — fades away once ports are ready */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(248, 237, 216, 0.7)',
            zIndex: 1000,
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: '0.875rem',
            color: '#7a5c45',
            letterSpacing: '0.1em',
          }}
        >
          Loading ports...
        </div>
      )}
    </div>
  );
}

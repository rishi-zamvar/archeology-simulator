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

import React, { useCallback } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useMapPorts } from '../hooks/useMapPorts';
import { useUIStore } from '../stores/uiStore';
import PortMarker from './PortMarker';

interface MapAreaProps {
  children?: React.ReactNode;
}

export default function MapArea({ children }: MapAreaProps): React.ReactElement {
  const { ports, isLoading, error } = useMapPorts();
  const { setSelectedPort, openLeftPanel } = useUIStore();

  const handlePortClick = useCallback((portId: string) => {
    setSelectedPort(portId);
    openLeftPanel();
  }, [setSelectedPort, openLeftPanel]);

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
        flex: 1,
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
        {/* OpenStreetMap tiles — sepia filter applied via .leaflet-tile in CSS */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
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

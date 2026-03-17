/**
 * PortInfoPanel — left panel content shown when a port is selected on the map.
 *
 * Shows:
 *   - Port ancient name (heading) and modern name (subtitle)
 *   - Historical description
 *   - Reachable destinations: up to 5 nearest, with distance in km,
 *     voyage duration in turns, and "Sail" button
 *
 * Uses an AbortController-inspired cancelled flag pattern to avoid
 * setting state after unmount or after portId has changed (stale responses).
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { Port, VoyageRoute } from '../../shared/game-types';

interface ReachableDestination {
  port: Port;
  route: VoyageRoute;
}

interface PortInfoPanelProps {
  portId: string;
  onClose: () => void;
  onNavigate: (destinationPortId: string) => void;
}

export default function PortInfoPanel({
  portId,
  onClose,
  onNavigate,
}: PortInfoPanelProps): React.ReactElement {
  const [port, setPort] = useState<Port | null>(null);
  const [destinations, setDestinations] = useState<ReachableDestination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setPort(null);
    setDestinations([]);

    // Fetch port details and reachable destinations in parallel
    Promise.all([
      window.api.game.getPortDetails(portId),
      window.api.game.getReachablePorts(portId),
    ])
      .then(([portRes, reachableRes]) => {
        if (cancelled) return;
        if (!portRes.success) throw new Error(portRes.error);
        if (!reachableRes.success) throw new Error(reachableRes.error);
        setPort(portRes.data);
        // Sort by distance, take nearest 5
        const sorted = [...reachableRes.data].sort(
          (a, b) => a.route.distanceKm - b.route.distanceKm
        );
        setDestinations(sorted.slice(0, 5));
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [portId]);

  const handleSail = useCallback(
    (destPortId: string) => {
      onNavigate(destPortId);
    },
    [onNavigate]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '1rem',
        overflowY: 'auto',
      }}
    >
      {/* Header row: port name + close button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}
      >
        <div style={{ flex: 1 }}>
          {port ? (
            <>
              <h2
                style={{
                  fontFamily: "'Cinzel', 'Palatino Linotype', Georgia, serif",
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#3d2b1f',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {port.ancientName}
              </h2>
              <p
                style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: '0.75rem',
                  color: '#7a5c45',
                  margin: '2px 0 0',
                  fontStyle: 'italic',
                }}
              >
                {port.modernName}
              </p>
            </>
          ) : (
            <div
              style={{
                height: '2rem',
                background: 'rgba(196, 149, 106, 0.2)',
                borderRadius: 2,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          )}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close port panel"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#7a5c45',
            fontSize: '1rem',
            padding: '2px 4px',
            marginLeft: '0.5rem',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Divider */}
      <div
        style={{
          borderTop: '1px solid #c4956a',
          marginBottom: '0.75rem',
          opacity: 0.5,
        }}
      />

      {/* Loading state */}
      {isLoading && (
        <div
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.8rem',
            color: '#7a5c45',
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: '2rem',
          }}
        >
          Loading port data...
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.8rem',
            color: '#9b4444',
            padding: '0.5rem',
          }}
        >
          {error.message}
        </div>
      )}

      {/* Port description */}
      {port && !isLoading && (
        <p
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.8rem',
            color: '#3d2b1f',
            lineHeight: 1.6,
            margin: '0 0 1rem',
          }}
        >
          {port.description}
        </p>
      )}

      {/* Historical context — cultural description */}
      {port && !isLoading && port.culturalDescription && (
        <div style={{ marginTop: '0.5rem', borderTop: '1px solid #c4956a', paddingTop: '1rem', marginBottom: '1rem' }}>
          <h4
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.65rem',
              color: '#7a5c45',
              marginBottom: '0.5rem',
              marginTop: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 700,
            }}
          >
            Historical Context
          </h4>
          <p
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.8rem',
              color: '#3d2b1f',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {port.culturalDescription}
          </p>
        </div>
      )}

      {/* Reachable destinations */}
      {!isLoading && destinations.length > 0 && (
        <>
          <h3
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#7a5c45',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: '0 0 0.5rem',
            }}
          >
            Destinations
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {destinations.map(({ port: dest, route }) => (
              <div
                key={dest.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.4rem 0.5rem',
                  backgroundColor: 'rgba(196, 149, 106, 0.08)',
                  border: '1px solid rgba(196, 149, 106, 0.3)',
                  borderRadius: 2,
                }}
              >
                {/* Destination name and stats */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "'Cinzel', Georgia, serif",
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#3d2b1f',
                      letterSpacing: '0.05em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {dest.ancientName}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: '0.65rem',
                      color: '#7a5c45',
                      marginTop: '1px',
                    }}
                  >
                    {Math.round(route.distanceKm)} km &middot; {route.durationTurns}{' '}
                    {route.durationTurns === 1 ? 'day' : 'days'}
                  </div>
                </div>

                {/* Sail button */}
                <button
                  type="button"
                  onClick={() => handleSail(dest.id)}
                  aria-label={`Sail to ${dest.ancientName}`}
                  style={{
                    marginLeft: '0.5rem',
                    padding: '3px 8px',
                    backgroundColor: '#c4956a',
                    border: '1px solid #7a5c45',
                    borderRadius: 2,
                    color: '#fdf8f0',
                    fontFamily: "'Cinzel', Georgia, serif",
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#b8894a';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#c4956a';
                  }}
                >
                  Sail
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* No destinations fallback */}
      {!isLoading && !error && destinations.length === 0 && port && (
        <p
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.75rem',
            color: '#7a5c45',
            fontStyle: 'italic',
          }}
        >
          No reachable destinations found.
        </p>
      )}
    </div>
  );
}

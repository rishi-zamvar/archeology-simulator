/**
 * PortInfoPanel — left panel content shown when a port is selected on the map.
 *
 * Shows:
 *   - Port ancient name (heading) and modern name (subtitle)
 *   - Historical description
 *   - Reachable destinations: ports within 2 months sailing, with distance
 *     in km, voyage duration in months, and "Sail" button
 *
 * Uses an AbortController-inspired cancelled flag pattern to avoid
 * setting state after unmount or after portId has changed (stale responses).
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { Port, VoyageRoute, PortLore } from '../../shared/game-types';

interface ReachableDestination {
  port: Port;
  route: VoyageRoute;
}

interface PortInfoPanelProps {
  portId: string;
  currentTurn?: number;
  onClose: () => void;
  onNavigate: (destinationPortId: string) => void;
}

export default function PortInfoPanel({
  portId,
  currentTurn,
  onClose,
  onNavigate,
}: PortInfoPanelProps): React.ReactElement {
  const [port, setPort] = useState<Port | null>(null);
  const [destinations, setDestinations] = useState<ReachableDestination[]>([]);
  const [lore, setLore] = useState<PortLore | null>(null);
  const [reputation, setReputation] = useState<{ tierName: string; tierLevel: number; score: number; region: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setPort(null);
    setDestinations([]);
    setLore(null);
    setReputation(null);

    // Fetch port details, reachable destinations, lore, and reputation in parallel
    Promise.all([
      window.api.game.getPortDetails(portId),
      window.api.game.getReachablePorts(portId, currentTurn),
      window.api.game.getPortLore(portId),
      window.api.game.getPortReputation(portId),
    ])
      .then(([portRes, reachableRes, loreRes, repRes]) => {
        if (cancelled) return;
        if (!portRes.success) throw new Error(portRes.error);
        if (!reachableRes.success) throw new Error(reachableRes.error);
        setPort(portRes.data);
        // Sort by distance, take nearest 5
        const sorted = [...reachableRes.data].sort(
          (a, b) => a.route.distanceKm - b.route.distanceKm
        );
        setDestinations(sorted.slice(0, 5));
        if (loreRes.success && loreRes.data) setLore(loreRes.data);
        if (repRes.success && repRes.data) setReputation(repRes.data);
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
  }, [portId, currentTurn]);

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

      {/* Your Standing — reputation tier */}
      {port && !isLoading && reputation && (
        <div style={{ marginTop: '0.5rem', marginBottom: '0.75rem', padding: '0.5rem', backgroundColor: 'rgba(196, 149, 106, 0.08)', border: '1px solid rgba(196, 149, 106, 0.3)', borderRadius: 2 }}>
          <h4 style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: '#7a5c45', marginBottom: '0.3rem', marginTop: 0, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Your Standing
          </h4>
          <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.8rem', color: '#3d2b1f', margin: 0, lineHeight: 1.6 }}>
            {reputation.tierName}
            {reputation.tierLevel > 0 && (
              <span style={{ fontSize: '0.7rem', color: '#5a8f5a', marginLeft: '0.5rem' }}>
                ({reputation.tierLevel === 1 ? '5%' : reputation.tierLevel === 2 ? '10%' : '20%'} better prices)
              </span>
            )}
          </p>
        </div>
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

      {/* Port Lore */}
      {port && !isLoading && lore && (
        <div style={{ marginTop: '0.5rem', borderTop: '1px solid #c4956a', paddingTop: '1rem', marginBottom: '1rem' }}>
          <h4
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.65rem',
              color: '#7a5c45',
              marginBottom: '0.75rem',
              marginTop: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 700,
            }}
          >
            Port Lore
          </h4>

          {/* History */}
          <h5
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.6rem',
              color: '#7a5c45',
              marginBottom: '0.3rem',
              marginTop: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 700,
            }}
          >
            History
          </h5>
          <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.8rem', color: '#3d2b1f', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
            {lore.history}
          </p>

          {/* Culture & Daily Life */}
          <h5
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.6rem',
              color: '#7a5c45',
              marginBottom: '0.3rem',
              marginTop: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 700,
            }}
          >
            Culture &amp; Daily Life
          </h5>
          <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.8rem', color: '#3d2b1f', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
            {lore.culture}
          </p>

          {/* Trade Specialization */}
          <h5
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.6rem',
              color: '#7a5c45',
              marginBottom: '0.3rem',
              marginTop: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 700,
            }}
          >
            Trade Specialization
          </h5>
          <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '0.8rem', color: '#3d2b1f', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
            {lore.tradeSpecialization}
          </p>

          {/* Notable Facts */}
          {lore.notableFacts.length > 0 && (
            <>
              <h5
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.6rem',
                  color: '#7a5c45',
                  marginBottom: '0.3rem',
                  marginTop: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 700,
                }}
              >
                Notable Facts
              </h5>
              <ul style={{ margin: '0 0 0.75rem', paddingLeft: '1.2rem' }}>
                {lore.notableFacts.map((fact, i) => (
                  <li
                    key={i}
                    style={{
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: '0.75rem',
                      color: '#3d2b1f',
                      lineHeight: 1.6,
                      marginBottom: '0.2rem',
                    }}
                  >
                    {fact}
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Sources */}
          {lore.primarySources.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <p
                style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: '0.65rem',
                  color: '#7a5c45',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Sources: {lore.primarySources.join('; ')}
              </p>
            </div>
          )}
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
                    {route.durationTurns === 1 ? 'month' : 'months'}
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

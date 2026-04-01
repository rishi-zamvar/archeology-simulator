/**
 * PortInfoPanel — left panel content shown when a port is selected on the map.
 *
 * Content is gated by port access level:
 *   - Unknown: "Unknown Port" heading, rumor text, destinations only
 *   - Discovered: Port name, description, reputation, destinations, teaser for lore
 *   - Unlocked: Full content — name, description, reputation, lore, destinations
 *
 * Players can sail to any port regardless of access level.
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { Port, VoyageRoute, PortLore, PortAccessLevel } from '../../shared/game-types';

interface ReachableDestination {
  port: Port;
  route: VoyageRoute;
}

interface PortInfoPanelProps {
  portId: string;
  currentTurn?: number;
  onClose: () => void;
  onNavigate: (destinationPortId: string, durationTurns: number) => void;
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
  const [accessLevel, setAccessLevel] = useState<PortAccessLevel>('unknown');
  const [destAccessMap, setDestAccessMap] = useState<Map<string, string>>(new Map());
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
    setAccessLevel('unknown');

    // Fetch port details, reachable destinations, lore, reputation, and access level in parallel
    Promise.all([
      window.api.game.getPortDetails(portId),
      window.api.game.getReachablePorts(portId, currentTurn),
      window.api.game.getPortLore(portId),
      window.api.game.getPortReputation(portId),
      window.api.game.getPortAccessLevel(portId),
    ])
      .then(([portRes, reachableRes, loreRes, repRes, accessRes]) => {
        if (cancelled) return;
        if (!portRes.success) throw new Error(portRes.error);
        if (!reachableRes.success) throw new Error(reachableRes.error);
        setPort(portRes.data);
        // Sort by distance, take nearest 5
        const sorted = [...reachableRes.data].sort(
          (a, b) => a.route.distanceKm - b.route.distanceKm
        );
        setDestinations(sorted.slice(0, 8));
        if (loreRes.success && loreRes.data) setLore(loreRes.data);
        // Fetch access levels for all destination ports
        window.api?.game?.getAllPortAccess?.().then(accessRes => {
          if (accessRes?.success) {
            const map = new Map<string, string>();
            for (const info of accessRes.data) {
              map.set(info.portId, info.status);
            }
            setDestAccessMap(map);
          }
        }).catch(() => {});
        if (repRes.success && repRes.data) setReputation(repRes.data);
        if (accessRes.success) setAccessLevel(accessRes.data);
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
    (destPortId: string, durationTurns: number) => {
      onNavigate(destPortId, durationTurns);
    },
    [onNavigate]
  );

  // Derive display values based on access level
  const displayName = accessLevel === 'unknown' ? 'Unknown Port' : port?.ancientName ?? '';
  const displayModernName = accessLevel === 'unknown' ? null : port?.modernName;
  const displayDescription = accessLevel === 'unknown'
    ? 'You have heard rumors of a port in this region, but know little about it.'
    : port?.description ?? '';

  const showReputation = accessLevel !== 'unknown';
  const showLore = accessLevel === 'unlocked';
  const showCulturalDescription = accessLevel === 'unlocked';
  const showTeaser = accessLevel === 'discovered';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '1.25rem',
        overflowY: 'auto',
        scrollBehavior: 'smooth',
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
          {port || accessLevel === 'unknown' ? (
            <>
              <h2
                style={{
                  fontFamily: "'Cinzel', 'Palatino Linotype', Georgia, serif",
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: '#3d2b1f',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  margin: 0,
                  lineHeight: 1.3,
                  fontStyle: accessLevel === 'unknown' ? 'italic' : undefined,
                }}
              >
                {displayName}
              </h2>
              {displayModernName && (
                <p
                  style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: '0.78rem',
                    color: '#9a8570',
                    margin: '4px 0 0',
                    fontStyle: 'italic',
                  }}
                >
                  {displayModernName}
                </p>
              )}
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
      {(port || accessLevel === 'unknown') && !isLoading && (
        <p
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.85rem',
            color: '#3d2b1f',
            lineHeight: 1.7,
            margin: '0 0 1rem',
            fontStyle: accessLevel === 'unknown' ? 'italic' : undefined,
          }}
        >
          {displayDescription}
        </p>
      )}

      {/* Your Standing — reputation tier (hidden for unknown ports) */}
      {port && !isLoading && showReputation && reputation && (
        <div style={{ marginTop: '0.5rem', marginBottom: '0.75rem', padding: '0.5rem', backgroundColor: 'rgba(196, 149, 106, 0.08)', border: '1px solid rgba(196, 149, 106, 0.3)', borderRadius: 2 }}>
          <h4 style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', color: '#7a5c45', marginBottom: '0.35rem', marginTop: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
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

      {/* Historical context — cultural description (unlocked only) */}
      {port && !isLoading && showCulturalDescription && port.culturalDescription && (
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

      {/* Port Lore (unlocked only) */}
      {port && !isLoading && showLore && lore && (
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

      {/* Teaser for discovered ports — encourage unlocking */}
      {port && !isLoading && showTeaser && (
        <div
          style={{
            marginTop: '0.5rem',
            marginBottom: '0.75rem',
            padding: '0.5rem',
            backgroundColor: 'rgba(196, 149, 106, 0.08)',
            border: '1px dashed rgba(196, 149, 106, 0.5)',
            borderRadius: 2,
          }}
        >
          <p
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.75rem',
              color: '#7a5c45',
              fontStyle: 'italic',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Trade here or seek an introduction to learn more about this port.
          </p>
        </div>
      )}

      {/* Reachable destinations — only discovered/unlocked ports shown */}
      {!isLoading && destinations.length > 0 && (() => {
        // Filter to only show ports the player knows about
        const knownDestinations = destinations.filter(({ port: dest }) => {
          const destAccess = destAccessMap.get(dest.id);
          return destAccess === 'discovered' || destAccess === 'unlocked';
        });

        if (knownDestinations.length === 0) return null;

        return (
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {knownDestinations.map(({ port: dest, route }) => {
              const destAccess = destAccessMap.get(dest.id);
              const isNew = destAccess === 'discovered';

              return (
              <div
                key={dest.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.6rem',
                  backgroundColor: isNew ? 'rgba(212, 160, 23, 0.08)' : 'rgba(196, 149, 106, 0.06)',
                  border: isNew ? '1px solid rgba(212, 160, 23, 0.4)' : '1px solid rgba(196, 149, 106, 0.25)',
                  borderRadius: 6,
                  transition: 'background-color 0.2s ease',
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    {dest.ancientName}
                    {isNew && (
                      <span style={{
                        fontSize: '0.5rem',
                        fontWeight: 700,
                        color: '#d4a017',
                        backgroundColor: 'rgba(212, 160, 23, 0.15)',
                        padding: '1px 5px',
                        borderRadius: 3,
                        letterSpacing: '0.1em',
                      }}>
                        NEW
                      </span>
                    )}
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
                  onClick={() => handleSail(dest.id, route.durationTurns)}
                  aria-label={`Sail to ${dest.ancientName}`}
                  style={{
                    marginLeft: '0.5rem',
                    padding: '4px 10px',
                    backgroundColor: '#c4956a',
                    border: '1px solid #7a5c45',
                    borderRadius: 4,
                    color: '#fdf8f0',
                    fontFamily: "'Cinzel', Georgia, serif",
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background-color 0.2s ease, transform 0.15s ease',
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
              );
            })}
          </div>
        </>
        );
      })()}

      {/* No destinations fallback */}
      {!isLoading && !error && destinations.length === 0 && (port || accessLevel === 'unknown') && (
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

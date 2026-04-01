/**
 * SailingOverlay -- floating parchment overlay displaying voyage progress.
 *
 * Positioned top-center during sailing, shows route info, turn progress bar,
 * season badge, weather description, and event messages. Uses pointerEvents:
 * 'none' to avoid blocking map interaction (SAIL-04).
 */

import React from 'react';
import type { Season } from '../../game/weather';

interface SailingOverlayProps {
  departurePort: string;
  destinationPort: string;
  currentTurn: number;
  totalTurns: number;
  weatherDescription: string;
  season: Season;
  monthName: string;
  lastEventMessage?: string;
  stormWeight?: number;
  durationMultiplier?: number;
}

const SEASON_COLORS: Record<Season, string> = {
  summer: '#c4956a',
  winter: '#6488b4',
  spring: '#64b464',
  autumn: '#c88c3c',
};

export default function SailingOverlay({
  departurePort,
  destinationPort,
  currentTurn,
  totalTurns,
  weatherDescription,
  season,
  monthName,
  lastEventMessage,
  stormWeight = 0,
  durationMultiplier = 1,
}: SailingOverlayProps): React.ReactElement {
  const progress = totalTurns > 0 ? (currentTurn / totalTurns) * 100 : 0;
  const seasonColor = SEASON_COLORS[season];
  const isStormy = stormWeight > 25;
  const isSlowed = durationMultiplier > 1;

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1100,
        pointerEvents: 'none',
        backgroundColor: 'rgba(253, 248, 240, 0.92)',
        border: '1px solid #c4956a',
        borderRadius: 8,
        boxShadow: '0 4px 20px rgba(61, 43, 31, 0.18)',
        padding: '0.75rem 1.5rem',
        minWidth: 260,
        maxWidth: 400,
      }}
    >
      {/* Route line */}
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#5a3e2b',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          textAlign: 'center',
          marginBottom: 6,
        }}
      >
        Departing {departurePort} &rarr; {destinationPort}
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '100%',
          height: 6,
          backgroundColor: '#e8d5b8',
          borderRadius: 3,
          overflow: 'hidden',
          marginBottom: 4,
        }}
      >
        <div
          style={{
            width: `${Math.min(progress, 100)}%`,
            height: '100%',
            backgroundColor: '#c4956a',
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Turn counter */}
      <div
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '0.7rem',
          color: '#7a5c45',
          textAlign: 'center',
          marginBottom: 4,
        }}
      >
        Month {currentTurn} of {totalTurns}
      </div>

      {/* Season badge + month */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '1px 8px',
            borderRadius: 4,
            backgroundColor: seasonColor + '26', // ~15% opacity via hex alpha
            color: seasonColor,
            fontFamily: "'Cinzel', serif",
            fontSize: '0.6rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {season}
        </span>
        <span
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.65rem',
            fontStyle: 'italic',
            color: '#7a5c45',
          }}
        >
          {monthName}
        </span>
      </div>

      {/* Weather description */}
      <div
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '0.65rem',
          fontStyle: 'italic',
          color: '#7a5c45',
          textAlign: 'center',
          marginBottom: 4,
        }}
      >
        {weatherDescription}
      </div>

      {/* Weather impact warning */}
      {(isStormy || isSlowed) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '3px 8px',
            borderRadius: 4,
            backgroundColor: isStormy ? 'rgba(139, 46, 46, 0.12)' : 'rgba(100, 136, 180, 0.12)',
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: '0.7rem' }}>{isStormy ? '\u26C8' : '\u2744'}</span>
          <span
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.6rem',
              fontWeight: 600,
              color: isStormy ? '#8b2e2e' : '#4a6a8a',
            }}
          >
            {isStormy ? 'Storm risk! Voyage slowed' : `Seasonal delay \u00d7${durationMultiplier.toFixed(1)}`}
          </span>
        </div>
      )}

      {/* Event message */}
      {lastEventMessage && (
        <div
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.7rem',
            fontStyle: 'italic',
            color: '#5a3e2b',
            textAlign: 'center',
          }}
        >
          {lastEventMessage}
        </div>
      )}
    </div>
  );
}

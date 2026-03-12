/**
 * EventCard — blocking modal overlay for voyage events.
 *
 * Renders as a full-screen overlay when the game enters EncounteredState.
 * The player must select a choice to dismiss the modal — no escape hatch.
 *
 * After choice selection:
 *  1. Calls window.api.game.resolveEvent(eventId, choiceId) via IPC
 *  2. Shows the result message for 2 seconds
 *  3. Calls onResolved() — Shell clears the modal and game returns to idle
 */

import React, { useState } from 'react';
import type { VoyageEvent } from '../../shared/game-types';

interface EventCardProps {
  event: VoyageEvent;
  onResolved: (message: string) => void;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  storm: '#4a3060',  // deep purple
  pirate: '#7a2020', // deep red
  calm: '#3a6040',   // deep green
};

const EVENT_TYPE_ICONS: Record<string, string> = {
  storm: '\u26C8',  // ⛈
  pirate: '\u2694', // ⚔
  calm: '\u{1F30A}', // 🌊
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  storm: 'storm event',
  pirate: 'pirate encounter',
  calm: 'favorable event',
};

export default function EventCard({
  event,
  onResolved,
}: EventCardProps): React.ReactElement {
  const [resolving, setResolving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const accentColor = EVENT_TYPE_COLORS[event.type] ?? '#7a5c45';

  const handleChoice = async (choiceId: string): Promise<void> => {
    if (resolving) return;
    setResolving(true);
    try {
      const response = await window.api.game.resolveEvent(event.id, choiceId);
      if (response.success && response.message) {
        setResult(response.message);
        // Give player 2 seconds to read the result before dismissing
        setTimeout(() => onResolved(response.message ?? ''), 2000);
      } else {
        const errMsg = response.error ?? 'Something went wrong.';
        setResult(errMsg);
        setTimeout(() => onResolved(''), 3000);
      }
    } catch (e) {
      setResult(String(e));
      setTimeout(() => onResolved(''), 3000);
    }
  };

  return (
    // Full-screen backdrop — blocks all map and panel interaction
    <div
      aria-modal="true"
      role="dialog"
      aria-labelledby="event-card-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Card */}
      <div
        style={{
          width: '90%',
          maxWidth: 480,
          background: '#fdf5e6',
          border: `3px solid ${accentColor}`,
          borderRadius: 8,
          padding: '1.5rem',
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${accentColor}44`,
          fontFamily: "'Lora', Georgia, serif",
        }}
      >
        {/* Event type badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>{EVENT_TYPE_ICONS[event.type]}</span>
          <span
            style={{
              fontFamily: "'Cinzel', 'Times New Roman', serif",
              fontSize: '0.7rem',
              fontWeight: 700,
              color: accentColor,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {EVENT_TYPE_LABELS[event.type] ?? event.type}
          </span>
        </div>

        {/* Title */}
        <h2
          id="event-card-title"
          style={{
            fontFamily: "'Cinzel', 'Times New Roman', serif",
            fontSize: '1.2rem',
            fontWeight: 700,
            color: '#1a0f0a',
            marginBottom: 10,
            margin: '0 0 10px 0',
          }}
        >
          {event.title}
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: '0.875rem',
            lineHeight: 1.65,
            color: '#3d2b1f',
            marginBottom: 20,
            margin: '0 0 20px 0',
          }}
        >
          {event.description}
        </p>

        {/* Result message — shown after resolution */}
        {result && (
          <div
            role="status"
            style={{
              padding: '0.75rem 1rem',
              background: `${accentColor}18`,
              border: `1px solid ${accentColor}`,
              borderRadius: 4,
              fontSize: '0.85rem',
              color: '#1a0f0a',
              marginBottom: 16,
              fontStyle: 'italic',
              lineHeight: 1.5,
            }}
          >
            {result}
          </div>
        )}

        {/* Choices — hidden after resolution to prevent double-click */}
        {!result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {event.choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => void handleChoice(choice.id)}
                disabled={resolving}
                style={{
                  padding: '0.75rem 1rem',
                  background: resolving ? '#c4a882' : accentColor,
                  color: '#fdf5e6',
                  border: 'none',
                  borderRadius: 4,
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  cursor: resolving ? 'not-allowed' : 'pointer',
                  lineHeight: 1.4,
                  transition: 'opacity 0.15s',
                  opacity: resolving ? 0.6 : 1,
                }}
              >
                <strong
                  style={{
                    fontFamily: "'Cinzel', 'Times New Roman', serif",
                    display: 'block',
                    marginBottom: 3,
                    fontSize: '0.8rem',
                    letterSpacing: '0.02em',
                  }}
                >
                  {choice.label}
                </strong>
                <span style={{ fontSize: '0.78rem', opacity: 0.88 }}>
                  {choice.outcome}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

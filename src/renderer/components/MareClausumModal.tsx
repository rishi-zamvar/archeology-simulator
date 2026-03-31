/**
 * MareClausumModal — warning dialog shown before sailing during winter months.
 *
 * Ancient Mediterranean sailors avoided the sea during the mare clausum
 * (closed sea) period, roughly Maimakterion through Anthesterion (month indices 4-7).
 * This modal lets the player choose to sail anyway or wait for spring.
 */

import React from 'react';

interface MareClausumModalProps {
  destinationPortId: string;
  currentTurn: number;
  onSailAnyway: (destinationPortId: string) => void;
  onWaitForSpring: () => void;
  onDismiss: () => void;
}

export default function MareClausumModal({
  destinationPortId,
  currentTurn,
  onSailAnyway,
  onWaitForSpring,
  onDismiss,
}: MareClausumModalProps): React.ReactElement {
  // Calculate turns to wait until Elaphebolion (month index 8 = spring)
  let turnsToWait = (8 - (currentTurn % 12) + 12) % 12;
  if (turnsToWait === 0) turnsToWait = 12;
  const waitCost = turnsToWait * 50;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mare Clausum Warning"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 11000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(20, 12, 8, 0.65)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div
        style={{
          backgroundColor: '#fdf8f0',
          border: '2px solid #c4956a',
          borderRadius: 8,
          padding: '1.5rem',
          boxShadow: '0 8px 32px rgba(61, 43, 31, 0.35)',
          maxWidth: 420,
          width: 'calc(100vw - 2rem)',
          position: 'relative',
        }}
      >
        {/* Dismiss button */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            position: 'absolute',
            top: 8,
            right: 10,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#7a5c45',
            fontSize: '1.1rem',
            padding: '2px 6px',
            lineHeight: 1,
          }}
        >
          x
        </button>

        {/* Title */}
        <h2
          style={{
            margin: '0 0 0.75rem',
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: '1rem',
            fontWeight: 700,
            color: '#3d2b1f',
            letterSpacing: '0.04em',
          }}
        >
          Mare Clausum
        </h2>

        {/* Warning text */}
        <p
          style={{
            margin: '0 0 0.75rem',
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.9rem',
            lineHeight: 1.6,
            color: '#3d2b1f',
          }}
        >
          Ancient sailors avoided winter seas. Storms are likely. Sail anyway?
        </p>

        {/* Historical context */}
        <p
          style={{
            margin: '0 0 1rem',
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.75rem',
            lineHeight: 1.5,
            color: '#7a5c45',
            fontStyle: 'italic',
          }}
        >
          The mare clausum spans Maimakterion to Anthesterion &mdash; the months when
          Poseidon&apos;s wrath makes the sea treacherous. Wise captains winter in port.
        </p>

        {/* Wait cost info */}
        <p
          style={{
            margin: '0 0 1.25rem',
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.8rem',
            lineHeight: 1.5,
            color: '#5a3e2b',
          }}
        >
          Wait costs {waitCost} gold ({turnsToWait} {turnsToWait === 1 ? 'turn' : 'turns'} in port).
        </p>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          {/* Wait for Spring — ghost style */}
          <button
            type="button"
            onClick={onWaitForSpring}
            style={{
              background: 'transparent',
              border: '1px solid #c4956a',
              borderRadius: 4,
              padding: '0.4rem 0.9rem',
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.8rem',
              color: '#7a5c45',
              cursor: 'pointer',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fdf0e0';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            Wait for Spring
          </button>

          {/* Sail Anyway — filled copper style */}
          <button
            type="button"
            onClick={() => onSailAnyway(destinationPortId)}
            style={{
              backgroundColor: '#8b4a2a',
              border: '1px solid #6a3520',
              borderRadius: 4,
              padding: '0.4rem 1.1rem',
              fontFamily: "'Cinzel', 'Times New Roman', serif",
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#fdf8f0',
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7a3d22';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#8b4a2a';
            }}
          >
            Sail Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

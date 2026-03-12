/**
 * TutorialModal — contextual first-voyage tutorial overlay.
 *
 * Renders a fixed bottom-center parchment card when the current game state
 * has an active tutorial phase. Self-hides when tutorialPhase is 'completed',
 * undefined, or when gameState is null (loading).
 *
 * The modal is NOT dismissible by clicking the backdrop or pressing Escape —
 * the player must choose Continue or Skip Tutorial. This ensures new players
 * see at least the first message.
 *
 * Dispatches game actions via window.api.game.action():
 *   TUTORIAL_ADVANCE — step tutorial to next phase
 *   TUTORIAL_SKIP    — set tutorial to 'completed' immediately
 */

import React from 'react';
import { useGameState } from '../hooks/useGameState';
import type { TutorialPhase } from '../../game/types';

// Message for each tutorial phase
const TUTORIAL_MESSAGES: Record<Exclude<TutorialPhase['type'], 'completed'>, string> = {
  map_intro: 'Welcome, merchant! Click any port on the map to begin your voyage.',
  port_intro: 'You have arrived! Explore the market to buy and sell goods.',
  trade_intro: 'Buy goods cheaply here and sell them for profit at distant ports.',
  sailing_intro: 'Your ship is underway. Watch for events during the crossing!',
};

export default function TutorialModal(): React.ReactElement | null {
  const { state: gameState } = useGameState();

  // Do not render if state is loading or tutorial is inactive
  if (!gameState) return null;
  const phase = gameState.tutorialPhase;
  if (!phase || phase.type === 'completed') return null;

  const message = TUTORIAL_MESSAGES[phase.type];

  function handleContinue() {
    window.api.game.action({ type: 'TUTORIAL_ADVANCE' }).catch(() => {
      // Non-fatal: button feedback is visual; state will sync via subscription
    });
  }

  function handleSkip() {
    window.api.game.action({ type: 'TUTORIAL_SKIP' }).catch(() => {
      // Non-fatal
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Tutorial"
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        width: 'max-content',
        maxWidth: 'min(420px, calc(100vw - 2rem))',
      }}
    >
      {/* Parchment card */}
      <div
        style={{
          backgroundColor: '#fdf8f0',
          border: '2px solid #c4956a',
          borderRadius: 8,
          padding: '1.5rem',
          boxShadow: '0 4px 16px rgba(61, 43, 31, 0.2)',
        }}
      >
        {/* Message */}
        <p
          style={{
            margin: '0 0 1.25rem',
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.95rem',
            lineHeight: 1.6,
            color: '#3d2b1f',
          }}
        >
          {message}
        </p>

        {/* Actions row */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          {/* Skip Tutorial — ghost style */}
          <button
            onClick={handleSkip}
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
            Skip Tutorial
          </button>

          {/* Continue — filled copper style */}
          <button
            onClick={handleContinue}
            style={{
              backgroundColor: '#c4956a',
              border: '1px solid #a07050',
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
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#b08050';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#c4956a';
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

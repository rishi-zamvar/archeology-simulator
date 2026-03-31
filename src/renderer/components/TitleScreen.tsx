/**
 * TitleScreen — entry point shown on app launch.
 *
 * Displays the game title, a Mediterranean merchant description,
 * a historical flavor quote, and New Game / Continue buttons.
 * Continue is only visible when a save exists.
 */

import React from 'react';

interface TitleScreenProps {
  hasSave: boolean;
  onContinue: () => void;
  onNewGame: () => void;
}

const BTN_BASE: React.CSSProperties = {
  fontFamily: "'Cinzel', Georgia, serif",
  fontSize: '0.85rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#fdf8f0',
  border: '2px solid rgba(0, 0, 0, 0.15)',
  borderRadius: 6,
  padding: '0.7rem 2.5rem',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(61, 43, 31, 0.2)',
  transition: 'opacity 0.15s',
};

export default function TitleScreen({ hasSave, onContinue, onNewGame }: TitleScreenProps): React.ReactElement {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#fdf8f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        border: '8px solid #e8d5b8',
        boxSizing: 'border-box',
      }}
    >
      {/* Game title */}
      <h1
        style={{
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: '2.4rem',
          fontWeight: 700,
          color: '#5a3e2b',
          margin: 0,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        Mare Nostrum
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '1rem',
          fontStyle: 'italic',
          color: '#7a5c45',
          margin: 0,
        }}
      >
        A Mediterranean Trading Simulation
      </p>

      {/* Description */}
      <p
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '0.9rem',
          color: '#5a3e2b',
          maxWidth: 480,
          textAlign: 'center',
          lineHeight: 1.7,
          margin: '0.5rem 0',
        }}
      >
        Command a merchant vessel through the ancient Mediterranean.
        Buy low, sell high, and navigate storms, pirates, and seasonal
        winds as you build your trading fortune across the great sea.
      </p>

      {/* Flavor quote */}
      <p
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '0.75rem',
          fontStyle: 'italic',
          color: '#9a8570',
          margin: '0.25rem 0 1.5rem',
        }}
      >
        &ldquo;He who would learn to pray, let him go to sea.&rdquo; &mdash; Mediterranean proverb
      </p>

      {/* Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        {hasSave && (
          <button
            type="button"
            onClick={onContinue}
            style={{ ...BTN_BASE, backgroundColor: '#7a5c2b' }}
          >
            Continue
          </button>
        )}
        <button
          type="button"
          onClick={onNewGame}
          style={{ ...BTN_BASE, backgroundColor: '#2b5c4a' }}
        >
          New Game
        </button>
      </div>
    </div>
  );
}

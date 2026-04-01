/**
 * TitleScreen — entry point shown on app launch.
 *
 * Displays the game title, a Mediterranean merchant description,
 * a historical flavor quote, and New Game / Continue buttons.
 * Continue is only visible when a save exists.
 */

import React, { useState } from 'react';

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
  transition: 'background-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease',
};

export default function TitleScreen({ hasSave, onContinue, onNewGame }: TitleScreenProps): React.ReactElement {
  const [hovered, setHovered] = useState<string | null>(null);

  const btnHoverStyle = (id: string, baseColor: string): React.CSSProperties => ({
    ...BTN_BASE,
    backgroundColor: baseColor,
    transform: hovered === id ? 'translateY(-2px)' : 'translateY(0)',
    boxShadow: hovered === id
      ? '0 6px 16px rgba(61, 43, 31, 0.35)'
      : '0 2px 8px rgba(61, 43, 31, 0.2)',
  });

  return (
    <div
      className="animate-fade-in"
      style={{
        width: '100vw',
        height: '100vh',
        background: 'radial-gradient(ellipse at center, #fdf8f0 0%, #f0e0c4 60%, #e4cfa8 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        border: '8px solid #e8d5b8',
        boxSizing: 'border-box',
      }}
    >
      {/* Decorative flourish */}
      <div
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '1.4rem',
          color: '#c4956a',
          opacity: 0.5,
          letterSpacing: '0.5em',
          marginBottom: '-0.5rem',
        }}
      >
        ~ ~ ~
      </div>

      {/* Game title */}
      <h1
        style={{
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: '2.6rem',
          fontWeight: 700,
          color: '#5a3e2b',
          margin: 0,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textShadow: '0 2px 4px rgba(61, 43, 31, 0.12)',
        }}
      >
        Mare Nostrum
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '1.05rem',
          fontStyle: 'italic',
          color: '#7a5c45',
          margin: 0,
          letterSpacing: '0.04em',
        }}
      >
        A Mediterranean Trading Simulation
      </p>

      {/* Description */}
      <p
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '0.95rem',
          color: '#5a3e2b',
          maxWidth: 500,
          textAlign: 'center',
          lineHeight: 1.8,
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
          fontSize: '0.8rem',
          fontStyle: 'italic',
          color: '#9a8570',
          margin: '0.25rem 0 2rem',
        }}
      >
        &ldquo;He who would learn to pray, let him go to sea.&rdquo; &mdash; Mediterranean proverb
      </p>

      {/* Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', alignItems: 'center' }}>
        {hasSave && (
          <button
            type="button"
            onClick={onContinue}
            onMouseEnter={() => setHovered('continue')}
            onMouseLeave={() => setHovered(null)}
            style={btnHoverStyle('continue', '#7a5c2b')}
          >
            Continue
          </button>
        )}
        <button
          type="button"
          onClick={onNewGame}
          onMouseEnter={() => setHovered('new')}
          onMouseLeave={() => setHovered(null)}
          style={btnHoverStyle('new', '#2b5c4a')}
        >
          New Game
        </button>
      </div>
    </div>
  );
}

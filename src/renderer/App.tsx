/**
 * Root React component.
 *
 * Mounts the Shell layout and initialises the game state subscription.
 * useGameState() runs here so the subscription is active for the app lifetime.
 */

import React from 'react';
import Shell from './components/Shell';
import { useGameState } from './hooks/useGameState';

export default function App(): React.ReactElement {
  // Initialise game state subscription. The hook handles:
  //   - Loading state on mount
  //   - Subscribing to 'game:updated' IPC events
  //   - Cleaning up the subscription on unmount (no memory leak)
  const { isLoading, error } = useGameState();

  if (error) {
    // Non-blocking error display — Shell still renders but shows error banner
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: '#4a3319',
            color: '#f8edd8',
            padding: '0.5rem 1rem',
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.875rem',
            textAlign: 'center',
          }}
        >
          Failed to load game state: {error.message}
        </div>
        <Shell />
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8edd8',
            zIndex: 200,
            transition: 'opacity 0.3s',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: '1.25rem',
                color: '#7a5c45',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              Archeology Simulator
            </h1>
            <p
              style={{
                marginTop: '0.75rem',
                fontFamily: "'Lora', Georgia, serif",
                fontSize: '0.875rem',
                color: '#b8894a',
                fontStyle: 'italic',
              }}
            >
              Loading...
            </p>
          </div>
        </div>
      )}
      <Shell />
    </>
  );
}

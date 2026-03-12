/**
 * Root React component.
 *
 * Placeholder — will be replaced in Plan 03 with the full parchment UI.
 * The loading message confirms Electron + React + Vite are wired correctly.
 */

import React from 'react';

export default function App(): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'monospace',
        backgroundColor: '#1a1208',
        color: '#d4b483',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', letterSpacing: '0.1em' }}>
        Archeology Simulator
      </h1>
      <p style={{ marginTop: '1rem', opacity: 0.7 }}>Loading...</p>
    </div>
  );
}

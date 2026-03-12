/**
 * MapArea — central map placeholder.
 *
 * Fills the space between the two side panels.
 * Phase 2 will mount Leaflet inside this element.
 * The data-testid attribute allows tests and Playwright to target it reliably.
 */

import React from 'react';

export default function MapArea(): React.ReactElement {
  return (
    <div
      data-testid="map-area"
      className="flex-1 flex items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, #f0d9b5 0%, #e8c48a 60%, #d4a96a 100%)',
        boxShadow: 'inset 0 0 60px rgba(180, 140, 80, 0.3)',
        position: 'relative',
      }}
    >
      {/* Decorative map border lines */}
      <div
        style={{
          position: 'absolute',
          inset: '12px',
          border: '2px solid rgba(196, 149, 106, 0.4)',
          borderRadius: '2px',
          pointerEvents: 'none',
        }}
      />

      {/* Placeholder text — replaced by Leaflet map in Phase 2 */}
      <div className="text-center select-none" style={{ zIndex: 1 }}>
        <h2
          style={{
            fontFamily: "'Cinzel', 'Palatino Linotype', Georgia, serif",
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#7a5c45',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '0.5rem',
          }}
        >
          The Mediterranean Sea
        </h2>
        <p
          style={{
            fontFamily: "'Lora', 'Palatino Linotype', Georgia, serif",
            fontSize: '0.875rem',
            color: '#b8894a',
            fontStyle: 'italic',
          }}
        >
          Map loads in Phase 2
        </p>
      </div>
    </div>
  );
}

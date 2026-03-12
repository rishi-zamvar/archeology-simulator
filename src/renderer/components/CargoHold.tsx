/**
 * CargoHold — shows the player's carried cargo with quantity and purchase provenance.
 *
 * Displays:
 *   - Each cargo item: good name, quantity, bought-at price and port
 *   - Total cargo used vs capacity as a progress bar
 *
 * Receives inventory as a prop from Shell (via useTradeState hook).
 * Parchment aesthetic: Cinzel headings, Lora body, sepia palette.
 */

import React from 'react';
import type { PlayerInventory } from '../../shared/ipc-types';

interface CargoHoldProps {
  inventory: PlayerInventory;
}

const HEADING: React.CSSProperties = {
  fontFamily: "'Cinzel', 'Palatino Linotype', Georgia, serif",
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#5a3e2b',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  marginBottom: '0.5rem',
};

const BODY: React.CSSProperties = {
  fontFamily: "'Lora', Georgia, serif",
  fontSize: '0.75rem',
  color: '#7a5c45',
};

// Display-friendly good names (fallback: format the ID)
function formatGoodName(goodId: string): string {
  const names: Record<string, string> = {
    wheat: 'Wheat',
    olive_oil: 'Olive Oil',
    wine: 'Wine',
    textiles: 'Textiles',
    spices: 'Spices',
    bronze: 'Bronze',
    timber: 'Timber',
    pottery: 'Pottery',
  };
  return names[goodId] ?? goodId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CargoHold({ inventory }: CargoHoldProps): React.ReactElement {
  const { cargoItems, cargoCapacity, currentCargo } = inventory;
  const fillPct = cargoCapacity > 0 ? Math.min(100, (currentCargo / cargoCapacity) * 100) : 0;

  // Color the bar based on fullness
  const barColor =
    fillPct >= 90
      ? '#8b2e2e' /* near-full: red-sepia */
      : fillPct >= 60
      ? '#a07840' /* mid: amber */
      : '#2b5c4a'; /* comfortable: green-sepia */

  return (
    <div
      style={{
        padding: '1rem',
        borderBottom: '1px solid #e0cdb0',
      }}
    >
      <h3 style={HEADING}>Cargo Hold</h3>

      {/* Capacity bar */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            ...BODY,
            marginBottom: '0.25rem',
          }}
        >
          <span>Capacity</span>
          <span style={{ fontWeight: 600, color: barColor }}>
            {currentCargo} / {cargoCapacity}
          </span>
        </div>
        <div
          style={{
            height: '6px',
            backgroundColor: '#e0cdb0',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${fillPct}%`,
              backgroundColor: barColor,
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Cargo items list */}
      {cargoItems.length === 0 ? (
        <div
          style={{
            ...BODY,
            fontStyle: 'italic',
            opacity: 0.6,
          }}
        >
          Hold is empty.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {cargoItems.map((item, idx) => (
            <div
              key={`${item.goodId}-${item.boughtAtPort}-${item.boughtAtPrice}-${idx}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fdf8f0',
                border: '1px solid #e0cdb0',
                borderRadius: '2px',
                padding: '0.35rem 0.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Cinzel', Georgia, serif",
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#5a3e2b',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase' as const,
                  }}
                >
                  {formatGoodName(item.goodId)}
                </span>
                <span
                  style={{
                    ...BODY,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#5a3e2b',
                  }}
                >
                  ×{item.quantity}
                </span>
              </div>
              <div
                style={{
                  ...BODY,
                  fontSize: '0.68rem',
                  color: '#9a7a5a',
                  marginTop: '0.1rem',
                }}
              >
                Bought at {item.boughtAtPort} · {item.boughtAtPrice}g/unit
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

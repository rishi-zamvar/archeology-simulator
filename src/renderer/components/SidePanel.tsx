/**
 * SidePanel — collapsible side panel with slide animation.
 *
 * Driven by useUIStore (open/close state lives in the store).
 * Toggle button is fully keyboard accessible:
 *   - aria-expanded communicates panel state to screen readers
 *   - aria-label identifies which panel the button controls
 *   - focus-visible outline is defined in index.css
 *
 * The slide animation uses CSS translate-x transforms via inline style
 * (avoids Tailwind JIT purge issues with dynamic class names).
 */

import React from 'react';

interface SidePanelProps {
  side: 'left' | 'right';
  isOpen: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

const PANEL_WIDTH = 280;

export default function SidePanel({
  side,
  isOpen,
  onToggle,
  children,
}: SidePanelProps): React.ReactElement {
  const isLeft = side === 'left';

  // Translate off-screen when closed
  const translateX = isOpen
    ? 'translateX(0)'
    : isLeft
    ? `translateX(-${PANEL_WIDTH}px)`
    : `translateX(${PANEL_WIDTH}px)`;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: isLeft ? 'row' : 'row-reverse',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* The panel body */}
      <div
        role="complementary"
        aria-label={isLeft ? 'Left panel' : 'Right panel'}
        style={{
          width: `${PANEL_WIDTH}px`,
          height: '100%',
          backgroundColor: '#fdf8f0', /* parchment-50 */
          borderRight: isLeft ? `1px solid #c4956a` : 'none', /* sepia-border */
          borderLeft: isLeft ? 'none' : `1px solid #c4956a`,
          transform: translateX,
          transition: 'transform 0.25s ease-in-out',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxShadow: isLeft
            ? '4px 0 12px rgba(61, 43, 31, 0.08)'
            : '-4px 0 12px rgba(61, 43, 31, 0.08)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children ? (
          children
        ) : (
          <div
            style={{
              padding: '1.5rem 1rem',
              color: '#7a5c45',
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.875rem',
              fontStyle: 'italic',
              opacity: 0.7,
            }}
          >
            {isLeft ? 'Inventory & Ship' : 'Port & Trade Log'}
          </div>
        )}
      </div>

      {/* Toggle tab — sits flush against the panel edge */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={
          isOpen
            ? `Close ${isLeft ? 'left' : 'right'} panel`
            : `Open ${isLeft ? 'left' : 'right'} panel`
        }
        style={{
          position: 'absolute',
          top: '50%',
          [isLeft ? 'right' : 'left']: '-28px',
          transform: 'translateY(-50%)',
          width: '28px',
          height: '64px',
          backgroundColor: '#f8edd8', /* parchment-100 */
          border: `1px solid #c4956a`,
          borderLeft: isLeft ? 'none' : `1px solid #c4956a`,
          borderRight: isLeft ? `1px solid #c4956a` : 'none',
          borderRadius: isLeft ? '0 4px 4px 0' : '4px 0 0 4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#7a5c45',
          fontSize: '0.7rem',
          zIndex: 20,
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f0d9b5';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8edd8';
        }}
      >
        {/* Chevron arrow */}
        <span aria-hidden="true" style={{ lineHeight: 1 }}>
          {isLeft
            ? isOpen ? '◂' : '▸'
            : isOpen ? '▸' : '◂'}
        </span>
      </button>
    </div>
  );
}

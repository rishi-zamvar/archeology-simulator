/**
 * PortScene — full-area port illustration with clickable overlay regions.
 *
 * Renders when gameState.type === 'trading'. Overlaid on the map area, it
 * shows a port illustration background (falling back to parchment if the
 * image asset is missing) with two hover-highlighted clickable regions:
 *
 *   Market  — left region, opens TradePanel (right side panel)
 *   Harbor  — right region, opens PortInfoPanel (left side panel)
 *
 * All styles are inline to avoid Tailwind JIT purge issues.
 * Parchment palette: bg #f0d9b5, border #c4956a, text #3d2b1f, accent #7a5c45.
 * Fonts: Cinzel (headings), Lora (body).
 */

import React, { useState } from 'react';

interface PortSceneProps {
  portId: string;
  portName: string;
  onOpenMarket: () => void;
  onOpenHarbor: () => void;
}

interface OverlayRegion {
  key: 'market' | 'harbor';
  label: string;
  sublabel: string;
  left: string;
  top: string;
  width: string;
  height: string;
  onClick: () => void;
}

export default function PortScene({
  portId,
  portName,
  onOpenMarket,
  onOpenHarbor,
}: PortSceneProps): React.ReactElement {
  const [marketHovered, setMarketHovered] = useState(false);
  const [harborHovered, setHarborHovered] = useState(false);

  const regions: OverlayRegion[] = [
    {
      key: 'market',
      label: 'Market',
      sublabel: 'Trade goods',
      left: '15%',
      top: '35%',
      width: '30%',
      height: '35%',
      onClick: onOpenMarket,
    },
    {
      key: 'harbor',
      label: 'Harbor',
      sublabel: 'Port & voyages',
      left: '55%',
      top: '40%',
      width: '30%',
      height: '30%',
      onClick: onOpenHarbor,
    },
  ];

  const isHovered = (key: 'market' | 'harbor') =>
    key === 'market' ? marketHovered : harborHovered;

  const setHovered = (key: 'market' | 'harbor', value: boolean) => {
    if (key === 'market') setMarketHovered(value);
    else setHarborHovered(value);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        // Port illustration as background; falls back to warm parchment color
        backgroundImage: `url(/assets/ports/${portId}.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#f0d9b5',
        overflow: 'hidden',
      }}
    >
      {/* Subtle parchment texture overlay for legibility when illustration absent */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 40px,
              rgba(196, 149, 106, 0.04) 40px,
              rgba(196, 149, 106, 0.04) 41px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 40px,
              rgba(196, 149, 106, 0.04) 40px,
              rgba(196, 149, 106, 0.04) 41px
            )
          `,
          pointerEvents: 'none',
        }}
      />

      {/* Port name banner */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(253, 248, 240, 0.88)',
          borderBottom: '1px solid rgba(196, 149, 106, 0.5)',
          padding: '0.75rem 1.5rem',
          textAlign: 'center',
          zIndex: 20,
        }}
      >
        <span
          style={{
            fontFamily: "'Cinzel', 'Palatino Linotype', Georgia, serif",
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#3d2b1f',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {portName}
        </span>
      </div>

      {/* Instruction hint */}
      <div
        style={{
          position: 'absolute',
          bottom: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(253, 248, 240, 0.80)',
          border: '1px solid rgba(196, 149, 106, 0.4)',
          borderRadius: 4,
          padding: '0.35rem 0.9rem',
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '0.7rem',
          color: '#7a5c45',
          fontStyle: 'italic',
          whiteSpace: 'nowrap',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      >
        Hover the Market or Harbor to explore
      </div>

      {/* Clickable overlay regions */}
      {regions.map((region) => {
        const hovered = isHovered(region.key);
        return (
          <div
            key={region.key}
            style={{
              position: 'absolute',
              left: region.left,
              top: region.top,
              width: region.width,
              height: region.height,
              cursor: 'pointer',
              zIndex: 15,
            }}
          >
            {/* Hover tooltip */}
            {hovered && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(61, 43, 31, 0.92)',
                  color: '#fdf8f0',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 3,
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                }}
              >
                {region.label}
                <span
                  style={{
                    display: 'block',
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: '0.6rem',
                    fontWeight: 400,
                    letterSpacing: '0.03em',
                    textTransform: 'none',
                    opacity: 0.8,
                    marginTop: '1px',
                  }}
                >
                  {region.sublabel}
                </span>
              </div>
            )}

            {/* Clickable region button */}
            <button
              type="button"
              aria-label={`Open ${region.label}`}
              onClick={region.onClick}
              onMouseEnter={() => setHovered(region.key, true)}
              onMouseLeave={() => setHovered(region.key, false)}
              style={{
                width: '100%',
                height: '100%',
                background: hovered
                  ? 'rgba(196, 149, 106, 0.18)'
                  : 'transparent',
                border: hovered
                  ? '2px dashed #c4956a'
                  : '2px dashed transparent',
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
              }}
            >
              {/* Region label shown inside on hover */}
              {hovered && (
                <span
                  style={{
                    fontFamily: "'Cinzel', Georgia, serif",
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#3d2b1f',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    textShadow: '0 1px 4px rgba(253,248,240,0.9)',
                  }}
                >
                  {region.label}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * ParticleOverlay -- ambient CSS-animated particles per port region.
 *
 * VIS-02: Region-based particle effects:
 *   egypt   -> tan dust motes floating
 *   greece  -> yellow-green firefly dots pulsing
 *   coastal (italy, iberia, levant, north_africa) -> white seagull streaks
 *
 * 15-25 particles with randomized positions and animation delays.
 * Pure CSS animations -- no JS timers or RAF.
 */

import React, { useMemo } from 'react';
import type { PortRegion } from '../../shared/game-types';

interface ParticleOverlayProps {
  region: PortRegion;
}

interface Particle {
  id: number;
  left: string;
  top: string;
  delay: string;
  duration: string;
  size: number;
  opacity: number;
}

function generateParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${(Math.random() * 6).toFixed(1)}s`,
      duration: `${(3 + Math.random() * 5).toFixed(1)}s`,
      size: 2 + Math.random() * 4,
      opacity: 0.3 + Math.random() * 0.5,
    });
  }
  return particles;
}

type ParticleStyle = 'dust' | 'firefly' | 'seagull';

function getStyleForRegion(region: PortRegion): ParticleStyle {
  if (region === 'egypt') return 'dust';
  if (region === 'greece') return 'firefly';
  return 'seagull';
}

export default function ParticleOverlay({ region }: ParticleOverlayProps): React.ReactElement {
  const style = getStyleForRegion(region);
  const count = style === 'seagull' ? 12 : 20;
  const particles = useMemo(() => generateParticles(count), [count]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {particles.map((p) => {
        const baseStyle: React.CSSProperties = {
          position: 'absolute',
          left: p.left,
          top: p.top,
          animationDelay: p.delay,
          animationDuration: p.duration,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        };

        if (style === 'dust') {
          return (
            <div
              key={p.id}
              className="particle-dust"
              style={{
                ...baseStyle,
                width: p.size,
                height: p.size,
                borderRadius: '50%',
                backgroundColor: `rgba(210, 180, 140, ${p.opacity})`,
                animationName: 'particleDrift',
              }}
            />
          );
        }

        if (style === 'firefly') {
          return (
            <div
              key={p.id}
              className="particle-firefly"
              style={{
                ...baseStyle,
                width: p.size,
                height: p.size,
                borderRadius: '50%',
                backgroundColor: `rgba(220, 200, 60, ${p.opacity})`,
                boxShadow: `0 0 ${p.size + 2}px rgba(220, 200, 60, 0.4)`,
                animationName: 'particlePulse',
              }}
            />
          );
        }

        // seagull — elongated white streaks
        return (
          <div
            key={p.id}
            className="particle-seagull"
            style={{
              ...baseStyle,
              width: p.size * 4,
              height: 2,
              borderRadius: 1,
              backgroundColor: `rgba(255, 255, 255, ${p.opacity * 0.7})`,
              animationName: 'particleGlide',
            }}
          />
        );
      })}
    </div>
  );
}

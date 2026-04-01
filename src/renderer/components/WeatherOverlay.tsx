/**
 * WeatherOverlay — full-screen animated weather effects over the map.
 *
 * Renders wind streaks, rain, and storm effects based on current season
 * and weather conditions. Uses CSS animations with no canvas/WebGL.
 * pointerEvents: 'none' so map interaction passes through.
 */

import React from 'react';
import type { Season } from '../../game/weather';

interface WeatherOverlayProps {
  season: Season;
  stormWeight: number;
  isActive: boolean;
}

export default function WeatherOverlay({ season, stormWeight, isActive }: WeatherOverlayProps): React.ReactElement | null {
  if (!isActive) return null;

  const isStormy = stormWeight > 25;
  const isWindy = stormWeight > 10;

  // Doppler-style gradient colors per season
  const gradientMap: Record<Season, string> = {
    summer: 'radial-gradient(ellipse at 30% 40%, rgba(255, 220, 100, 0.08) 0%, transparent 60%)',
    spring: 'radial-gradient(ellipse at 50% 50%, rgba(120, 200, 120, 0.06) 0%, transparent 55%)',
    autumn: 'radial-gradient(ellipse at 60% 30%, rgba(200, 150, 80, 0.08) 0%, transparent 50%)',
    winter: 'radial-gradient(ellipse at 40% 50%, rgba(80, 100, 160, 0.15) 0%, rgba(40, 60, 120, 0.08) 40%, transparent 70%)',
  };

  const stormGradient = isStormy
    ? 'radial-gradient(ellipse at 50% 40%, rgba(30, 40, 80, 0.25) 0%, rgba(60, 70, 100, 0.12) 50%, transparent 80%)'
    : gradientMap[season];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 5,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Doppler-style weather gradient */}
      <div
        className="weather-gradient"
        style={{
          position: 'absolute',
          inset: 0,
          background: stormGradient,
          transition: 'background 2s ease',
        }}
      />

      {/* Wind streaks — diagonal animated lines */}
      {isWindy && (
        <div className={`wind-streaks ${isStormy ? 'wind-storm' : 'wind-mild'}`}>
          {Array.from({ length: isStormy ? 20 : 8 }, (_, i) => (
            <div
              key={i}
              className="wind-line"
              style={{
                top: `${(i * (100 / (isStormy ? 20 : 8))) + Math.random() * 5}%`,
                left: `${-20 + Math.random() * 10}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${isStormy ? 1.5 + Math.random() : 3 + Math.random() * 2}s`,
                opacity: isStormy ? 0.4 + Math.random() * 0.3 : 0.15 + Math.random() * 0.15,
                width: `${isStormy ? 80 + Math.random() * 60 : 40 + Math.random() * 40}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Rain drops for storms */}
      {isStormy && (
        <div className="rain-container">
          {Array.from({ length: 40 }, (_, i) => (
            <div
              key={i}
              className="raindrop"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${0.6 + Math.random() * 0.4}s`,
                opacity: 0.3 + Math.random() * 0.4,
              }}
            />
          ))}
        </div>
      )}

      {/* Lightning flash for heavy storms */}
      {stormWeight > 35 && (
        <div className="lightning-flash" />
      )}
    </div>
  );
}

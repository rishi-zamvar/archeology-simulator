/**
 * ConclusionScreen -- Win condition summary shown when all 5 quests are complete.
 *
 * Displays journey statistics, a narrative summary, and a "Continue Trading"
 * button to resume in free mode.
 */

import React from 'react';

export interface JourneyStats {
  portsVisited: number;
  goodsTraded: number;
  turnsElapsed: number;
  questsCompleted: number;
  goldEarned: number;
}

interface ConclusionScreenProps {
  stats: JourneyStats;
  onContinue: () => void;
}

interface StatItem {
  label: string;
  value: string | number;
}

export default function ConclusionScreen({ stats, onContinue }: ConclusionScreenProps): React.ReactElement {
  const statItems: StatItem[] = [
    { label: 'Ports Visited', value: stats.portsVisited },
    { label: 'Goods Traded', value: stats.goodsTraded },
    { label: 'Months at Sea', value: stats.turnsElapsed },
    { label: 'Quests Completed', value: stats.questsCompleted },
    { label: 'Gold Earned', value: `${stats.goldEarned}g` },
  ];

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
        border: '8px solid #e8d5b8',
        boxSizing: 'border-box',
        padding: '2rem',
        gap: '1.5rem',
      }}
    >
      {/* Title */}
      <h1
        style={{
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: '2rem',
          fontWeight: 700,
          color: '#5a3e2b',
          margin: 0,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        The Merchant&rsquo;s Odyssey Complete
      </h1>

      {/* Narrative summary */}
      <p
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '0.9rem',
          color: '#5a3e2b',
          lineHeight: 1.8,
          textAlign: 'center',
          maxWidth: 560,
          margin: 0,
        }}
      >
        In {stats.turnsElapsed} months, you visited {stats.portsVisited} ports across the ancient
        Mediterranean. You completed {stats.questsCompleted} commissions, traded {stats.goodsTraded} goods
        between civilizations, and earned {stats.goldEarned} gold. From the bustling quays of Piraeus
        to the distant shores beyond the Pillars of Melqart, you have proven yourself a master
        merchant of Mare Nostrum.
      </p>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '1rem',
          maxWidth: 600,
          width: '100%',
        }}
      >
        {statItems.map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.75rem 0.5rem',
              backgroundColor: 'rgba(232, 213, 184, 0.4)',
              borderRadius: 6,
              border: '1px solid #e8d5b8',
            }}
          >
            <span
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: '1.4rem',
                fontWeight: 700,
                color: '#5a3e2b',
              }}
            >
              {item.value}
            </span>
            <span
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: '0.5rem',
                fontWeight: 600,
                color: '#7a5c45',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Historical closing quote */}
      <p
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '0.8rem',
          fontStyle: 'italic',
          color: '#9a8570',
          textAlign: 'center',
          margin: '0.25rem 0',
        }}
      >
        &ldquo;The sea teaches patience, the ports teach wisdom.&rdquo; &mdash; Mediterranean proverb
      </p>

      {/* Continue Trading button */}
      <button
        type="button"
        onClick={onContinue}
        style={{
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: '0.85rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#fdf8f0',
          backgroundColor: '#2b5c4a',
          border: '2px solid rgba(0, 0, 0, 0.15)',
          borderRadius: 6,
          padding: '0.7rem 2.5rem',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(61, 43, 31, 0.2)',
          transition: 'opacity 0.15s',
        }}
      >
        Continue Trading
      </button>

      <p
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '0.7rem',
          color: '#9a8570',
          margin: 0,
        }}
      >
        You may continue sailing and trading in free mode.
      </p>
    </div>
  );
}

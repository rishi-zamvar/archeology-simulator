/**
 * ConclusionScreen -- Win condition summary shown when all 5 quests are complete.
 *
 * NAR-03: Enhanced with narrated historical epilogue, stats-woven prose,
 * and a scrollable journey timeline from journal highlights.
 */

import React from 'react';

export interface JourneyStats {
  portsVisited: number;
  goodsTraded: number;
  turnsElapsed: number;
  questsCompleted: number;
  goldEarned: number;
  regionsVisited: string[];
  mostTradedGood: string | null;
  totalDistanceKm: number;
  journalHighlights: Array<{ turn: number; title: string; entryType: string }>;
}

interface ConclusionScreenProps {
  stats: JourneyStats;
  onContinue: () => void;
}

interface StatItem {
  label: string;
  value: string | number;
}

// Map region IDs to readable names
const REGION_NAMES: Record<string, string> = {
  greece: 'the Greek world',
  levant: 'the Levantine coast',
  egypt: 'the land of the Nile',
  italy: 'the Italian peninsula',
  iberia: 'the Iberian shores',
  north_africa: 'the African coast',
};

// Map good IDs to readable names
const GOOD_NAMES: Record<string, string> = {
  pottery: 'Attic pottery',
  olive_oil: 'olive oil',
  wine: 'fine wine',
  grain: 'Egyptian grain',
  purple_dye: 'Tyrian purple dye',
  silver: 'silver',
  papyrus: 'papyrus scrolls',
  cedar: 'Lebanese cedar',
  glass: 'Phoenician glass',
  tin: 'tin',
  copper: 'copper ingots',
  linen: 'linen cloth',
  incense: 'frankincense',
  wool: 'dyed wool',
  iron: 'iron ore',
};

// Map entry types to timeline icons
const ENTRY_ICONS: Record<string, string> = {
  arrival: '\u2693',      // anchor
  quest: '\u2736',        // star
  discovery: '\u2605',    // filled star
  dialogue: '\u263A',     // smiley
  trade: '\u2696',        // scales
  voyage_event: '\u26A0', // warning
  departure: '\u26F5',    // sailboat
};

function buildEpilogueProse(stats: JourneyStats): string {
  const regionList = stats.regionsVisited.map(r => REGION_NAMES[r] ?? r);
  const regionProse = regionList.length > 2
    ? `${regionList.slice(0, -1).join(', ')}, and ${regionList[regionList.length - 1]}`
    : regionList.join(' and ');

  const goodName = stats.mostTradedGood
    ? (GOOD_NAMES[stats.mostTradedGood] ?? stats.mostTradedGood)
    : 'exotic goods';

  const distanceStr = stats.totalDistanceKm > 0
    ? `${stats.totalDistanceKm.toLocaleString()} stadia`
    : 'countless stadia';

  return `In ${stats.turnsElapsed} months, you sailed ${distanceStr} across the Mediterranean, `
    + `trading at ${stats.portsVisited} ports across ${regionProse}. `
    + `You completed ${stats.questsCompleted} commissions for the great merchants and temple factors `
    + `of the ancient world, traded ${stats.goodsTraded} shipments of cargo between civilizations, `
    + `and amassed ${stats.goldEarned.toLocaleString()} gold in your coffers. `
    + `Your ships became known for carrying ${goodName} -- a reputation earned through honest dealing `
    + `and bold seamanship.`;
}

function buildHistoricalContext(stats: JourneyStats): string {
  if (stats.regionsVisited.length >= 4) {
    return 'Like the great Phoenician merchants of the 6th century BCE, you wove together '
      + 'the disparate civilizations of the Mediterranean into a single trading network. '
      + 'From the clay workshops of Athens to the grain warehouses of Memphis, from the purple '
      + 'dye vats of Tyre to the western colonies beyond the Pillars of Melqart -- your voyages '
      + 'echoed those of the historical merchants who made Mare Nostrum the cradle of Western civilization.';
  }
  if (stats.regionsVisited.length >= 2) {
    return 'The ancient Mediterranean was connected not by empires but by merchants like you. '
      + 'Braudel wrote that the sea itself was the great unifier -- and your voyages have proven '
      + 'his words true. Each cargo exchanged, each port visited, strengthened the bonds between '
      + 'civilizations that would shape the course of history.';
  }
  return 'Even the longest voyage begins with a single port. The merchants of the 6th century BCE '
    + 'spent years building their networks, one trade at a time. Your journey is only beginning.';
}

export default function ConclusionScreen({ stats, onContinue }: ConclusionScreenProps): React.ReactElement {
  const statItems: StatItem[] = [
    { label: 'Ports Visited', value: stats.portsVisited },
    { label: 'Goods Traded', value: stats.goodsTraded },
    { label: 'Months at Sea', value: stats.turnsElapsed },
    { label: 'Quests Completed', value: stats.questsCompleted },
    { label: 'Gold Earned', value: `${stats.goldEarned.toLocaleString()}g` },
  ];

  const epilogueProse = buildEpilogueProse(stats);
  const historicalContext = buildHistoricalContext(stats);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#fdf8f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        border: '8px solid #e8d5b8',
        boxSizing: 'border-box',
        padding: '2rem 2rem 1.5rem',
        overflowY: 'auto',
      }}
    >
      {/* Title */}
      <h1
        style={{
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: '2rem',
          fontWeight: 700,
          color: '#5a3e2b',
          margin: '0 0 1rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        The Merchant&rsquo;s Odyssey Complete
      </h1>

      {/* Narrative epilogue */}
      <p
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '0.9rem',
          color: '#5a3e2b',
          lineHeight: 1.8,
          textAlign: 'center',
          maxWidth: 620,
          margin: '0 0 1rem',
        }}
      >
        {epilogueProse}
      </p>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '1rem',
          maxWidth: 600,
          width: '100%',
          marginBottom: '1rem',
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

      {/* Historical context */}
      <p
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '0.8rem',
          fontStyle: 'italic',
          color: '#7a5c45',
          lineHeight: 1.7,
          textAlign: 'center',
          maxWidth: 580,
          margin: '0 0 1rem',
        }}
      >
        {historicalContext}
      </p>

      {/* Journey Timeline */}
      {stats.journalHighlights.length > 0 && (
        <div
          style={{
            width: '100%',
            maxWidth: 560,
            marginBottom: '1rem',
          }}
        >
          <h2
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#5a3e2b',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textAlign: 'center',
              margin: '0 0 0.5rem',
            }}
          >
            Journey Timeline
          </h2>
          <div
            style={{
              maxHeight: 180,
              overflowY: 'auto',
              border: '1px solid #e8d5b8',
              borderRadius: 6,
              padding: '0.5rem 0.75rem',
              backgroundColor: 'rgba(232, 213, 184, 0.15)',
            }}
          >
            {stats.journalHighlights.map((entry, i) => (
              <div
                key={`${entry.turn}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  padding: '0.25rem 0',
                  borderBottom: i < stats.journalHighlights.length - 1
                    ? '1px solid rgba(232, 213, 184, 0.5)'
                    : 'none',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Cinzel', Georgia, serif",
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    color: '#9a8570',
                    minWidth: 50,
                    flexShrink: 0,
                  }}
                >
                  Month {entry.turn}
                </span>
                <span style={{ fontSize: '0.75rem', lineHeight: 1 }}>
                  {ENTRY_ICONS[entry.entryType] ?? '\u2022'}
                </span>
                <span
                  style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: '0.7rem',
                    color: '#5a3e2b',
                    lineHeight: 1.4,
                  }}
                >
                  {entry.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical closing quote */}
      <p
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '0.8rem',
          fontStyle: 'italic',
          color: '#9a8570',
          textAlign: 'center',
          margin: '0 0 0.75rem',
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
          margin: '0.5rem 0 0',
        }}
      >
        You may continue sailing and trading in free mode.
      </p>
    </div>
  );
}

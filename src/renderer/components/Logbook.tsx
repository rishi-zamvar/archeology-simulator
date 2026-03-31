/**
 * Logbook — top-center dropdown showing voyage journal.
 *
 * Title bar shows the current date (derived from turn number).
 * Clicking expands a scrollable log with entries for:
 *   - Weather conditions
 *   - Trader encounters / rumors
 *   - Port arrivals / departures
 *   - Events that occurred during voyages
 *
 * Entries are accumulated over the game session and persist in component state.
 */

import React, { useState, useEffect, useRef } from 'react';
import { getSeasonalWeatherDescription } from '../../game/weather';

export interface LogEntry {
  turn: number;
  date: string;
  text: string;
  type: 'weather' | 'rumor' | 'arrival' | 'departure' | 'event' | 'trade';
}


// Generate trader rumors based on turn
function generateRumor(turn: number): string | null {
  const rumors = [
    'A Phoenician trader mentioned that spice prices are rising in the east.',
    'Word from passing sailors: bronze is cheap in Cyprus this season.',
    'A merchant captain warns of rough waters near Crete.',
    'Fishermen report abundant catches — the gods favor this season.',
    'Traders whisper that wheat stores are low in Egypt.',
    'A Greek vessel reports olive oil fetching high prices in Rome.',
    'Rumors of pirate activity near the Cilician coast.',
    'A Carthaginian ship brought news of new timber supplies in Byblos.',
    null, // No rumor this turn
    'Merchants speak of a wealthy buyer seeking fine textiles in Athens.',
  ];
  return rumors[turn % rumors.length];
}

// Convert turn number to an ancient-style date
function turnToDate(turn: number): string {
  const months = [
    'Hekatombaion', 'Metageitnion', 'Boedromion', 'Pyanepsion',
    'Maimakterion', 'Poseideon', 'Gamelion', 'Anthesterion',
    'Elaphebolion', 'Mounichion', 'Thargelion', 'Skirophorion',
  ];
  const month = months[turn % 12];
  const day = (turn % 30) + 1;
  const year = 480 - Math.floor(turn / 12); // 480 BCE counting down
  return `${day} ${month}, ${year} BCE`;
}

interface LogbookProps {
  currentTurn: number;
  gameStateType: string;
  portName?: string;
  season?: string;
  monthName?: string;
  seasonTint?: string;
}

export default function Logbook({ currentTurn, gameStateType, portName, season, monthName, seasonTint }: LogbookProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const lastProcessedTurn = useRef(-1);
  const lastState = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentDate = turnToDate(currentTurn);

  // Add entries as the game progresses
  useEffect(() => {
    const newEntries: LogEntry[] = [];
    const date = turnToDate(currentTurn);

    // Add weather + rumor for each new turn
    if (currentTurn > lastProcessedTurn.current) {
      newEntries.push({
        turn: currentTurn,
        date,
        text: getSeasonalWeatherDescription(currentTurn),
        type: 'weather',
      });

      const rumor = generateRumor(currentTurn);
      if (rumor) {
        newEntries.push({
          turn: currentTurn,
          date,
          text: rumor,
          type: 'rumor',
        });
      }
      lastProcessedTurn.current = currentTurn;
    }

    // Track state transitions
    if (gameStateType !== lastState.current) {
      if (gameStateType === 'trading' && portName) {
        newEntries.push({
          turn: currentTurn,
          date,
          text: `Arrived at the port of ${portName}. The harbor is bustling with activity.`,
          type: 'arrival',
        });
      } else if (gameStateType === 'sailing' && lastState.current === 'trading' && portName) {
        newEntries.push({
          turn: currentTurn,
          date,
          text: `Departed from ${portName}. The crew sets sail with the tide.`,
          type: 'departure',
        });
      } else if (gameStateType === 'encountered') {
        newEntries.push({
          turn: currentTurn,
          date,
          text: 'Something stirs on the horizon...',
          type: 'event',
        });
      }
      lastState.current = gameStateType;
    }

    if (newEntries.length > 0) {
      setEntries(prev => [...prev, ...newEntries]);
    }
  }, [currentTurn, gameStateType, portName]);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length, open]);

  const typeIcon: Record<LogEntry['type'], string> = {
    weather: '\u2600',   // ☀
    rumor: '\u2709',     // ✉
    arrival: '\u2693',   // ⚓
    departure: '\u26F5', // ⛵
    event: '\u2694',     // ⚔
    trade: '\u2696',     // ⚖
  };

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1200,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Date title bar — always visible */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: seasonTint
            ? `linear-gradient(${seasonTint}, ${seasonTint}), rgba(253, 248, 240, 0.95)`
            : 'rgba(253, 248, 240, 0.95)',
          border: '1px solid #c4956a',
          borderRadius: open ? '6px 6px 0 0' : 6,
          padding: '0.4rem 1rem',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(61, 43, 31, 0.18)',
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: '0.65rem',
          fontWeight: 700,
          color: '#5a3e2b',
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
        }}
      >
        <span style={{ fontSize: '0.8rem' }}>{open ? '\u25BE' : '\u25B4'}</span>
        <span>Turn {currentTurn} &mdash; {season ? season.charAt(0).toUpperCase() + season.slice(1) : ''} ({monthName ?? ''})</span>
        <span style={{ color: '#7a5c45', fontWeight: 400 }}>\u00B7</span>
        <span style={{ fontFamily: "'Lora', serif", fontWeight: 400, textTransform: 'none' as const, fontSize: '0.6rem' }}>
          Captain&apos;s Log
        </span>
      </button>

      {/* Expanded log panel */}
      {open && (
        <div
          ref={scrollRef}
          style={{
            width: 380,
            maxHeight: 320,
            overflowY: 'auto',
            backgroundColor: 'rgba(253, 248, 240, 0.97)',
            border: '1px solid #c4956a',
            borderTop: 'none',
            borderRadius: '0 0 6px 6px',
            boxShadow: '0 8px 24px rgba(61, 43, 31, 0.2)',
            padding: '0.5rem',
          }}
        >
          {entries.length === 0 ? (
            <div style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.75rem',
              color: '#7a5c45',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '1rem',
            }}>
              The log is empty. Your journey has yet to begin.
            </div>
          ) : (
            entries.map((entry, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '0.4rem',
                  padding: '0.35rem 0.25rem',
                  borderBottom: i < entries.length - 1 ? '1px solid rgba(196, 149, 106, 0.2)' : 'none',
                }}
              >
                <span style={{ fontSize: '0.75rem', flexShrink: 0, width: 18, textAlign: 'center' }}>
                  {typeIcon[entry.type]}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: '0.7rem',
                    color: '#3d2b1f',
                    lineHeight: 1.5,
                  }}>
                    {entry.text}
                  </div>
                  <div style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: '0.55rem',
                    color: '#a08870',
                    marginTop: 1,
                  }}>
                    {entry.date}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

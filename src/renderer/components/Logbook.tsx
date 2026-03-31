/**
 * Logbook — top-center dropdown showing the Captain's Journal.
 *
 * Title bar shows the current date (derived from turn number).
 * Clicking expands a scrollable log with entries for:
 *   - Weather conditions (generated deterministically, not stored in DB)
 *   - Trader encounters / rumors (generated deterministically, not stored in DB)
 *   - Port arrivals / departures (from DB)
 *   - Events that occurred during voyages (from DB)
 *   - Trades (from DB)
 *   - Player notes (from DB)
 *
 * Journal entries persist in SQLite via IPC. Weather and rumor entries
 * are interleaved at render time from the turn numbers present in DB entries.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getSeasonalWeatherDescription } from '../../game/weather';
import type { JournalEntry } from '../../shared/game-types';

export interface LogEntry {
  turn: number;
  date: string;
  text: string;
  type: 'weather' | 'rumor' | 'arrival' | 'departure' | 'event' | 'trade' | 'note';
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

type DisplayEntry = {
  id: string;
  turn: number;
  date: string;
  text: string;
  type: LogEntry['type'];
};

const TYPE_ORDER: Record<string, number> = {
  weather: 0,
  rumor: 1,
  arrival: 2,
  departure: 3,
  trade: 4,
  event: 5,
  note: 6,
};

export default function Logbook({ currentTurn, gameStateType, portName, season, monthName, seasonTint }: LogbookProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [dbEntries, setDbEntries] = useState<JournalEntry[]>([]);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load journal entries from DB on mount
  useEffect(() => {
    window.api.journal.getEntries().then((res) => {
      if (res.success) setDbEntries(res.data);
    });
  }, []);

  // Re-fetch when game state updates (trade, event, arrival, etc.)
  useEffect(() => {
    const cleanup = window.api.subscribe('game:updated', () => {
      window.api.journal.getEntries().then((res) => {
        if (res.success) setDbEntries(res.data);
      });
    });
    return cleanup;
  }, []);

  // Build display entries: DB entries + interleaved weather/rumor
  const displayEntries = useMemo(() => {
    // Collect all turns that have DB entries, plus current turn
    const turns = new Set(dbEntries.map(e => e.turn));
    turns.add(currentTurn);

    const all: DisplayEntry[] = [];

    // Add DB entries
    for (const e of dbEntries) {
      all.push({
        id: `db-${e.id}`,
        turn: e.turn,
        date: turnToDate(e.turn),
        text: e.title,
        type: e.entryType === 'voyage_event' ? 'event' : e.entryType as LogEntry['type'],
      });
    }

    // Add weather + rumor for each unique turn
    for (const turn of turns) {
      all.push({
        id: `weather-${turn}`,
        turn,
        date: turnToDate(turn),
        text: getSeasonalWeatherDescription(turn),
        type: 'weather',
      });
      const rumor = generateRumor(turn);
      if (rumor) {
        all.push({
          id: `rumor-${turn}`,
          turn,
          date: turnToDate(turn),
          text: rumor,
          type: 'rumor',
        });
      }
    }

    // Sort newest first (by turn desc, then weather/rumor before DB entries for same turn)
    all.sort((a, b) => {
      if (b.turn !== a.turn) return b.turn - a.turn;
      return (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9);
    });

    return all;
  }, [dbEntries, currentTurn]);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayEntries.length, open]);

  const typeIcon: Record<string, string> = {
    weather: '\u2600',   // sun
    rumor: '\u2709',     // envelope
    arrival: '\u2693',   // anchor
    departure: '\u26F5', // sailboat
    event: '\u2694',     // crossed swords
    trade: '\u2696',     // scales
    note: '\u270E',      // pencil
  };

  function handleSubmitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim() || saving) return;
    setSaving(true);
    const title = noteTitle.trim() || "Captain's Note";
    window.api.journal.addNote(title, noteText.trim()).then(() => {
      setNoteTitle('');
      setNoteText('');
      setSaving(false);
      // Re-fetch entries to show the new note
      window.api.journal.getEntries().then((res) => {
        if (res.success) setDbEntries(res.data);
      });
    });
  }

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
          {displayEntries.length === 0 ? (
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
            displayEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  gap: '0.4rem',
                  padding: '0.35rem 0.25rem',
                  borderBottom: '1px solid rgba(196, 149, 106, 0.2)',
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

          {/* Note input — Phase 10 JRN-05 */}
          <form onSubmit={handleSubmitNote} style={{ borderTop: '1px solid #c4956a', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Note title (optional)"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(253, 248, 240, 0.8)',
                border: '1px solid #c4956a',
                borderRadius: 4,
                padding: '0.3rem 0.4rem',
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: '0.55rem',
                color: '#5a3e2b',
                marginBottom: '0.3rem',
              }}
            />
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your reflections..."
              rows={2}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(253, 248, 240, 0.8)',
                border: '1px solid #c4956a',
                borderRadius: 4,
                padding: '0.3rem 0.4rem',
                fontFamily: "'Lora', Georgia, serif",
                fontSize: '0.65rem',
                color: '#3d2b1f',
                resize: 'vertical',
                marginBottom: '0.3rem',
              }}
            />
            <button
              type="submit"
              disabled={!noteText.trim() || saving}
              style={{
                background: noteText.trim() && !saving ? '#5a3e2b' : '#a08870',
                color: '#fdf8f0',
                border: 'none',
                borderRadius: 4,
                padding: '0.3rem 0.6rem',
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: '0.55rem',
                cursor: noteText.trim() && !saving ? 'pointer' : 'default',
                opacity: noteText.trim() && !saving ? 1 : 0.6,
              }}
            >
              {saving ? 'Saving...' : 'Add Note'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

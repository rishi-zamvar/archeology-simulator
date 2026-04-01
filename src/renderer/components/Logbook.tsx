/**
 * Logbook — top-center dropdown showing the Captain's Journal and Quests.
 *
 * Two tabs:
 *   - Journal: existing log entries (weather, rumors, trades, events, notes)
 *   - Quests: active/completed/available quests with objectives
 *
 * Title bar shows the current date (derived from turn number).
 * Clicking expands a scrollable panel with tab content.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getSeasonalWeatherDescription } from '../../game/weather';
import { playSfx } from '../audio/playSfx';
import type { JournalEntry, QuestDefinition, QuestProgress } from '../../shared/game-types';

export interface LogEntry {
  turn: number;
  date: string;
  text: string;
  type: 'weather' | 'rumor' | 'arrival' | 'departure' | 'event' | 'trade' | 'note' | 'quest' | 'dialogue' | 'discovery';
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
  discovery: 1.5,
  arrival: 2,
  quest: 2.5,
  departure: 3,
  dialogue: 3.5,
  trade: 4,
  event: 5,
  note: 6,
};

type QuestWithProgress = { quest: QuestDefinition; progress: QuestProgress };

interface PostcardData {
  portId: string;
  portName: string;
  description: string;
  discoveredAtTurn: number;
}

type LogbookTab = 'journal' | 'quests' | 'postcards';

export default function Logbook({ currentTurn, gameStateType, portName, season, monthName, seasonTint }: LogbookProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LogbookTab>('journal');
  const [dbEntries, setDbEntries] = useState<JournalEntry[]>([]);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Quest state
  const [questData, setQuestData] = useState<QuestWithProgress[]>([]);

  // Postcard state
  const [postcards, setPostcards] = useState<PostcardData[]>([]);
  const [totalPorts, setTotalPorts] = useState(0);

  // Load journal entries from DB on mount
  useEffect(() => {
    window.api.journal.getEntries().then((res) => {
      if (res.success) setDbEntries(res.data);
    });
  }, []);

  // Load quest data on mount
  useEffect(() => {
    window.api.quest.getAll().then((res) => {
      if (res.success) setQuestData(res.data);
    });
  }, []);

  // Load postcards on mount
  useEffect(() => {
    window.api.game.getPostcards().then((res) => {
      if (res.success) {
        setPostcards(res.data.postcards);
        setTotalPorts(res.data.totalPorts);
      }
    });
  }, []);

  // Re-fetch when game state updates (trade, event, arrival, etc.)
  useEffect(() => {
    const cleanup = window.api.subscribe('game:updated', () => {
      window.api.journal.getEntries().then((res) => {
        if (res.success) setDbEntries(res.data);
      });
      window.api.quest.getAll().then((res) => {
        if (res.success) setQuestData(res.data);
      });
      window.api.game.getPostcards().then((res) => {
        if (res.success) {
          setPostcards(res.data.postcards);
          setTotalPorts(res.data.totalPorts);
        }
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
      const typeMap: Record<string, LogEntry['type']> = {
        voyage_event: 'event',
        quest: 'quest',
        dialogue: 'dialogue',
        discovery: 'discovery',
      };
      all.push({
        id: `db-${e.id}`,
        turn: e.turn,
        date: turnToDate(e.turn),
        text: e.title,
        type: typeMap[e.entryType] ?? (e.entryType as LogEntry['type']),
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

  // Categorize quests
  const { activeQuests, completedQuests, availableQuests } = useMemo(() => {
    const active: QuestWithProgress[] = [];
    const completed: QuestWithProgress[] = [];
    const available: QuestWithProgress[] = [];
    for (const qp of questData) {
      switch (qp.progress.status) {
        case 'active':
          active.push(qp);
          break;
        case 'completed':
          completed.push(qp);
          break;
        case 'available':
          available.push(qp);
          break;
      }
    }
    return { activeQuests: active, completedQuests: completed, availableQuests: available };
  }, [questData]);

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
    quest: '\u2694',     // crossed swords
    dialogue: '\u2709',  // envelope (speech)
    discovery: '\u2726', // four-pointed star
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
      playSfx('quill');
      // Re-fetch entries to show the new note
      window.api.journal.getEntries().then((res) => {
        if (res.success) setDbEntries(res.data);
      });
    });
  }

  // Tab bar styles
  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '0.35rem 0.5rem',
    background: isActive ? 'rgba(253, 248, 240, 0.97)' : 'rgba(230, 215, 195, 0.6)',
    border: 'none',
    borderBottom: isActive ? '2px solid #5a3e2b' : '2px solid transparent',
    cursor: 'pointer',
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.55rem',
    fontWeight: isActive ? 700 : 400,
    color: isActive ? '#5a3e2b' : '#7a5c45',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  });

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
        <div style={{
          width: 380,
          backgroundColor: 'rgba(253, 248, 240, 0.97)',
          border: '1px solid #c4956a',
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          boxShadow: '0 8px 24px rgba(61, 43, 31, 0.2)',
        }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(196, 149, 106, 0.3)' }}>
            <button type="button" onClick={() => setActiveTab('journal')} style={tabStyle(activeTab === 'journal')}>
              Journal
            </button>
            <button type="button" onClick={() => setActiveTab('quests')} style={tabStyle(activeTab === 'quests')}>
              Quests{activeQuests.length > 0 ? ` (${activeQuests.length})` : ''}
            </button>
            <button type="button" onClick={() => setActiveTab('postcards')} style={tabStyle(activeTab === 'postcards')}>
              Postcards
            </button>
          </div>

          {/* Tab content */}
          <div
            ref={scrollRef}
            style={{
              maxHeight: 300,
              overflowY: 'auto',
              padding: '0.5rem',
            }}
          >
            {activeTab === 'journal' ? (
              /* ── Journal tab content ──────────────────────────────── */
              <>
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
                  displayEntries.map((entry) => {
                    const isDiscovery = entry.type === 'discovery';
                    return (
                      <div
                        key={entry.id}
                        style={{
                          display: 'flex',
                          gap: '0.4rem',
                          padding: '0.35rem 0.25rem',
                          borderBottom: '1px solid rgba(196, 149, 106, 0.2)',
                          ...(isDiscovery ? {
                            borderLeft: '3px solid #c4956a',
                            background: 'rgba(196, 149, 106, 0.08)',
                            paddingLeft: '0.5rem',
                          } : {}),
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', flexShrink: 0, width: 18, textAlign: 'center' }}>
                          {typeIcon[entry.type]}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {isDiscovery && (
                            <div style={{
                              fontFamily: "'Cinzel', Georgia, serif",
                              fontSize: '0.45rem',
                              fontWeight: 700,
                              color: '#c4956a',
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase' as const,
                              marginBottom: 2,
                            }}>
                              DISCOVERY
                            </div>
                          )}
                          <div style={{
                            fontFamily: "'Lora', Georgia, serif",
                            fontSize: '0.7rem',
                            color: '#3d2b1f',
                            lineHeight: 1.5,
                            ...(isDiscovery ? { fontStyle: 'italic' } : {}),
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
                    );
                  }))
                }

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
              </>
            ) : activeTab === 'quests' ? (
              /* ── Quests tab content ──────────────────────────────── */
              <QuestsTabContent
                activeQuests={activeQuests}
                completedQuests={completedQuests}
                availableQuests={availableQuests}
              />
            ) : (
              /* ── Postcards tab content ──────────────────────────── */
              <PostcardsTabContent postcards={postcards} totalPorts={totalPorts} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── QuestsTabContent — renders quest lists by status ─────────────────── */

function QuestsTabContent({
  activeQuests,
  completedQuests,
  availableQuests,
}: {
  activeQuests: QuestWithProgress[];
  completedQuests: QuestWithProgress[];
  availableQuests: QuestWithProgress[];
}): React.ReactElement {
  const hasAny = activeQuests.length > 0 || completedQuests.length > 0 || availableQuests.length > 0;

  if (!hasAny) {
    return (
      <div style={{
        fontFamily: "'Lora', Georgia, serif",
        fontSize: '0.75rem',
        color: '#7a5c45',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: '1.5rem 1rem',
      }}>
        No quests yet. Speak with merchants at port.
      </div>
    );
  }

  return (
    <div>
      {/* Active quests */}
      {activeQuests.map(({ quest, progress }) => (
        <div key={quest.id} style={{ marginBottom: '0.75rem' }}>
          <div style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: '0.65rem',
            fontWeight: 700,
            color: '#5a3e2b',
            marginBottom: '0.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            <span style={{ color: '#c4956a', fontSize: '0.7rem' }}>{'\u2694'}</span>
            {quest.name}
          </div>
          <div style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: '0.6rem',
            color: '#7a5c45',
            marginBottom: '0.3rem',
            lineHeight: 1.4,
          }}>
            {quest.description}
          </div>
          {/* Objectives list */}
          <div style={{ paddingLeft: '0.5rem' }}>
            {quest.objectives.map((obj, idx) => {
              const isCompleted = idx < progress.currentObjective;
              const isCurrent = idx === progress.currentObjective;
              const marker = isCompleted ? '[x]' : isCurrent ? '[>]' : '[ ]';
              return (
                <div
                  key={obj.id}
                  style={{
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: '0.58rem',
                    color: isCompleted ? '#a08870' : isCurrent ? '#3d2b1f' : '#b8a898',
                    lineHeight: 1.6,
                    fontWeight: isCurrent ? 600 : 400,
                    textDecoration: isCompleted ? 'line-through' : 'none',
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: '0.55rem', marginRight: '0.3rem' }}>
                    {marker}
                  </span>
                  {obj.description}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Completed quests */}
      {completedQuests.map(({ quest, progress }) => (
        <div key={quest.id} style={{
          marginBottom: '0.75rem',
          padding: '0.4rem',
          borderRadius: 4,
          background: 'rgba(196, 149, 106, 0.08)',
        }}>
          <div style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: '0.6rem',
            fontWeight: 700,
            color: '#7a5c45',
            marginBottom: '0.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            <span style={{ color: '#6b8e5a', fontSize: '0.7rem' }}>{'\u2714'}</span>
            {quest.name}
          </div>
          {progress.completedAt && (
            <div style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.5rem',
              color: '#a08870',
              marginBottom: '0.2rem',
            }}>
              Completed: {progress.completedAt}
            </div>
          )}
          {quest.historicalNote && (
            <div style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.58rem',
              color: '#5a3e2b',
              lineHeight: 1.5,
              fontStyle: 'italic',
              borderLeft: '2px solid #c4956a',
              paddingLeft: '0.5rem',
              marginTop: '0.3rem',
            }}>
              {quest.historicalNote}
            </div>
          )}
        </div>
      ))}

      {/* Available quests */}
      {availableQuests.map(({ quest }) => (
        <div key={quest.id} style={{ marginBottom: '0.5rem' }}>
          <div style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: '0.58rem',
            fontWeight: 400,
            color: '#b8a898',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            <span style={{ fontSize: '0.55rem' }}>{'\u25CB'}</span>
            {quest.name}
            <span style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.48rem',
              color: '#c4b8a8',
              fontStyle: 'italic',
            }}>
              — Available
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── PostcardsTabContent — renders collected port postcards ───────────── */

function PostcardsTabContent({
  postcards,
  totalPorts,
}: {
  postcards: PostcardData[];
  totalPorts: number;
}): React.ReactElement {
  return (
    <div>
      {/* Collection count */}
      <div style={{
        fontFamily: "'Cinzel', Georgia, serif",
        fontSize: '0.6rem',
        fontWeight: 700,
        color: '#7a5c45',
        textAlign: 'center',
        padding: '0.5rem 0',
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        borderBottom: '1px solid rgba(196, 149, 106, 0.3)',
        marginBottom: '0.5rem',
      }}>
        {postcards.length}/{totalPorts} Postcards Collected
      </div>

      {postcards.length === 0 ? (
        <div style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: '0.75rem',
          color: '#7a5c45',
          fontStyle: 'italic',
          textAlign: 'center',
          padding: '1.5rem 1rem',
        }}>
          Visit new ports to collect postcards.
        </div>
      ) : (
        postcards.map((pc) => (
          <div
            key={pc.portId}
            style={{
              marginBottom: '0.6rem',
              padding: '0.5rem',
              borderRadius: 4,
              background: 'rgba(196, 149, 106, 0.06)',
              border: '1px solid rgba(196, 149, 106, 0.2)',
              borderLeft: '3px solid #c4956a',
            }}
          >
            <div style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: '0.65rem',
              fontWeight: 700,
              color: '#5a3e2b',
              marginBottom: '0.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}>
              <span style={{ color: '#c4956a', fontSize: '0.7rem' }}>{'\u2726'}</span>
              {pc.portName}
            </div>
            <p style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.65rem',
              color: '#3d2b1f',
              lineHeight: 1.55,
              margin: 0,
              fontStyle: 'italic',
            }}>
              {pc.description}
            </p>
            <div style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: '0.5rem',
              color: '#a08870',
              marginTop: '0.2rem',
            }}>
              Turn {pc.discoveredAtTurn}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

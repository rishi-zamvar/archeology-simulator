/**
 * IPC handlers for journal channels.
 *
 * registerJournalIPCHandlers(db) wires:
 *   journal:getEntries — return all persisted journal entries (newest first)
 *   journal:addNote    — add a player-written note to the journal
 */

import type Database from 'better-sqlite3';
import { wrapHandler } from '../lib/ipc-wrapper';
import { createLogger } from '../lib/logger';
import { loadGameState, insertJournalEntry, getJournalEntries } from '../db/queries';
import type { JournalEntry } from '../../shared/game-types';

const log = createLogger('JournalIPC');

export function registerJournalIPCHandlers(db: Database.Database): void {
  /**
   * journal:getEntries — return persisted journal entries, newest first.
   * Optional limit parameter.
   */
  wrapHandler<JournalEntry[], [number?]>(
    'journal:getEntries',
    async (limit) => {
      return getJournalEntries(db, limit);
    },
  );

  /**
   * journal:addNote — player writes a personal note/reflection.
   * Creates a 'note' type journal entry at the current turn.
   */
  wrapHandler<void, [string, string]>(
    'journal:addNote',
    async (title, text) => {
      const state = loadGameState(db);
      const turn = state?.currentTurn ?? 0;
      insertJournalEntry(db, turn, 'note', title, { text });
      log.info('Player note added', { turn, title });
    },
    (title, text) => {
      if (!title || typeof title !== 'string') return 'title required';
      if (!text || typeof text !== 'string') return 'text required';
      return null;
    },
  );
}

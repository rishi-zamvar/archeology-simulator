/**
 * IPC handlers for game channels.
 *
 * registerGameIPCHandlers(db) wires:
 *   game:action            — apply FSM action, auto-save, broadcast update
 *   game:getPorts           — return all 25 seeded ports
 *   game:getPortDetails     — return a single port by ID
 *   game:getMarketPrices    — return MarketGood[] for a port
 *   game:getReachablePorts  — return ports reachable within 5 turns
 *   game:getPlayerInventory — return player gold and cargo
 *   game:get-curated-images — return curated image metadata for a good or port
 *   game:scan-resource-images — scan resources/images/ for available files
 */

import { BrowserWindow } from 'electron';
import { wrapHandler } from '../lib/ipc-wrapper';
import { createLogger } from '../lib/logger';
import { getResourcesBase } from '../lib/paths';

const log = createLogger('GameIPC');
import path from 'path';
import fs from 'fs';
import type Database from 'better-sqlite3';
import {
  loadGameState,
  saveGameStateAtomic,
  getAllPorts,
  getPortById,
  getMarketPrices,
  getPlayerInventory,
  buyGood,
  sellGood,
  getTransactionHistory,
  getCuratedImagesForGood,
  getCuratedImagesForPort,
  insertJournalEntry,
  insertJournalEntryIfUnderCap,
  hasDiscovery,
  markDiscovery,
  getPortLore,
  getPortReputation,
  getPortAccessLevel,
  getAllPortAccess,
  autoDiscoverPort,
} from '../db/queries';
import { evaluateActiveQuests } from './quest';
import { performAction } from '../../game/engine';
import { getReachablePorts } from '../../game/voyage';
import { rollVoyageEvent, resolveEventChoice } from '../../game/events';
import { getWeatherModifiers, getSeason, getSeasonalWeatherDescription } from '../../game/weather';
import type { SailingTurnResult } from '../../game/sailing';
import type { GameAction, GameResult, GameState, SailingState, TutorialPhase } from '../../game/types';
import type { VoyageEvent, PortLore, PortAccessLevel, PortAccessInfo } from '../../shared/game-types';

// New games start the tutorial from the beginning.
// Existing saves that pre-date the tutorial system will have tutorialPhase=undefined;
// those are defaulted to 'completed' at load time so returning players aren't re-tutorialized.
const INITIAL_STATE: GameState = { type: 'idle', currentTurn: 0, tutorialPhase: { type: 'map_intro' } };

/**
 * Backfill tutorialPhase on a loaded save that predates the tutorial system.
 * Existing saves have no tutorialPhase field → default to 'completed' so
 * returning players are not forced through the tutorial again.
 */
function withTutorialDefault(state: GameState): GameState {
  if (state.tutorialPhase !== undefined) return state;
  return { ...state, tutorialPhase: { type: 'completed' } as TutorialPhase };
}

// In-memory pending event — cleared after resolution or on next SET_SAIL.
// Single-player game: only one event can be pending at a time.
let pendingVoyageEvent: VoyageEvent | null = null;

// Phase 11: Sailing context preserved when an encounter fires mid-voyage.
// Used by resolveEvent to resume sailing instead of returning to idle.
interface PendingSailingContext {
  destination: string;
  eta: number;
  departurePortId?: string;
  voyageTurnsTotal?: number;
  voyageTurnsElapsed?: number;
}
let pendingSailingContext: PendingSailingContext | null = null;

export function registerGameIPCHandlers(db: Database.Database): void {
  /**
   * game:action — apply action to current state, auto-save, broadcast update.
   */
  wrapHandler<GameResult, [GameAction]>(
    'game:action',
    async (action) => {
      const current = withTutorialDefault(loadGameState(db) ?? INITIAL_STATE);
      const result = performAction(current, action);

      if (result.success) {
        try {
          saveGameStateAtomic(db, result.state);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { success: false, state: current, error: `Save failed: ${message}` };
        }

        // Phase 11: SET_SAIL no longer rolls events inline — events are now
        // rolled per-turn via game:advanceSailingTurn. SET_SAIL only transitions
        // to sailing state and logs the departure journal entry.
        if (action.type === 'SET_SAIL') {
          pendingVoyageEvent = null; // clear any stale event from prior voyage
          pendingSailingContext = null; // clear stale sailing context

          // Auto-log departure to captain's journal (Phase 10 — JRN-04)
          if (current.type === 'trading' && current.selectedPort) {
            const depPort = getPortById(db, current.selectedPort);
            insertJournalEntry(db, result.state.currentTurn, 'departure',
              `Departed from ${depPort?.ancientName ?? current.selectedPort}`,
              { portId: current.selectedPort, portName: depPort?.ancientName ?? current.selectedPort, destination: 'the open sea' }
            );
          }
        }

        // Auto-log arrival to captain's journal (Phase 10 — JRN-04)
        if (current.type === 'sailing' && result.state.type === 'trading' && result.state.selectedPort) {
          const arrPortId = result.state.selectedPort;
          const arrPort = getPortById(db, arrPortId);
          insertJournalEntry(db, result.state.currentTurn, 'arrival',
            `Arrived at ${arrPort?.ancientName ?? arrPortId}`,
            { portId: arrPortId, portName: arrPort?.ancientName ?? arrPortId }
          );

          // Phase 20: First-visit discovery — record port culture on first arrival
          const discoverySubject = `port_visit_${arrPortId}`;
          if (!hasDiscovery(db, discoverySubject)) {
            const isNew = markDiscovery(db, 'port_culture', discoverySubject, result.state.currentTurn);
            if (isNew && arrPort?.ambientDescription) {
              insertJournalEntryIfUnderCap(db, result.state.currentTurn, 'discovery',
                `Discovered: ${arrPort.ancientName ?? arrPortId}`,
                { category: 'port_culture' as const, subject: discoverySubject, text: arrPort.ambientDescription },
                'narrative'
              );
            }
          }

          // Phase 15: Evaluate quests on port arrival
          evaluateActiveQuests(db);
        }

        // Broadcast updated state to all renderer windows.
        for (const win of BrowserWindow.getAllWindows()) {
          if (!win.isDestroyed()) {
            win.webContents.send('subscribe:game:updated', result.state);
          }
        }
      }

      return result;
    },
    (action) => (!action || typeof action.type !== 'string' ? 'Invalid action' : null),
  );

  /**
   * game:getPorts — return all seeded ports.
   */
  wrapHandler('game:getPorts', async () => {
    return getAllPorts(db);
  });

  /**
   * game:getPortDetails — return a single port by ID.
   */
  wrapHandler<ReturnType<typeof getPortById>, [string]>(
    'game:getPortDetails',
    async (portId) => getPortById(db, portId),
    (portId) => (!portId || typeof portId !== 'string' ? 'portId required' : null),
  );

  /**
   * game:getMarketPrices — return MarketGood[] for a given port.
   */
  wrapHandler<ReturnType<typeof getMarketPrices>, [string]>(
    'game:getMarketPrices',
    async (portId) => getMarketPrices(db, portId),
    (portId) => (!portId || typeof portId !== 'string' ? 'portId required' : null),
  );

  /**
   * game:getReachablePorts — return ports within 5 sailing turns from a given port.
   */
  wrapHandler<ReturnType<typeof getReachablePorts>, [string, number?]>(
    'game:getReachablePorts',
    async (fromPortId, currentTurn) => {
      const ports = getReachablePorts(fromPortId, getAllPorts(db));
      if (currentTurn === undefined) return ports;
      const mods = getWeatherModifiers(currentTurn);
      // Apply duration multiplier to each route — round up, minimum 1
      return ports.map(entry => ({
        ...entry,
        route: {
          ...entry.route,
          durationTurns: Math.max(1, Math.ceil(entry.route.durationTurns * mods.durationMultiplier)),
        },
      }));
    },
    (fromPortId) => (!fromPortId || typeof fromPortId !== 'string' ? 'portId required' : null),
  );

  /**
   * game:getPlayerInventory — return the player's current inventory.
   */
  wrapHandler('game:getPlayerInventory', async () => {
    return getPlayerInventory(db);
  });

  /**
   * game:buyGood — atomic buy transaction; returns updated PlayerInventory.
   * Broadcasts game:updated after successful trade.
   */
  wrapHandler<ReturnType<typeof buyGood>, [string, string, number]>(
    'game:buyGood',
    async (portId, goodId, qty) => {
      const inventory = buyGood(db, portId, goodId, qty);
      broadcastGameUpdated(db);
      // Phase 15: Evaluate quests after trade
      evaluateActiveQuests(db);
      return inventory;
    },
    (portId, goodId, qty) => {
      if (!portId || typeof portId !== 'string') return 'portId required';
      if (!goodId || typeof goodId !== 'string') return 'goodId required';
      if (typeof qty !== 'number' || qty <= 0) return 'qty must be a positive number';
      return null;
    },
  );

  /**
   * game:sellGood — atomic sell transaction; returns updated PlayerInventory.
   * Broadcasts game:updated after successful trade.
   */
  wrapHandler<ReturnType<typeof sellGood>, [string, string, number]>(
    'game:sellGood',
    async (portId, goodId, qty) => {
      const inventory = sellGood(db, portId, goodId, qty);
      broadcastGameUpdated(db);
      // Phase 15: Evaluate quests after trade
      evaluateActiveQuests(db);
      return inventory;
    },
    (portId, goodId, qty) => {
      if (!portId || typeof portId !== 'string') return 'portId required';
      if (!goodId || typeof goodId !== 'string') return 'goodId required';
      if (typeof qty !== 'number' || qty <= 0) return 'qty must be a positive number';
      return null;
    },
  );

  /**
   * game:getTransactionHistory — return last N transaction records (default 10).
   */
  wrapHandler<ReturnType<typeof getTransactionHistory>, [number?]>(
    'game:getTransactionHistory',
    async (limit) => getTransactionHistory(db, limit),
  );

  /**
   * game:getPendingEvent — return the current in-flight voyage event, or null.
   */
  wrapHandler('game:getPendingEvent', async () => {
    return pendingVoyageEvent;
  });

  /**
   * game:advanceSailingTurn — Phase 11: advance one turn during a voyage.
   * Rolls for an event, updates game state, returns SailingTurnResult.
   * Called repeatedly by the renderer during sailing animation.
   */
  wrapHandler<SailingTurnResult, []>(
    'game:advanceSailingTurn',
    async () => {
      const current = withTutorialDefault(loadGameState(db) ?? INITIAL_STATE);
      if (current.type !== 'sailing') {
        throw new Error('Not in sailing state');
      }

      // Advance turn
      const elapsed = (current.voyageTurnsElapsed ?? 0) + 1;
      const total = current.voyageTurnsTotal ?? 1;
      const newTurn = current.currentTurn + 1;
      const arrived = elapsed >= total;

      // Get weather for this turn
      const mods = getWeatherModifiers(newTurn);
      const weatherDesc = getSeasonalWeatherDescription(newTurn);
      const { season, monthName } = getSeason(newTurn);

      // Roll for event
      const event = rollVoyageEvent(
        newTurn,
        current.departurePortId,
        current.destination,
        { storm: mods.stormWeight, pirate: mods.pirateWeight, calm: mods.calmWeight }
      );

      // Update state: advance currentTurn, voyageTurnsElapsed
      const updatedSailing: GameState = {
        ...current,
        currentTurn: newTurn,
        voyageTurnsElapsed: elapsed,
      };

      if (event) {
        // Store pending event and sailing context for resume after resolution
        pendingVoyageEvent = event;
        pendingSailingContext = {
          destination: current.destination,
          eta: current.eta,
          departurePortId: current.departurePortId,
          voyageTurnsTotal: total,
          voyageTurnsElapsed: elapsed,
        };

        const encResult = performAction(updatedSailing, {
          type: 'ENCOUNTER',
          eventType: event.type,
        });
        if (encResult.success) {
          saveGameStateAtomic(db, encResult.state);
          // Broadcast so renderer shows EventCard
          for (const win of BrowserWindow.getAllWindows()) {
            if (!win.isDestroyed()) {
              win.webContents.send('subscribe:game:updated', encResult.state);
            }
          }
        }
      } else {
        // No event — just save the advanced turn
        saveGameStateAtomic(db, updatedSailing);
      }

      return {
        turnNumber: elapsed,
        totalTurns: total,
        event,
        weatherDescription: weatherDesc,
        season,
        monthName,
        arrived,
      };
    }
  );

  /**
   * game:get-curated-images — return curated image metadata for a good or port.
   * Resolves relative file paths to absolute paths and checks file existence.
   */
  wrapHandler<Array<Record<string, unknown>>, [{ goodId?: string; portId?: string }]>(
    'game:get-curated-images',
    async (query) => {
      let images;
      if (query.goodId) {
        images = getCuratedImagesForGood(db, query.goodId);
      } else if (query.portId) {
        images = getCuratedImagesForPort(db, query.portId);
      } else {
        return [];
      }
      const resourcesBase = getResourcesBase();
      return images.map(image => ({
        ...image,
        filePath: path.join(resourcesBase, image.filePath),
        fileExists: fs.existsSync(path.join(resourcesBase, image.filePath)),
      }));
    },
    (query) => (!query || (!query.goodId && !query.portId) ? 'query must have goodId or portId' : null),
  );

  /**
   * game:scan-resource-images — scan resources/images/ for available image files.
   * Returns { ports: Record<portId, string>, goods: Record<goodId, string[]> }
   * where values are relative paths suitable for resource-image:// protocol URLs.
   * No database dependency — purely filesystem-based detection.
   */
  wrapHandler('game:scan-resource-images', async () => {
    const resourcesBase = getResourcesBase();
    const imagesDir = path.join(resourcesBase, 'images');
    const imageExts = new Set(['.jpg', '.jpeg', '.png', '.webp']);

    // Scan port images: resources/images/ports/{portId}.{ext}
    const ports: Record<string, string> = {};
    const portsDir = path.join(imagesDir, 'ports');
    if (fs.existsSync(portsDir)) {
      for (const file of fs.readdirSync(portsDir)) {
        const ext = path.extname(file).toLowerCase();
        const name = path.basename(file, path.extname(file));
        if (imageExts.has(ext) && name !== '.gitkeep') {
          ports[name] = `ports/${file}`;
        }
      }
    }

    // Scan good images: resources/images/{goodId}/{filename}.{ext}
    const goods: Record<string, string[]> = {};
    if (fs.existsSync(imagesDir)) {
      for (const dir of fs.readdirSync(imagesDir)) {
        if (dir === 'ports' || dir === 'ui' || dir === '.gitkeep') continue;
        const goodDir = path.join(imagesDir, dir);
        if (!fs.statSync(goodDir).isDirectory()) continue;
        const files: string[] = [];
        for (const file of fs.readdirSync(goodDir)) {
          const ext = path.extname(file).toLowerCase();
          if (imageExts.has(ext)) {
            files.push(`${dir}/${file}`);
          }
        }
        if (files.length > 0) {
          goods[dir] = files;
        }
      }
    }

    return { ports, goods };
  });

  /**
   * game:resolveEvent — apply event outcome to inventory and transition FSM to idle.
   *
   * Atomically:
   *  1. Resolves the event choice to an EventOutcome
   *  2. Applies goldDelta and cargoDelta to player_inventory
   *  3. Transitions FSM: encountered → idle
   *  4. Clears pendingVoyageEvent
   *  5. Broadcasts the updated state to all windows
   */
  wrapHandler<{ success: boolean; outcome?: ReturnType<typeof resolveEventChoice>; message?: string; error?: string }, [string, string]>(
    'game:resolveEvent',
    async (eventId, choiceId) => {
      if (!pendingVoyageEvent || pendingVoyageEvent.id !== eventId) {
        return { success: false, error: 'No pending event or event mismatch' };
      }

      const event = pendingVoyageEvent;

      let outcome: ReturnType<typeof resolveEventChoice>;
      try {
        const inv = getPlayerInventory(db);
        outcome = resolveEventChoice(event, choiceId, inv);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }

      // Apply outcome atomically
      const applyOutcome = db.transaction(() => {
        // Apply goldDelta
        if (outcome.goldDelta !== 0) {
          db.prepare(
            `UPDATE player_inventory SET gold = MAX(0, gold + ?) WHERE id = 1`
          ).run(outcome.goldDelta);
        }

        // Apply cargoDelta
        const freshInv = getPlayerInventory(db);
        const updatedCargo = [...freshInv.cargoItems];
        const currentState = withTutorialDefault(loadGameState(db) ?? INITIAL_STATE);
        const eventTurn = currentState.currentTurn;

        for (const [goodId, delta] of Object.entries(outcome.cargoDelta)) {
          if (delta === undefined || delta === 0) continue;

          const idx = updatedCargo.findIndex((c) => c.goodId === goodId);

          if (delta > 0) {
            // Gain cargo
            if (idx >= 0) {
              updatedCargo[idx] = {
                ...updatedCargo[idx],
                quantity: updatedCargo[idx].quantity + delta,
              };
            } else {
              updatedCargo.push({
                goodId,
                quantity: delta,
                boughtAtPrice: 0,
                boughtAtPort: 'salvaged',
                boughtAtTurn: eventTurn,
              });
            }
          } else if (delta < 0 && idx >= 0) {
            // Lose cargo
            const newQty = Math.max(0, updatedCargo[idx].quantity + delta);
            if (newQty === 0) {
              updatedCargo.splice(idx, 1);
            } else {
              updatedCargo[idx] = { ...updatedCargo[idx], quantity: newQty };
            }
          }
        }

        db.prepare(
          `UPDATE player_inventory SET cargo_json = ? WHERE id = 1`
        ).run(JSON.stringify(updatedCargo));
      });

      applyOutcome();

      // Auto-log event to captain's journal (Phase 10 — JRN-03)
      const currentForJournal = withTutorialDefault(loadGameState(db) ?? INITIAL_STATE);
      insertJournalEntry(db, currentForJournal.currentTurn, 'voyage_event',
        `Encountered: ${event.title}`,
        { eventType: event.type, choiceId, outcome: outcome.message, goldDelta: outcome.goldDelta }
      );

      // Transition FSM: encountered → sailing (resume) or encountered → idle
      const current = withTutorialDefault(loadGameState(db) ?? INITIAL_STATE);
      const sailCtx = pendingSailingContext;
      const voyageStillInProgress = sailCtx &&
        sailCtx.voyageTurnsElapsed !== undefined &&
        sailCtx.voyageTurnsTotal !== undefined &&
        sailCtx.voyageTurnsElapsed < sailCtx.voyageTurnsTotal;

      const nextAction = voyageStillInProgress
        ? {
            type: 'RESUME_SAILING' as const,
            destination: sailCtx!.destination,
            eta: sailCtx!.eta,
            departurePortId: sailCtx!.departurePortId,
            voyageTurnsTotal: sailCtx!.voyageTurnsTotal,
            voyageTurnsElapsed: sailCtx!.voyageTurnsElapsed,
          }
        : { type: 'RESOLVE' as const };

      const nextResult = performAction(current, nextAction);
      if (nextResult.success) {
        try {
          saveGameStateAtomic(db, nextResult.state);
        } catch (err) {
          // Non-fatal: state stays encountered but we still return success
          log.warn('Non-fatal: failed to save resolved state', { error: String(err) });
        }
      }

      pendingVoyageEvent = null;
      pendingSailingContext = null;

      // Broadcast updated state
      const finalState = loadGameState(db) ?? nextResult.state;
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send('subscribe:game:updated', finalState);
        }
      }

      return {
        success: true,
        outcome,
        message: outcome.message,
      };
    },
    (eventId, choiceId) => {
      if (!eventId || typeof eventId !== 'string') return 'eventId required';
      if (!choiceId || typeof choiceId !== 'string') return 'choiceId required';
      return null;
    },
  );

  /**
   * game:waitForSpring — advance turns to Elaphebolion (month index 8) and deduct
   * port fees (50 gold per turn waited). Used when player chooses to wait out
   * the mare clausum (winter sailing closure) period.
   */
  wrapHandler<GameResult, []>(
    'game:waitForSpring',
    async () => {
      const current = withTutorialDefault(loadGameState(db) ?? INITIAL_STATE);
      const monthIndex = current.currentTurn % 12;
      // Calculate turns until Elaphebolion (index 8 = start of spring)
      let turnsToWait = (8 - monthIndex + 12) % 12;
      if (turnsToWait === 0) turnsToWait = 12; // already at spring start, wait full year

      const portFee = turnsToWait * 50; // 50 gold per turn in port

      // Deduct gold from player_inventory (same pattern as resolveEvent)
      db.prepare(
        `UPDATE player_inventory SET gold = MAX(0, gold - ?) WHERE id = 1`
      ).run(portFee);

      // Advance turn
      const newTurn = current.currentTurn + turnsToWait;
      const newState: GameState = { ...current, currentTurn: newTurn };

      try {
        saveGameStateAtomic(db, newState);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, state: current, error: `Save failed: ${message}` };
      }

      log.info('Player waited for spring', { turnsWaited: turnsToWait, goldDeducted: portFee, newTurn });

      broadcastGameUpdated(db);
      return { success: true, state: newState };
    },
  );

  /**
   * game:getJourneyStats — return aggregate journey statistics for conclusion screen.
   */
  wrapHandler<{ portsVisited: number; goodsTraded: number; turnsElapsed: number; questsCompleted: number; goldEarned: number }>(
    'game:getJourneyStats',
    async () => {
      const state = loadGameState(db);
      const turnsElapsed = state?.currentTurn ?? 0;

      // Count unique ports visited (from journal arrival entries)
      const portsRow = db.prepare(
        "SELECT COUNT(DISTINCT json_extract(body, '$.portId')) as count FROM journal_entries WHERE entry_type = 'arrival'"
      ).get() as { count: number };

      // Count total trades (buy + sell from transaction_history)
      const tradesRow = db.prepare(
        'SELECT COUNT(*) as count FROM transaction_history'
      ).get() as { count: number };

      // Count completed quests
      const questsRow = db.prepare(
        "SELECT COUNT(*) as count FROM quest_progress WHERE status = 'completed'"
      ).get() as { count: number };

      // Current gold
      const inv = getPlayerInventory(db);

      return {
        portsVisited: portsRow.count,
        goodsTraded: tradesRow.count,
        turnsElapsed,
        questsCompleted: questsRow.count,
        goldEarned: inv.gold,
      };
    },
  );

  /**
   * game:getPortLore — return lore data for a specific port.
   */
  wrapHandler<PortLore | null, [string]>(
    'game:getPortLore',
    async (portId) => getPortLore(db, portId),
    (portId) => (!portId || typeof portId !== 'string' ? 'portId is required' : null),
  );

  /**
   * game:getPortReputation — return player's reputation tier at a port.
   */
  wrapHandler<ReturnType<typeof getPortReputation>, [string]>(
    'game:getPortReputation',
    async (portId) => getPortReputation(db, portId),
    (portId) => (!portId || typeof portId !== 'string' ? 'portId required' : null),
  );

  /**
   * game:getPortAccessLevel — return the access level for a specific port.
   */
  wrapHandler<PortAccessLevel, [string]>(
    'game:getPortAccessLevel',
    async (portId) => getPortAccessLevel(db, portId),
    (portId) => (!portId || typeof portId !== 'string' ? 'portId required' : null),
  );

  /**
   * game:getAllPortAccess — return access info for all ports.
   */
  wrapHandler<PortAccessInfo[]>(
    'game:getAllPortAccess',
    async () => getAllPortAccess(db),
  );

  /**
   * game:autoDiscoverPort — auto-discover a port on visit (unknown -> discovered).
   * Returns true if status was upgraded, false if already discovered/unlocked.
   */
  wrapHandler<boolean, [string, number]>(
    'game:autoDiscoverPort',
    async (portId, turn) => autoDiscoverPort(db, portId, turn),
    (portId, turn) => {
      if (!portId || typeof portId !== 'string') return 'portId required';
      if (typeof turn !== 'number') return 'turn required';
      return null;
    },
  );
}

/**
 * Broadcast the current game state to all renderer windows.
 * Called after buy/sell to keep all windows in sync.
 */
function broadcastGameUpdated(db: Database.Database): void {
  const rawState = loadGameState(db);
  if (!rawState) return;
  const state = withTutorialDefault(rawState);
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('subscribe:game:updated', state);
    }
  }
}

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
} from '../db/queries';
import { performAction } from '../../game/engine';
import { getReachablePorts } from '../../game/voyage';
import { rollVoyageEvent, resolveEventChoice } from '../../game/events';
import { getWeatherModifiers } from '../../game/weather';
import type { GameAction, GameResult, GameState, TutorialPhase } from '../../game/types';
import type { VoyageEvent } from '../../shared/game-types';

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

        // After SET_SAIL, roll for a voyage event. If one fires, interrupt
        // the sailing state with ENCOUNTER and store the pending event.
        if (action.type === 'SET_SAIL') {
          pendingVoyageEvent = null; // clear any stale event from prior voyage
          const mods = getWeatherModifiers(result.state.currentTurn);
          const event = rollVoyageEvent(
            result.state.currentTurn,
            undefined,
            undefined,
            { storm: mods.stormWeight, pirate: mods.pirateWeight, calm: mods.calmWeight }
          );
          if (event) {
            pendingVoyageEvent = event;
            // Transition FSM: sailing → encountered
            const encounterResult = performAction(result.state, {
              type: 'ENCOUNTER',
              eventType: event.type,
            });
            if (encounterResult.success) {
              try {
                saveGameStateAtomic(db, encounterResult.state);
              } catch (err) {
                // Non-fatal: event won't interrupt but voyage proceeds
                log.warn('Non-fatal: failed to save encounter state', { error: String(err) });
                pendingVoyageEvent = null;
              }
              // Broadcast encountered state so renderer opens EventCard
              for (const win of BrowserWindow.getAllWindows()) {
                if (!win.isDestroyed()) {
                  win.webContents.send('subscribe:game:updated', encounterResult.state);
                }
              }
              return { success: true, state: encounterResult.state };
            }
          }
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

      // Transition FSM: encountered → idle
      const current = withTutorialDefault(loadGameState(db) ?? INITIAL_STATE);
      const nextResult = performAction(current, { type: 'RESOLVE' });
      if (nextResult.success) {
        try {
          saveGameStateAtomic(db, nextResult.state);
        } catch (err) {
          // Non-fatal: state stays encountered but we still return success
          log.warn('Non-fatal: failed to save resolved state', { error: String(err) });
        }
      }

      pendingVoyageEvent = null;

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

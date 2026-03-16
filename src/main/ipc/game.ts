/**
 * IPC handlers for game channels.
 *
 * registerGameIPCHandlers(db) wires:
 *   game:action   — apply FSM action, auto-save, broadcast update
 *   game:getPorts — return all 25 seeded ports
 *   game:getPortDetails — return a single port by ID
 *   game:getMarketPrices — return MarketGood[] for a port
 *   game:getReachablePorts — return ports reachable within 5 turns
 *   game:getPlayerInventory — return player gold and cargo
 */

import { ipcMain, BrowserWindow, app } from 'electron';
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
  getArtifactsForGood,
  cacheArtifact,
  getCuratedImagesForGood,
  getCuratedImagesForPort,
} from '../db/queries';
import type { CachedArtifact } from '../db/queries';
import type { ImageCandidate } from '../../shared/ipc-types';
import { performAction } from '../../game/engine';
import { getReachablePorts } from '../../game/voyage';
import { rollVoyageEvent, resolveEventChoice } from '../../game/events';
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
  ipcMain.handle('game:action', async (_event, action: GameAction): Promise<GameResult> => {
    if (!action || typeof action.type !== 'string') {
      return { success: false, state: INITIAL_STATE, error: 'Invalid action' };
    }

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
        const event = rollVoyageEvent(result.state.currentTurn);
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
            } catch {
              // Non-fatal: event won't interrupt but voyage proceeds
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
  });

  /**
   * game:getPorts — return all seeded ports.
   */
  ipcMain.handle('game:getPorts', async () => {
    return getAllPorts(db);
  });

  /**
   * game:getPortDetails — return a single port by ID.
   */
  ipcMain.handle('game:getPortDetails', async (_event, portId: string) => {
    return getPortById(db, portId);
  });

  /**
   * game:getMarketPrices — return MarketGood[] for a given port.
   */
  ipcMain.handle('game:getMarketPrices', async (_event, portId: string) => {
    return getMarketPrices(db, portId);
  });

  /**
   * game:getReachablePorts — return ports within 5 sailing turns from a given port.
   */
  ipcMain.handle('game:getReachablePorts', async (_event, fromPortId: string) => {
    const ports = getAllPorts(db);
    return getReachablePorts(fromPortId, ports);
  });

  /**
   * game:getPlayerInventory — return the player's current inventory.
   */
  ipcMain.handle('game:getPlayerInventory', async () => {
    return getPlayerInventory(db);
  });

  /**
   * game:buyGood — atomic buy transaction; returns updated PlayerInventory.
   * Broadcasts game:updated after successful trade.
   */
  ipcMain.handle(
    'game:buyGood',
    async (_event, portId: string, goodId: string, qty: number) => {
      const inventory = buyGood(db, portId, goodId, qty);
      broadcastGameUpdated(db);
      return inventory;
    }
  );

  /**
   * game:sellGood — atomic sell transaction; returns updated PlayerInventory.
   * Broadcasts game:updated after successful trade.
   */
  ipcMain.handle(
    'game:sellGood',
    async (_event, portId: string, goodId: string, qty: number) => {
      const inventory = sellGood(db, portId, goodId, qty);
      broadcastGameUpdated(db);
      return inventory;
    }
  );

  /**
   * game:getTransactionHistory — return last N transaction records (default 10).
   */
  ipcMain.handle('game:getTransactionHistory', async (_event, limit?: number) => {
    return getTransactionHistory(db, limit);
  });

  /**
   * game:getPendingEvent — return the current in-flight voyage event, or null.
   */
  ipcMain.handle('game:getPendingEvent', async () => {
    return pendingVoyageEvent;
  });

  /**
   * game:get-artifacts — return up to 3 cached museum artifact images for a trade good.
   *
   * Flow:
   *  1. Check artifact_cache for non-expired rows (24h TTL) → return immediately if found
   *  2. On cache miss: query Met Museum Collection API (public domain, no auth)
   *  3. Fetch up to 3 object detail records concurrently; cache each that has an image
   *  4. If Met returns zero results, fall back to Wikimedia Commons allimages API
   *  5. If both fail, return a single placeholder record so the renderer always has
   *     something to render (placeholder image path handled on renderer side)
   */
  ipcMain.handle('game:get-artifacts', async (_event, goodId: string): Promise<CachedArtifact[]> => {
    // 1. Cache hit
    const cached = getArtifactsForGood(db, goodId);
    if (cached.length > 0) return cached;

    const now = new Date().toISOString();
    const results: CachedArtifact[] = [];

    try {
      // 2. Met Museum search — use specific ancient Mediterranean search terms
      //    to avoid generic results returning the same popular artifact for every good
      const ARTIFACT_SEARCH_TERMS: Record<string, string> = {
        wheat: 'ancient Egyptian grain granary',
        olive_oil: 'Greek amphora olive oil',
        wine: 'Greek wine krater vessel',
        textiles: 'ancient linen textile Egyptian',
        spices: 'incense burner ancient',
        bronze: 'Greek bronze vessel ancient',
        timber: 'ancient wood carving ship',
        pottery: 'Greek vase painting pottery',
      };
      const searchTerm = ARTIFACT_SEARCH_TERMS[goodId] ?? goodId;
      const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(searchTerm)}&hasImages=true&isPublicDomain=true`;
      const searchResp = await fetch(searchUrl);
      if (searchResp.ok) {
        const searchData = await searchResp.json() as { objectIDs?: number[] };
        // Skip the first few results (often the same popular items) and pick from a spread
        const allIds = searchData.objectIDs ?? [];
        const ids = allIds.length > 10
          ? [allIds[2], allIds[5], allIds[9]].filter(Boolean)
          : allIds.slice(0, 3);

        if (ids.length > 0) {
          // 3. Fetch detail for up to 3 objects concurrently
          const detailResults = await Promise.all(
            ids.map(async (id) => {
              try {
                const resp = await fetch(
                  `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`
                );
                if (!resp.ok) return null;
                return await resp.json() as {
                  objectID: number;
                  isPublicDomain: boolean;
                  primaryImage: string;
                  title: string;
                  objectDescription?: string;
                  medium?: string;
                };
              } catch {
                return null;
              }
            })
          );

          for (const obj of detailResults) {
            if (obj && obj.isPublicDomain && obj.primaryImage) {
              const artifact: CachedArtifact = {
                id: `met_${goodId}_${obj.objectID}`,
                goodId,
                museumId: String(obj.objectID),
                imageUrl: obj.primaryImage,
                title: obj.title || goodId,
                description: obj.objectDescription ?? obj.medium ?? '',
                cacheTimestamp: now,
              };
              cacheArtifact(db, artifact);
              results.push(artifact);
            }
          }
        }
      }
    } catch {
      // Network error — fall through to Wikimedia
    }

    // 4. Wikimedia fallback
    if (results.length === 0) {
      try {
        const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=allimages&aiprefix=${encodeURIComponent(goodId)}&ailimit=5&format=json&origin=*`;
        const wikiResp = await fetch(wikiUrl);
        if (wikiResp.ok) {
          const wikiData = await wikiResp.json() as {
            query?: { allimages?: Array<{ url: string; name: string; descriptionurl?: string }> };
          };
          const images = wikiData.query?.allimages ?? [];
          if (images.length > 0) {
            const img = images[0];
            const artifact: CachedArtifact = {
              id: `wiki_${goodId}_0`,
              goodId,
              museumId: `wiki_${goodId}_0`,
              imageUrl: img.url,
              title: img.name.replace(/_/g, ' ').replace(/\.[^.]+$/, ''),
              description: '',
              cacheTimestamp: now,
            };
            cacheArtifact(db, artifact);
            results.push(artifact);
          }
        }
      } catch {
        // Network error — fall through to placeholder
      }
    }

    // 5. Placeholder so the renderer always receives an array with at least one item
    if (results.length === 0) {
      return [
        {
          id: `placeholder_${goodId}`,
          goodId,
          museumId: 'placeholder',
          imageUrl: '/assets/placeholder-artifact.png',
          title: goodId,
          description: '',
          cacheTimestamp: now,
        },
      ];
    }

    return results;
  });

  /**
   * game:get-curated-images — return curated image metadata for a good or port.
   * Resolves relative file paths to absolute paths and checks file existence.
   */
  ipcMain.handle('game:get-curated-images', async (_event, query: { goodId?: string; portId?: string }) => {
    let images;
    if (query.goodId) {
      images = getCuratedImagesForGood(db, query.goodId);
    } else if (query.portId) {
      images = getCuratedImagesForPort(db, query.portId);
    } else {
      return [];
    }
    const resourcesBase = process.env['NODE_ENV'] === 'development'
      ? path.join(__dirname, '../../resources')
      : path.join(app.getAppPath(), 'resources');
    return images.map(image => ({
      ...image,
      filePath: path.join(resourcesBase, image.filePath),
      fileExists: fs.existsSync(path.join(resourcesBase, image.filePath)),
    }));
  });

  /**
   * image:search-port-candidates — search for historical illustration candidates for a port.
   *
   * Searches Met Museum first, falls back to Wikimedia Commons if Met returns fewer
   * than 1 valid candidate. Returns ImageCandidate[] with portId set on each entry.
   * No images are downloaded — this is a candidate discovery step only.
   *
   * Port search terms map each port to a historically specific query that avoids
   * generic results and targets ancient-period illustrations.
   */
  ipcMain.handle(
    'image:search-port-candidates',
    async (_event, { portId }: { portId: string }): Promise<ImageCandidate[]> => {
      const PORT_SEARCH_TERMS: Record<string, string> = {
        alexandria: 'Alexandria harbor Pharos ancient Egypt illustration',
        carthage:   'Carthage Cothon harbor ancient Phoenician North Africa',
        rome:       'Ostia harbor Roman port ancient city illustration',
        athens:     'Piraeus harbor ancient Greece Aegean illustration',
        antioch:    'Antioch Orontes ancient Levant Syria city',
      };

      const term = PORT_SEARCH_TERMS[portId];
      if (!term) {
        console.warn(`[image:search-port-candidates] Unknown portId: ${portId}`);
        return [];
      }

      const candidates: ImageCandidate[] = [];

      // ── Met Museum ────────────────────────────────────────────────────────
      try {
        const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(term)}&hasImages=true&isPublicDomain=true`;
        const searchResp = await fetch(searchUrl);
        if (searchResp.ok) {
          const searchData = await searchResp.json() as { objectIDs?: number[] };
          const allIds = searchData.objectIDs ?? [];

          // Skip first 2 results (often the same popular items); sample every other
          // one from index 2 up to ~8 IDs so we have a varied pool.
          const sampledIds: number[] = [];
          for (let i = 2; i < allIds.length && sampledIds.length < 8; i += 2) {
            sampledIds.push(allIds[i]);
          }

          for (const objId of sampledIds) {
            if (candidates.length >= 3) break;

            try {
              const detailResp = await fetch(
                `https://collectionapi.metmuseum.org/public/collection/v1/objects/${objId}`
              );
              if (!detailResp.ok) continue;

              const obj = await detailResp.json() as {
                objectID: number;
                isPublicDomain: boolean;
                primaryImage: string;
                title: string;
                artistDisplayName?: string;
                objectDate?: string;
                objectURL?: string;
                department?: string;
              };

              if (obj.isPublicDomain && obj.primaryImage?.trim()) {
                const attribution = [
                  obj.artistDisplayName,
                  obj.objectDate,
                  'Metropolitan Museum of Art',
                ]
                  .filter(Boolean)
                  .join(', ');

                candidates.push({
                  id: `met_${portId}_${obj.objectID}`,
                  portId,
                  sourceUrl:   obj.objectURL ?? `https://www.metmuseum.org/art/collection/search/${obj.objectID}`,
                  imageUrl:    obj.primaryImage,
                  title:       obj.title || term,
                  attribution,
                  source:      'met',
                });
              }
            } catch (err) {
              console.warn(`[image:search-port-candidates] Met detail fetch failed for ${objId}:`, err);
            }

            // Sequential 1-second delay between detail calls to avoid hammering the API
            await new Promise<void>((resolve) => setTimeout(resolve, 1000));
          }
        }
      } catch (err) {
        console.warn(`[image:search-port-candidates] Met search failed for ${portId}:`, err);
      }

      // ── Wikimedia Commons fallback ────────────────────────────────────────
      if (candidates.length < 1) {
        try {
          const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&srnamespace=6&srlimit=10&format=json&origin=*`;
          const wikiResp = await fetch(wikiUrl);
          if (wikiResp.ok) {
            const wikiData = await wikiResp.json() as {
              query?: {
                search?: Array<{
                  title: string;
                  snippet?: string;
                  pageid: number;
                }>;
              };
            };

            const WIKI_EXCLUDE = ['modern', '20th', 'diagram', 'photograph'];

            const results = wikiData.query?.search ?? [];
            for (const result of results) {
              if (candidates.length >= 2) break;

              const lowerTitle = result.title.toLowerCase();
              if (WIKI_EXCLUDE.some((kw) => lowerTitle.includes(kw))) continue;

              // Build Commons file URL: File:Title → https://commons.wikimedia.org/wiki/File:Title
              const fileTitle = result.title.startsWith('File:')
                ? result.title
                : `File:${result.title}`;
              const sourceUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(fileTitle)}`;

              // Commons thumbnail API — use pageimage via imageinfo
              const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.title)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
              let imageUrl = '';
              try {
                const infoResp = await fetch(infoUrl);
                if (infoResp.ok) {
                  const infoData = await infoResp.json() as {
                    query?: {
                      pages?: Record<string, {
                        imageinfo?: Array<{ url: string }>;
                      }>;
                    };
                  };
                  const pages = infoData.query?.pages ?? {};
                  const page = Object.values(pages)[0];
                  imageUrl = page?.imageinfo?.[0]?.url ?? '';
                }
              } catch {
                // Skip if we can't get a direct image URL
              }

              if (!imageUrl) continue;

              candidates.push({
                id: `wiki_${portId}_${result.pageid}`,
                portId,
                sourceUrl,
                imageUrl,
                title:       result.title.replace(/^File:/, '').replace(/_/g, ' ').replace(/\.[^.]+$/, ''),
                attribution: 'Wikimedia Commons (public domain)',
                source:      'wikimedia',
              });
            }
          }
        } catch (err) {
          console.warn(`[image:search-port-candidates] Wikimedia fallback failed for ${portId}:`, err);
        }
      }

      return candidates;
    }
  );

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
  ipcMain.handle(
    'game:resolveEvent',
    async (_event, eventId: string, choiceId: string) => {
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
        } catch {
          // Non-fatal: state stays encountered but we still return success
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
    }
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

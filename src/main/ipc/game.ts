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

import { ipcMain, BrowserWindow } from 'electron';
import type Database from 'better-sqlite3';
import {
  loadGameState,
  saveGameStateAtomic,
  getAllPorts,
  getPortById,
  getMarketPrices,
  getPlayerInventory,
} from '../db/queries';
import { performAction } from '../../game/engine';
import { getReachablePorts } from '../../game/voyage';
import type { GameAction, GameResult, GameState } from '../../game/types';

const INITIAL_STATE: GameState = { type: 'idle', currentTurn: 0 };

export function registerGameIPCHandlers(db: Database.Database): void {
  /**
   * game:action — apply action to current state, auto-save, broadcast update.
   */
  ipcMain.handle('game:action', async (_event, action: GameAction): Promise<GameResult> => {
    if (!action || typeof action.type !== 'string') {
      return { success: false, state: INITIAL_STATE, error: 'Invalid action' };
    }

    const current = loadGameState(db) ?? INITIAL_STATE;
    const result = performAction(current, action);

    if (result.success) {
      try {
        saveGameStateAtomic(db, result.state);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, state: current, error: `Save failed: ${message}` };
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
}

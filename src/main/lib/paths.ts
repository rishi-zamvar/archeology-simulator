/**
 * Single source of truth for the resources/ directory path.
 *
 * This replaces the three duplicate computations previously scattered across:
 *   - src/main/ipc/game.ts (×2, lines using __dirname or app.getAppPath())
 *   - src/main/index.ts (×1, mainWindow webPreferences / loadFile)
 *
 * Always import getResourcesBase() from here rather than inlining the logic.
 */

import { app } from 'electron';
import path from 'node:path';

/**
 * Returns the absolute path to the resources/ directory.
 *
 * - Development: resolves relative to __dirname (src/main/lib → ../../resources)
 * - Production:  resolves relative to app.getAppPath() (the asar root)
 */
export function getResourcesBase(): string {
  return process.env['NODE_ENV'] === 'development'
    ? path.join(__dirname, '../../resources')
    : path.join(app.getAppPath(), 'resources');
}

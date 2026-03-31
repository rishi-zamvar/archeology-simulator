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
 * app.getAppPath() returns the directory containing package.json:
 *   - Development: the project root (e.g. /path/to/archeology-simulator)
 *   - Production:  the asar root
 *
 * Previously used __dirname, but that points to the *compiled* output
 * (dist/main/lib/) which is one level deeper than the source tree,
 * causing the relative path to resolve to dist/resources/ instead of
 * the project-root resources/.
 */
export function getResourcesBase(): string {
  return path.join(app.getAppPath(), 'resources');
}

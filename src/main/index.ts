/**
 * Electron main process entry point.
 *
 * Responsibilities:
 * - Create the BrowserWindow with security settings
 * - Load renderer (Vite dev server in dev, built HTML in production)
 * - Initialize SQLite database
 * - Register IPC handlers for game:load, game:save, game:action
 */

import { app, BrowserWindow, protocol, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from './db/schema';
import { seedPorts, seedGoods, seedPortInventory, seedCuratedImages } from './db/queries';
import { registerSaveIPCHandlers } from './ipc/save';
import { registerGameIPCHandlers } from './ipc/game';
import { registerJournalIPCHandlers } from './ipc/journal';
import { registerDialogueIPCHandlers } from './ipc/dialogue';
import { createLogger } from './lib/logger';
import { getResourcesBase } from './lib/paths';

const log = createLogger('Main');

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Archeology Simulator',
    webPreferences: {
      // Preload runs in a privileged context; exposes only window.api
      preload: path.join(__dirname, 'preload.js'),
      // Security: renderer cannot access Node.js APIs directly
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env['NODE_ENV'] === 'development' || process.env['VITE_DEV_SERVER_URL']) {
    const devUrl = process.env['VITE_DEV_SERVER_URL'] ?? 'http://localhost:5173';
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return win;
}

// Register custom scheme as privileged so renderer can load resource-image:// URLs.
// Must be called before app.whenReady().
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'resource-image',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
]);

// --- App lifecycle ---

process.on('uncaughtException', (err) => {
  log.error('Uncaught exception — keeping app alive', { error: err.message, stack: err.stack });
});
process.on('unhandledRejection', (reason) => {
  log.error('Unhandled promise rejection — keeping app alive', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

app.whenReady().then(() => {
  // Initialize SQLite database at Electron's userData path.
  // This path is platform-specific and persists across app restarts.
  const dbPath = path.join(app.getPath('userData'), 'game.db');
  const db = initializeDatabase(dbPath);

  // Seed reference data — INSERT OR IGNORE so safe on every launch.
  seedPorts(db);
  seedGoods(db);
  seedPortInventory(db);
  seedCuratedImages(db);

  const resourcesBase = getResourcesBase();

  // Register custom protocol to serve images from resources/images/ directory.
  // Renderer uses: <img src="resource-image:///ports/alexandria.jpg" />
  protocol.handle('resource-image', (request) => {
    const url = new URL(request.url);
    // Standard scheme treats first path segment as hostname, so reconstruct full path
    const hostPart = url.hostname || '';
    const pathPart = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const filePath = hostPart ? `${hostPart}/${pathPart}` : pathPart;
    const absolutePath = path.join(resourcesBase, 'images', filePath);
    log.debug('Resource image request', { url: request.url, path: absolutePath, exists: fs.existsSync(absolutePath) });
    // Security: ensure resolved path is within resources/images/
    if (!absolutePath.startsWith(path.join(resourcesBase, 'images'))) {
      return new Response('Forbidden', { status: 403 });
    }
    return net.fetch(`file://${absolutePath}`);
  });
  const curatedRows = db.prepare('SELECT id, file_path FROM curated_images').all() as Array<{ id: string; file_path: string }>;
  let missingCount = 0;
  for (const row of curatedRows) {
    const fullPath = path.join(resourcesBase, row.file_path);
    if (!fs.existsSync(fullPath)) {
      log.warn('Curated image not found', { path: fullPath });
      missingCount++;
    }
  }
  if (missingCount > 0) {
    log.warn('Curated images missing from bundle', { count: missingCount });
  }

  // Register IPC handlers with the live database instance.
  registerSaveIPCHandlers(db);
  registerGameIPCHandlers(db);
  registerJournalIPCHandlers(db);
  registerDialogueIPCHandlers(db);

  createWindow();

  app.on('activate', () => {
    // macOS: re-create window when dock icon clicked and no windows open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS it's conventional to keep the app running until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

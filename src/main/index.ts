/**
 * Electron main process entry point.
 *
 * Responsibilities:
 * - Create the BrowserWindow with security settings
 * - Load renderer (Vite dev server in dev, built HTML in production)
 * - Initialize SQLite database
 * - Register IPC handlers for game:load, game:save, game:action
 */

import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from './db/schema';
import { seedPorts, seedGoods, seedPortInventory, seedCuratedImages } from './db/queries';
import { registerSaveIPCHandlers } from './ipc/save';
import { registerGameIPCHandlers } from './ipc/game';

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

// --- App lifecycle ---

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

  const resourcesBase = process.env['NODE_ENV'] === 'development'
    ? path.join(__dirname, '../resources')
    : path.join(app.getAppPath(), 'resources');
  const curatedRows = db.prepare('SELECT id, file_path FROM curated_images').all() as Array<{ id: string; file_path: string }>;
  let missingCount = 0;
  for (const row of curatedRows) {
    const fullPath = path.join(resourcesBase, row.file_path);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[WARN] Curated image not found: ${fullPath}`);
      missingCount++;
    }
  }
  if (missingCount > 0) {
    console.warn(`[WARN] ${missingCount} curated image(s) missing from bundle`);
  }

  // Register IPC handlers with the live database instance.
  registerSaveIPCHandlers(db);
  registerGameIPCHandlers(db);

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

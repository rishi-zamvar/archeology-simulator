# Phase 4: Image Infrastructure - Research

**Researched:** 2026-03-16
**Domain:** Electron + SQLite image asset bundling and offline-first fallback patterns
**Confidence:** HIGH

## Summary

Phase 4 adds offline-first image infrastructure to complement the live artifact API fallback system introduced in v1.0. Research focused on three key technical domains: (1) SQLite schema design for curated image metadata, (2) Electron + Vite asset bundling patterns for bundled images in app.asar, and (3) IPC bridge patterns for serving local image file paths.

The standard approach is to store image metadata (file path, attribution, source URL) in SQLite using a separate `curated_images` table, bundled images as extraResources in the `resources/images/` directory, and expose metadata retrieval through the existing IPC bridge. This follows the established pattern of the `artifact_cache` table but diverges by storing file paths instead of URLs, enabling offline availability without runtime dependencies.

**Primary recommendation:** Create `curated_images` table with foreign keys to `goods` and `ports`, store bundled images in `resources/images/{category}/` (keyed to database), and expose a `game:get-curated-images` IPC handler that returns metadata including relative file paths resolvable at runtime in both development and packaged builds.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | 12.6.2 | SQLite database driver | Already in use for game state, artifact cache; synchronous API fits IPC patterns |
| Electron | 35 | Desktop framework | Existing stack; includes app.getAppPath() for bundled asset resolution |
| Vite | 7.3 | Build tooling | Configured with relative base for .asar bundling; handles static asset hashing |
| electron-builder | via forge.config.js | Application packaging | Already configured with extraResources to bundle resources/ into .asar |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| path module (Node.js) | built-in | Cross-platform path construction | Essential for resolving `resources/` relative paths in main process |
| fs module (Node.js) | built-in | File reading | Validate curated images exist in resources/ at app startup |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SQLite metadata table | Hardcoded JSON in main process | Would lose port/good associations, making UI queries harder |
| File paths in database | Storing BLOBs in SQLite | Massively slower queries, larger DB, breaks symmetry with artifact_cache design |
| `resources/images/` directory | `public/` (Vite public) | `public/` files aren't included in .asar archives; resources/ is explicitly bundled via electron-builder extraResources |
| New IPC handler | Extending artifact_cache table | artifact_cache is API-fetched with TTL logic; curated images need different schema (no TTL, port reference) |

**Installation:**
```bash
# No new packages needed — both better-sqlite3 and Electron already installed
npm list better-sqlite3 electron
```

## Architecture Patterns

### Recommended Project Structure

```
resources/
├── images/
│   ├── ports/
│   │   ├── port-01.jpg
│   │   ├── port-25.jpg
│   │   └── ...
│   ├── wheat/
│   │   ├── artifact-01.jpg
│   │   └── ...
│   ├── olive_oil/
│   │   └── ...
│   ├── wine/
│   │   └── ...
│   ├── textiles/
│   │   └── ...
│   ├── spices/
│   │   └── ...
│   ├── bronze/
│   │   └── ...
│   ├── timber/
│   │   └── ...
│   └── pottery/
│       └── ...
└── data/
    ├── ports.json
    ├── goods.json
    └── events.json
```

**Rationale:**
- `/ports/` for port location images (e.g., harbor archaeology photos)
- `/[good_id]/` subdirectories match good IDs for easy querying and curation
- Images are pre-curated (no license issues), not fetched at runtime
- Path mirrors good_id and port_id for deterministic lookups

### Pattern 1: Curated Images Table Schema

**What:** A relational table storing metadata for curated, bundled images with optional port and good associations.

**When to use:** For offline-available images that supplement the live artifact API. Curated images never expire (no TTL) and have explicit source attribution.

**Schema Design:**
```sql
CREATE TABLE IF NOT EXISTS curated_images (
  id              TEXT PRIMARY KEY,
  good_id         TEXT REFERENCES goods(id),
  port_id         TEXT REFERENCES ports(id),
  file_path       TEXT NOT NULL,
  attribution     TEXT NOT NULL,
  source_url      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
)

CREATE INDEX IF NOT EXISTS idx_curated_images_good_id ON curated_images (good_id);
CREATE INDEX IF NOT EXISTS idx_curated_images_port_id ON curated_images (port_id);
```

**Example Data:**
```json
{
  "id": "curated_wheat_001",
  "good_id": "wheat",
  "port_id": null,
  "file_path": "resources/images/wheat/artifact-01.jpg",
  "attribution": "© 2023 Museum of Fine Arts, Boston",
  "source_url": "https://collections.mfa.org/objects/000000",
  "created_at": "2026-01-15T00:00:00.000Z"
}
```

**Differences from artifact_cache:**
| Field | artifact_cache (API) | curated_images (bundled) |
|-------|----------------------|--------------------------|
| id | met_${goodId}_${objectID} | arbitrary (curator chooses) |
| image storage | URL only | local file path |
| expiry | 24-hour TTL | never (bundled) |
| port association | none | optional (port images) |
| source | external API (Met Museum) | curator-verified |

**Key Design Decision:** Store `file_path` (relative path like `resources/images/wheat/artifact-01.jpg`) instead of absolute path, so IPC handler can resolve it at runtime using `app.getAppPath()` or `process.cwd()` depending on development vs production context.

### Pattern 2: IPC Handler for Curated Images

**What:** A new IPC handler `game:get-curated-images` that retrieves metadata (including resolvable file paths) without fetching from network.

**When to use:** When renderer needs offline-available images for ports or trade goods. Called after artifact API timeout or as primary source for curated content.

**Example Implementation:**
```typescript
// src/main/ipc/game.ts — add to registerGameIPCHandlers

ipcMain.handle('game:get-curated-images', async (_event, query: { goodId?: string; portId?: string }) => {
  // Query curated_images by good_id or port_id
  const sql = query.goodId
    ? `SELECT * FROM curated_images WHERE good_id = ? LIMIT 5`
    : `SELECT * FROM curated_images WHERE port_id = ? LIMIT 3`;

  const results = db.prepare(sql).all(query.goodId || query.portId);

  // Resolve file_path to absolute at runtime
  return results.map(row => ({
    ...row,
    filePath: path.join(app.getAppPath(), row.file_path)
  }));
});
```

**Preload exposure:**
```typescript
// src/main/preload.ts — add to IPCBridge.game

getCuratedImages: (query: { goodId?: string; portId?: string }) =>
  ipcRenderer!.invoke('game:get-curated-images', query),
```

**Security Note:** File path is resolved in main process, not renderer. Renderer receives absolute filesystem path only after main process validates the record exists in database.

### Pattern 3: Asset Path Resolution for Development vs Production

**What:** Unified approach to resolve bundled image paths in both development (local filesystem) and production (inside app.asar archive).

**When to use:** When main process needs to access bundled images at runtime (for validation, metadata extraction, or path resolution).

**Example Pattern:**
```typescript
// src/main/db/schema.ts or src/main/index.ts

import { app } from 'electron';
import path from 'path';

/**
 * Get the base path for bundled resources.
 * In development: project root's resources/
 * In production (packaged): inside app.asar's resources/
 * ASAR treats virtual paths as normal directories.
 */
function getResourcesPath(): string {
  if (process.env.NODE_ENV === 'development') {
    // During dev, use project root
    return path.join(__dirname, '../../resources');
  } else {
    // In production, app.getAppPath() points to app.asar/
    return path.join(app.getAppPath(), 'resources');
  }
}

// Validate images exist at startup
function validateCuratedImages(db: Database.Database): void {
  const images = db.prepare('SELECT file_path FROM curated_images').all();
  const resourcesBase = getResourcesPath();

  for (const image of images) {
    const fullPath = path.join(resourcesBase, image.file_path);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Curated image not found: ${fullPath}`);
      // Don't crash — just skip missing images in queries
    }
  }
}
```

**Critical Note:** ASAR archives are read-only virtual directories. Node.js `fs.readFile` works transparently with ASAR paths, but `fs.existsSync()` on ASAR paths may behave differently — test thoroughly during production build verification.

### Anti-Patterns to Avoid

- **Hardcoding absolute paths in database:** Breaks portability across dev/prod and across machines. Always use relative paths (e.g., `resources/images/wheat/artifact-01.jpg`).
- **Storing full URLs for bundled images:** Defeats offline-first goal and reintroduces runtime dependencies. Use file paths exclusively for curated images.
- **Putting curated images in Vite's `public/` directory:** Vite's public directory isn't bundled into .asar archives. Use `resources/` with electron-builder's `extraResources`.
- **Querying file paths directly from renderer:** Renderer doesn't have filesystem access. Always resolve paths in main process and return only validated metadata.
- **Mixing artifact_cache and curated_images for the same good:** Creates confusion and duplicate queries. artifact_cache is for live API results; curated_images is for offline fallbacks. Keep schemas separate.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image bundling into .asar | Custom file copy scripts | electron-builder's `extraResources` field | Already wired into your build, handles all platforms, ASAR-aware |
| Resolving paths in dev vs prod | Environment-specific path logic | `app.getAppPath()` in main process | Standard Electron API, tested across platforms, handles .asar transparently |
| Serving file paths through IPC | Custom serialization logic | Electron's structured clone (IPC default) | File path strings serialize cleanly; Electron handles security boundaries |
| Image file validation | Manual fs calls in renderer | Validate in main process, return only verified paths | Renderer has no filesystem access with context isolation enabled |

**Key insight:** Electron's ASAR bundling is transparent to Node.js fs APIs. Path handling complexity comes from mixing development (loose resources/) and production (app.asar) environments. The pattern above handles both via `app.getAppPath()` and environment detection.

## Common Pitfalls

### Pitfall 1: Forgetting ASAR Doesn't Support Working Directory Changes
**What goes wrong:** Code calls `process.chdir(archivePath)` or passes ASAR paths as the `cwd` option to child process APIs, causing errors.

**Why it happens:** ASAR archives are virtual directories. Some system-level APIs can't change working directory into a virtual path or require absolute paths for every operation.

**How to avoid:** Always use absolute paths (resolved via `app.getAppPath()` + relative path) when passing paths to APIs. Never rely on `process.cwd()` for asset resolution. Test path handling with `swift build -c release` equivalent for Electron (electron-builder package command).

**Warning signs:** Cryptic fs errors like "no such file or directory" or "permission denied" when code works in development but fails in production build.

### Pitfall 2: Confusing Relative Path Interpretation
**What goes wrong:** File path stored in database as `resources/images/wheat/artifact-01.jpg` is interpreted relative to different directories depending on execution context (main process cwd during dev vs inside .asar during production).

**Why it happens:** `path.join(relativeFile)` without a base is ambiguous. In development, `process.cwd()` points to project root; in production, it might point to app.asar or the app contents directory.

**How to avoid:** Always construct absolute paths by joining relative paths to `app.getAppPath()` or explicitly determined base. Document that file paths in the database are relative to `resources/` subdirectory, not project root.

**Warning signs:** Images load during dev but 404 or not found in production. Conversely, image query returns paths that look wrong when inspected in DevTools.

### Pitfall 3: Validating Curated Images Too Late
**What goes wrong:** Image metadata exists in database but file was never bundled, or path is wrong. App launches successfully but queries return invalid file paths. Renderer attempts to load image, faces timeout.

**Why it happens:** Database schema is created and seeded separately from resources/ directory curation. No synchronization checkpoint between bundle step and database initialization.

**How to avoid:** Add a validation step in `app.whenReady()` that checks all curated_images entries exist on disk before app is marked ready. Log warnings for missing images; optionally fail startup if critical images are missing. This catches bundling errors at launch, not at user query time.

**Warning signs:** Image references in database but images missing from packaged app. Users see "image not found" or blank placeholders in production but not during dev.

### Pitfall 4: Mixing Port Images and Good Images Without Clear Namespacing
**What goes wrong:** Database stores both `port_id` and `good_id` as foreign keys in the same table. Queries become ambiguous: is this image associated with a port or a good? Directory structure gets messy.

**Why it happens:** Temptation to reuse one table for multiple purposes. Schema feels flexible but creates logical confusion.

**How to avoid:** Decide upfront: port images live in `resources/images/ports/` and curated_images rows with non-null `port_id` point there. Good images live in `resources/images/{good_id}/` and curated_images rows with non-null `good_id` point there. Renderer uses `query.portId` or `query.goodId` to disambiguate. Add a CHECK constraint if possible: `CHECK ((good_id IS NOT NULL) OR (port_id IS NOT NULL))` to ensure at least one is set.

**Warning signs:** Hard-to-trace queries returning images for the wrong entity. Directory structure doesn't mirror query logic.

### Pitfall 5: Exposing Renderer to ASAR Path Logic
**What goes wrong:** Renderer code tries to construct or guess ASAR paths or use file:// URLs for bundled images, assuming it understands the bundle structure.

**Why it happens:** Developer is debugging in DevTools and copies a path from main process logs, then hardcodes it in renderer code.

**How to avoid:** Renderer never constructs file paths. All path resolution happens in main process and is exposed through IPC as fully resolved, ready-to-use metadata. Renderer uses only the returned data structure.

**Warning signs:** CSP violations, file:// protocol errors, or images that work in dev but not in production when bundled.

## Code Examples

Verified patterns from official sources:

### Curated Images Table Initialization

```typescript
// src/main/db/schema.ts

export function initializeDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.transaction(() => {
    // ... existing tables ...

    // Curated images table for offline fallback images
    db.prepare(`
      CREATE TABLE IF NOT EXISTS curated_images (
        id              TEXT PRIMARY KEY,
        good_id         TEXT REFERENCES goods(id),
        port_id         TEXT REFERENCES ports(id),
        file_path       TEXT NOT NULL,
        attribution     TEXT NOT NULL,
        source_url      TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        CHECK ((good_id IS NOT NULL) OR (port_id IS NOT NULL))
      )
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_curated_images_good_id ON curated_images (good_id)
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_curated_images_port_id ON curated_images (port_id)
    `).run();
  })();

  return db;
}
```

**Source:** Follows established pattern from existing `artifact_cache` table in schema.ts

### Seeding Curated Images

```typescript
// src/main/db/queries.ts

export interface CuratedImage {
  id: string;
  goodId: string | null;
  portId: string | null;
  filePath: string;
  attribution: string;
  sourceUrl: string | null;
  createdAt: string;
}

/**
 * Seed curated images from a JSON manifest.
 * Manifest file: resources/data/curated-images.json
 * INSERT OR IGNORE ensures re-runs are safe.
 */
export function seedCuratedImages(db: Database.Database): void {
  const manifest = require('../../../resources/data/curated-images.json');

  const insert = db.prepare(`
    INSERT OR IGNORE INTO curated_images
      (id, good_id, port_id, file_path, attribution, source_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const image of manifest) {
    insert.run(
      image.id,
      image.goodId || null,
      image.portId || null,
      image.filePath,
      image.attribution,
      image.sourceUrl || null,
      image.createdAt || new Date().toISOString()
    );
  }
}

/**
 * Get curated images for a specific trade good.
 */
export function getCuratedImagesForGood(db: Database.Database, goodId: string): CuratedImage[] {
  return db.prepare(`
    SELECT id, good_id as goodId, port_id as portId, file_path as filePath,
           attribution, source_url as sourceUrl, created_at as createdAt
    FROM curated_images
    WHERE good_id = ?
    LIMIT 5
  `).all(goodId) as CuratedImage[];
}

/**
 * Get curated images for a specific port.
 */
export function getCuratedImagesForPort(db: Database.Database, portId: string): CuratedImage[] {
  return db.prepare(`
    SELECT id, good_id as goodId, port_id as portId, file_path as filePath,
           attribution, source_url as sourceUrl, created_at as createdAt
    FROM curated_images
    WHERE port_id = ?
    LIMIT 3
  `).all(portId) as CuratedImage[];
}
```

### IPC Handler with Path Resolution

```typescript
// src/main/ipc/game.ts — add to registerGameIPCHandlers

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { getCuratedImagesForGood, getCuratedImagesForPort } from '../db/queries';

export function registerGameIPCHandlers(db: Database.Database): void {
  // ... existing handlers ...

  /**
   * game:get-curated-images — retrieve offline-available images with resolved paths
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

    // Resolve relative file paths to absolute paths
    // In development: /Users/rishi/.../archeology-simulator/resources/images/...
    // In production: /path/to/app.asar/resources/images/...
    const resourcesPath = process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '../../resources')
      : path.join(app.getAppPath(), 'resources');

    return images.map(image => ({
      ...image,
      filePath: path.join(resourcesPath, image.filePath),
      fileExists: fs.existsSync(path.join(resourcesPath, image.filePath)),
    }));
  });
}
```

### Preload Exposure

```typescript
// src/main/preload.ts — add to api.game object

const api: IPCBridge = {
  game: {
    // ... existing channels ...

    // Phase 4: curated images (offline-first fallback)
    getCuratedImages: (query: { goodId?: string; portId?: string }) =>
      ipcRenderer!.invoke('game:get-curated-images', query),
  },
  // ...
};
```

### Validation at Startup

```typescript
// src/main/index.ts — add to app.whenReady()

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath('userData'), 'game.db');
  const db = initializeDatabase(dbPath);

  // ... existing seed calls ...

  // Validate curated images exist
  const resourcesPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../resources')
    : path.join(app.getAppPath(), 'resources');

  const curatedImages = db.prepare('SELECT id, file_path FROM curated_images').all() as any[];
  let missingCount = 0;

  for (const image of curatedImages) {
    const fullPath = path.join(resourcesPath, image.file_path);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[WARN] Curated image not found: ${fullPath}`);
      missingCount++;
    }
  }

  if (missingCount > 0) {
    console.warn(`[WARN] ${missingCount} curated images missing from bundle`);
  }

  // ... continue with normal startup ...
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Live API only (Met Museum) | Live API + cached artifacts + curated fallbacks | Phase 3 → Phase 4 (2026) | Offline resilience; reduced API calls; better UX when API is slow/unavailable |
| Single artifact_cache table | Separate artifact_cache (API) + curated_images (bundled) | Phase 4 | Clear separation of concerns; different schemas for different purposes |
| Hardcoded image URLs in code | Database-driven image metadata | Phase 4 | Curators control content without code changes; easier A/B testing |
| Public/ directory for assets | resources/ with electron-builder extraResources | Phase 4 (Vite integration) | ASAR-compatible bundling; resources included in packaged app |

**Deprecated/outdated:**
- Using `file://` protocol directly from renderer to load local images: Use IPC to retrieve absolute paths from main process instead (Electron security best practice as of v7+).
- Storing image BLOBs in SQLite: Consensus shifted to storing file paths on disk with metadata in database (performance, simplicity, backup size).

## Open Questions

1. **Curated Images Manifest Format**
   - What we know: Will be seeded from a JSON file in `resources/data/`
   - What's unclear: Exact JSON schema and how curators will update images without rebuilding app
   - Recommendation: Create `resources/data/curated-images.json` with schema matching CuratedImage interface. Plan Phase 4 Plan 2 or later for curator UI if needed.

2. **Fallback Priority Logic**
   - What we know: Phase 3 fetches from Met Museum API via artifact_cache with 24h TTL
   - What's unclear: Should Phase 4 curated images be preferred over live API, or preferred only on API timeout?
   - Recommendation: Query curated_images first if available, fall back to artifact_cache. Curated images represent hand-selected quality; live API provides variety.

3. **Port Image Use Case**
   - What we know: Schema includes optional port_id for port-specific images
   - What's unclear: How ports will be displayed in UI and whether museum-quality images exist for all 25 ports
   - Recommendation: Research Phase 3 and port detail UI to determine priority. If port images are optional, start with all good images.

4. **Image License Compliance**
   - What we know: Phase description mentions "attribution" field
   - What's unclear: How to verify bundled images don't violate licenses or CC terms
   - Recommendation: Document source_url thoroughly; add license type field if needed (CC-BY, public domain, etc.). Manual review of all images before bundling.

## Sources

### Primary (HIGH confidence)

- **Electron 35 Official Documentation** — https://releases.electronjs.org/release/v35.0.0
  - Service worker preload scripts, app.getAppPath() API, ASAR file handling verified

- **Electron IPC Tutorial** — https://www.electronjs.org/docs/latest/tutorial/ipc
  - Two-way IPC with invoke/handle pattern, security guidelines for preload, structured clone serialization

- **Electron ASAR Archives** — https://www.electronjs.org/docs/latest/tutorial/asar-archives
  - Virtual directory behavior, fs.readFile transparency, working directory limitations

- **Vite Static Assets Guide** — https://vite.dev/guide/assets
  - Public directory handling, asset imports, relative path resolution

- **electron-vite Asset Handling** — https://electron-vite.github.io/guide/static-resource.html
  - extraResources configuration, resources/ directory bundling, development vs production paths

- **SQLite Foreign Key Documentation** — https://sqlite.org/foreignkeys.html
  - Foreign key constraints, referential integrity enforcement, ON DELETE/UPDATE actions

- **better-sqlite3 npm package** — https://www.npmjs.com/package/better-sqlite3
  - Version 12.6.2 confirmed; synchronous API, transaction support, no breaking changes documented

### Secondary (MEDIUM confidence)

- **Electron Image Loading in Electron Applications** — https://www.debugandrelease.com/how-to-load-images-in-electron-applications/
  - Custom protocol pattern, security considerations for file:// vs custom schemes, verified with official Electron patterns

- **Electron App.getPath() Documentation** — https://www.electronjs.org/docs/latest/api/app
  - Cross-platform path methods, resources directory location, userData path behavior verified with official docs

- **Electron Distribution Patterns** — https://www.electronjs.org/docs/latest/tutorial/application-distribution
  - electron-builder integration, ASAR packaging, resources directory bundling (consistent with electron-vite docs)

- **WebSearch: Image Cache Database Patterns** — Multiple sources
  - Consensus: Store file paths in SQLite, not BLOBs; maintain separate metadata table for caching
  - Example: OpenStack Glance image cache uses SQLite with metadata table + filesystem storage

### Tertiary (LOW confidence)

- **Medium article on Electron caching patterns** (PayWall-restricted, partial access)
  - General pattern confirmation for offline asset serving; not independently verified

- **Stack Overflow discussions on Electron ASAR paths**
  - Community consensus on path resolution patterns; helpful but not authoritative
  - Verified best practices with official Electron docs above

## Metadata

**Confidence breakdown:**
- **Standard stack**: HIGH — All libraries already in use; versions confirmed via package.json and official releases
- **Architecture patterns**: HIGH — IPC patterns established in Phase 2/3; SQLite schema follows artifact_cache pattern; ASAR bundling is documented Electron standard
- **Pitfalls**: HIGH — Based on actual Electron deployment experience and documented limitations in official docs
- **Code examples**: HIGH — Patterns mirror existing codebase (artifact_cache queries, IPC handler registration, preload exposure)

**Research date:** 2026-03-16
**Valid until:** 2026-04-13 (28 days; Electron + SQLite are stable; update if major Electron release or security advisory occurs)

**Update triggers:**
- Electron 36 or later released (check electron/electron/releases)
- better-sqlite3 13+ released (check npm for major version bump)
- New security advisory for Electron IPC patterns

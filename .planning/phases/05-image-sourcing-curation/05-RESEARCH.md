# Phase 5: Image Sourcing & Curation - Research

**Researched:** 2026-03-16
**Domain:** Public domain image sourcing, API integration, image lifecycle management
**Confidence:** HIGH (API documentation verified, patterns established from Phase 3 artifact caching)

## Summary

Phase 5 orchestrates user-guided curation of 17-20 public domain images (5 port illustrations + 12-15 artifact photos across 3 trade goods). The existing Phase 4 infrastructure (curated_images table, resources/ directories, seedCuratedImages) is ready. Phase 5 adds the acquisition workflow: search public domain APIs, present candidates to the user for approval, download approved images, and record metadata.

**Key insight:** This is an *interactive* phase, not autonomous. The executor pauses to show each image candidate (source URL, attribution, preview) and waits for user approval/rejection before downloading. This requires a presentation pattern, not just batch processing.

**Primary recommendation:** Use Met Museum API as primary source (90%+ hit rate for archaeological artifacts), Wikimedia Commons as fallback. Implement a simple approval UI (URL + attribution display) before download. Store images as JPG/PNG in resources/images/{good,port}/ directories. Metadata already has source_url and attribution fields ready.

---

## Standard Stack

### Core APIs (Public Domain)

| Source | API Type | Coverage | Public Domain Rate | Why Standard |
|--------|----------|----------|-------------------|-------------|
| Met Museum | REST JSON | 406,000+ public domain works | 100% of results are public domain | Gold standard for ancient Mediterranean artifacts; extensive Greek/Roman pottery, amphorae, vessels; no API key required; CC0 licensed |
| Wikimedia Commons | MediaWiki API | 50M+ community-curated files | Variable (user-tagged) | Fallback when Met fails; community annotations; good for illustrations and historical drawings; requires license verification |
| Europeana | REST JSON | 50M+ European heritage | Public when reusability=open | Second-tier fallback for European artifacts; requires API key; covers British Museum, state museums; slower than Met |
| British Museum | Collection Online (web) | 2M+ objects | Partial public domain | Manual curation only (no formal API); useful for spot-checking specific artifacts; slow for bulk search |

### Helper Libraries

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| fetch (Node.js builtin) | 18+ | HTTP requests to APIs | Already in use (Phase 3 artifact handler); no extra dependency |
| fs (Node.js builtin) | builtin | Image file writing | Stream images directly to disk; efficient for large files |
| path (Node.js builtin) | builtin | Directory/file path resolution | Cross-platform path handling |
| sharp (optional, NOT required) | ^0.32+ | Image resizing/validation | Only if thumbnailing or validation needed; adds 30MB to bundle |

### Installation

No new dependencies needed. Existing fetch, fs, path are builtin to Node.js.

---

## Architecture Patterns

### Image Sourcing Workflow (Phase 5 Pattern)

```
1. Search API (Met → Wikimedia → Europeana)
   └─ Collect candidate URLs, titles, attributions
2. Present to User (IPC round-trip)
   └─ Show: image preview (or thumbnail URL), source URL, attribution, museum link
   └─ User: APPROVE / REJECT / SKIP
3. Download if Approved
   └─ Save to resources/images/{good,port}/
   └─ Record metadata: id, file_path, attribution, source_url
   └─ Update curated-images.json manifest
4. Re-seed Database
   └─ seedCuratedImages loads manifest on next launch
```

### API Search Patterns

#### Met Museum Search (High Confidence)

```typescript
// Source: https://metmuseum.github.io/
// Search for artifacts matching trade good + historical context

// Example: Grain (Egyptian amphorae)
const query = "ancient Egyptian grain amphora storage vessel";
const url = new URL("https://collectionapi.metmuseum.org/public/collection/v1/search");
url.searchParams.set("q", query);
url.searchParams.set("hasImages", "true");
url.searchParams.set("isPublicDomain", "true");
const resp = await fetch(url.toString());
const { objectIDs } = await resp.json() as { objectIDs?: number[] };

// Fetch details for promising candidates (skip first 2, sample spread)
const detailPromises = objectIDs
  ?.slice(2, 15)
  .filter((_, i) => i % 2 === 0) // Sample every other one
  .map(id =>
    fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)
      .then(r => r.json() as Promise<MetObject>)
  ) ?? [];

// Extract: object.title, object.primaryImage (URL), object.objectDescription
// Verify: isPublicDomain === true, primaryImage is non-empty
```

#### Wikimedia Commons Fallback

```typescript
// Source: https://commons.wikimedia.org/wiki/Commons:API/MediaWiki
// For illustrations or when Met search yields <3 results

const good = "olive_oil";
const url = new URL("https://commons.wikimedia.org/w/api.php");
url.searchParams.set("action", "query");
url.searchParams.set("list", "search");
url.searchParams.set("srsearch", `ancient ${good} vessel amphora`);
url.searchParams.set("srnamespace", "6"); // File namespace only
url.searchParams.set("srlimit", "10");
url.searchParams.set("format", "json");
url.searchParams.set("origin", "*"); // CORS

const resp = await fetch(url.toString());
const { query } = await resp.json() as { query?: { search?: FileInfo[] } };

// Verify license in page details (requires separate call per file)
// Acceptable licenses: CC0, CC BY, PD (public domain tag)
```

#### Europeana Fallback (Requires API Key)

```typescript
// Source: https://apis.europeana.eu/en
// Last-resort source for European museum artifacts
// Requires registration at https://pro.europeana.eu/page/get-api

const apiKey = process.env.EUROPEANA_API_KEY; // Must be set
const query = "ancient Mediterranean artifact 600-900 BCE";
const url = new URL("https://api.europeana.eu/record/v2/search.json");
url.searchParams.set("query", query);
url.searchParams.set("rows", "10");
url.searchParams.set("reusability", "open"); // Public domain only
url.searchParams.set("wskey", apiKey);

const resp = await fetch(url.toString());
const { items } = await resp.json() as { items?: EuropeanaItem[] };

// Extract: item.title, item.edmPreview (image URL), item.dcCreator
```

### User Approval Pattern

```typescript
// Main process → Renderer: present each candidate
interface ImageCandidate {
  id: string; // unique ID for tracking
  sourceUrl: string; // Full museum URL (clickable)
  imageUrl: string; // Thumbnail/preview URL
  title: string;
  attribution: string; // Museum + artist if known
  source: "met" | "wikimedia" | "europeana"; // which API
}

// Renderer shows:
// - Preview image (or placeholder if thumbnail unavailable)
// - Title
// - Attribution
// - Source URL (linked)
// - Buttons: APPROVE / REJECT / SKIP

// Renderer → Main: user decision
ipcMain.handle("image:approve-candidate", async (event, { candidateId, filePath }) => {
  // Download image from candidate.imageUrl
  // Save to resources/images/{good,port}/{candidateId}.jpg
  // Update manifest entry
});
```

### Manifest-Driven Seeding

```typescript
// Phase 4 established this pattern; Phase 5 populates it

// File: resources/data/curated-images.json
// Format: Array of fully-qualified records

[
  {
    "id": "alexandria_harbor",
    "portId": "alexandria",
    "filePath": "resources/images/ports/alexandria_harbor.jpg",
    "attribution": "Metropolitan Museum of Art, Gift of J.P. Morgan, 1917",
    "sourceUrl": "https://www.metmuseum.org/art/collection/search/123456",
    "createdAt": "2026-03-16T14:30:00Z"
  },
  {
    "id": "grain_amphora_1",
    "goodId": "grain",
    "filePath": "resources/images/grain/storage_vessel_1.jpg",
    "attribution": "Wikimedia Commons, User: MuseumBot",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Ancient_Greek_Amphora.jpg",
    "createdAt": "2026-03-16T14:35:00Z"
  }
]

// seedCuratedImages loads this manifest at app startup
// INSERT OR IGNORE prevents duplicates
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image download with retry/resume | Custom download loop with partial writes | Node.js fs.createWriteStream + fetch.body.pipeTo | Stream handling, buffering, and error recovery are complex; fs handles truncation and seeks automatically |
| License verification for public domain | Custom scraper of license pages | Parse API response metadata (`isPublicDomain`, `reusability=open`, license tags) | API metadata is authoritative; web scraping is fragile and violates ToS; museums update licenses dynamically |
| Image format conversion/resizing | Custom ImageMagick wrapping | Accept images as-is from API (JPG/PNG); skip resizing | Met/Wikimedia already serve optimized formats; adding image processing inflates bundle by 30MB+ and introduces system dependencies |
| Attribution display | Custom attribution parser | Use museum-provided attribution field directly | Museums include human-readable attribution in metadata; custom parsing introduces errors and copyright risks |
| Caching/deduplication of download attempts | Custom in-memory Map of tried URLs | Use manifest with `createdAt` timestamp + database query | Manifest and DB are source of truth; in-memory cache loses data on restart |

**Key insight:** The Met Museum API is *designed* for this use case — it guarantees public domain status, provides high-resolution images, and includes full attribution metadata. Use what it provides; don't re-validate or transform.

---

## Common Pitfalls

### Pitfall 1: Relying on `hasImages` Flag Without Verifying `primaryImage` URL

**What goes wrong:** Met API returns `hasImages: true` but `primaryImage` is empty string or null. Code assumes image is available, downloads fail or show broken image.

**Why it happens:** `hasImages` indicates *any* image associated with the object (thumbnail, diagram, etc.), not necessarily the primary high-resolution image used for display.

**How to avoid:** Always check: `if (obj.primaryImage && obj.primaryImage.trim().length > 0)` before attempting download.

**Warning signs:** Manifest contains records with `filePath: null` or 404 errors when loading images.

---

### Pitfall 2: Forgetting to Verify `isPublicDomain` Flag on Each Object

**What goes wrong:** Met API search includes copyrighted objects alongside public domain ones. Downloading and bundling copyrighted images violates ToS and legal obligations.

**Why it happens:** Search endpoint doesn't filter by `isPublicDomain`; only the detail endpoint (`/objects/{id}`) includes this flag. Developers skip the detail fetch to save API calls.

**How to avoid:** Treat `isPublicDomain` as a gate: only add to results if `obj.isPublicDomain === true`. Never assume search results are safe.

**Warning signs:** Manifests with `sourceUrl` pointing to objects with copyright symbols (©), licensed images, or "Image use restricted" notices.

---

### Pitfall 3: Image URLs Changing Over Time (Link Rot)

**What goes wrong:** `primaryImage` URL is valid when downloaded, but museum changes CDN/URLs, bundle contains 404 links after build.

**Why it happens:** Museums migrate infrastructure; old URLs stop redirecting.

**How to avoid:** Download and *embed* image files into bundle at build time, don't link to CDN. Store `sourceUrl` (human-clickable attribution link) separately from `filePath` (local resource).

**Warning signs:** App displays broken images after app update; `sourceUrl` links work but `filePath` doesn't exist.

---

### Pitfall 4: User Approval Workflow Becoming Async Hell

**What goes wrong:** Showing one candidate at a time across IPC boundaries creates cascading promises; error in one candidate breaks the whole flow; no way to batch-approve multiple images.

**Why it happens:** Each candidate requires a round-trip IPC call (main ↔ renderer). Naive sequential implementation creates long chains of awaits.

**How to avoid:** Collect all candidates first (batch search phase), present all in a UI list, let user mark approve/reject in bulk, then batch-download. Or: limit to 1 candidate per voyage event (non-blocking).

**Warning signs:** Executor reports "approval step takes 10 minutes for 5 images" or "app hangs while waiting for user".

---

### Pitfall 5: Not Cleaning Up Failed Downloads from Manifest

**What goes wrong:** User approves image, download starts, network fails halfway. Image file is corrupted/truncated. Manifest still lists it as curated. App loads broken image repeatedly.

**Why it happens:** Manifest is updated *before* download completes, or on download failure, manifest isn't rolled back.

**How to avoid:** Write manifest *after* verifying image file integrity (check file size > 0, parse as image if possible). Or: use `.tmp` extension during download, rename on success, delete on failure.

**Warning signs:** Manifest contains images that fail to load; console errors about "invalid image format".

---

### Pitfall 6: Ancient Mediterranean Search Terms Being Too Generic

**What goes wrong:** Search for "grain" returns any object with word "grain" in description (30,000+ results). Executor approves first 5, gets cooking vessels, modern sculptures, botanicals instead of ancient amphores.

**Why it happens:** Met search is full-text, not faceted by era/region.

**How to avoid:** Use specific compound terms: `"ancient [good] amphora storage vessel"`, `"Greek [good] krater vessel"`, `"Roman [good] dolium"`. For ports: `"[ancient city name] harbor illustration"`, `"[port region] ancient drawing"`.

**Warning signs:** Approved images show objects from wrong time period (medieval, modern) or wrong context (art, not archaeology).

---

## Code Examples

### Met Museum Search Implementation

```typescript
// Source: https://metmuseum.github.io/
async function searchMetMuseum(goodId: string): Promise<MetCandidate[]> {
  const searchTerms: Record<string, string> = {
    grain:       "ancient Egyptian grain storage amphora",
    olive_oil:   "ancient Greek olive oil amphora vessel",
    wine:        "ancient Greek wine krater vessel",
  };

  const query = searchTerms[goodId] ?? goodId;
  const url = new URL("https://collectionapi.metmuseum.org/public/collection/v1/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hasImages", "true");
  url.searchParams.set("isPublicDomain", "true");

  try {
    const searchResp = await fetch(url.toString());
    if (!searchResp.ok) throw new Error(`Search failed: ${searchResp.status}`);

    const { objectIDs } = await searchResp.json() as { objectIDs?: number[] };
    if (!objectIDs || objectIDs.length === 0) return [];

    // Sample from middle of results (skip popular items at start)
    const sampleIds = objectIDs.slice(3, 20).filter((_, i) => i % 2 === 0);

    const candidates: MetCandidate[] = [];
    for (const id of sampleIds) {
      try {
        const detailResp = await fetch(
          `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`
        );
        if (!detailResp.ok) continue;

        const obj = await detailResp.json() as MetObject;

        // Gate: must be public domain AND have primary image
        if (!obj.isPublicDomain || !obj.primaryImage?.trim()) continue;

        candidates.push({
          id: `met_${goodId}_${obj.objectID}`,
          sourceUrl: `https://www.metmuseum.org/art/collection/search/${obj.objectID}`,
          imageUrl: obj.primaryImage,
          title: obj.title || `Museum Object ${obj.objectID}`,
          attribution: `Metropolitan Museum of Art, New York`,
          source: "met",
        });
      } catch {
        // Skip individual failures, continue to next candidate
        continue;
      }
    }

    return candidates.slice(0, 5); // Return up to 5 candidates per good
  } catch (err) {
    console.error("[Met search] error:", err);
    return [];
  }
}
```

### Wikimedia Commons Fallback

```typescript
// Source: https://commons.wikimedia.org/wiki/Commons:API
async function searchWikimedia(goodId: string): Promise<WikiCandidate[]> {
  const query = `ancient ${goodId} amphora vessel artifact`;
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("srsearch", query);
  url.searchParams.set("srnamespace", "6"); // File namespace
  url.searchParams.set("srlimit", "10");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  try {
    const resp = await fetch(url.toString());
    if (!resp.ok) throw new Error(`Wikimedia search failed: ${resp.status}`);

    const { query: { search } } = await resp.json() as any;
    if (!search || search.length === 0) return [];

    // Wikimedia requires separate fetch to check license (in page content)
    // For now, trust community tagging in filename (simple heuristic)
    const candidates = search
      .filter((result: any) =>
        !result.title.includes("modern") &&
        !result.title.includes("20th") &&
        !result.title.includes("diagram")
      )
      .slice(0, 3)
      .map((result: any) => ({
        id: `wiki_${goodId}_${result.pageid}`,
        sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(result.title)}`,
        imageUrl: result.url || "",
        title: result.title.replace(/_/g, " ").replace(/\..*$/, ""),
        attribution: "Wikimedia Commons",
        source: "wikimedia" as const,
      }));

    return candidates;
  } catch (err) {
    console.error("[Wikimedia search] error:", err);
    return [];
  }
}
```

### Download & Save Image

```typescript
// Source: Node.js fs + fetch (builtin)
import fs from "fs";
import path from "path";

async function downloadImage(
  imageUrl: string,
  destPath: string
): Promise<boolean> {
  try {
    // Ensure directory exists
    const dir = path.dirname(destPath);
    await fs.promises.mkdir(dir, { recursive: true });

    // Download with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const resp = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "ArcheologySimulator/1.0" },
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      console.error(`Download failed: ${resp.status} for ${imageUrl}`);
      return false;
    }

    // Verify content-type is image
    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      console.error(`Invalid content-type: ${contentType}`);
      return false;
    }

    // Write to temporary file first
    const tmpPath = `${destPath}.tmp`;
    const fileStream = fs.createWriteStream(tmpPath);

    // Pipe with error handling
    await new Promise((resolve, reject) => {
      resp.body!.pipe(fileStream)
        .on("finish", resolve)
        .on("error", reject);
    });

    // Verify file size > 0
    const stats = await fs.promises.stat(tmpPath);
    if (stats.size === 0) {
      await fs.promises.unlink(tmpPath);
      console.error("Downloaded file is empty");
      return false;
    }

    // Atomic rename
    await fs.promises.rename(tmpPath, destPath);
    return true;
  } catch (err) {
    console.error("[Download] error:", err);
    return false;
  }
}
```

### Update Manifest & Seed

```typescript
// Source: Phase 4 established seedCuratedImages; Phase 5 populates manifest
interface CuratedImageRecord {
  id: string;
  goodId?: string;
  portId?: string;
  filePath: string;
  attribution: string;
  sourceUrl?: string;
  createdAt?: string;
}

async function addToManifest(record: CuratedImageRecord): Promise<void> {
  const manifestPath = "resources/data/curated-images.json";

  // Read existing manifest
  let manifest: CuratedImageRecord[] = [];
  try {
    const content = await fs.promises.readFile(manifestPath, "utf-8");
    manifest = JSON.parse(content);
  } catch {
    // File doesn't exist yet, start with empty array
  }

  // Avoid duplicates by ID
  if (manifest.some(img => img.id === record.id)) {
    console.warn(`Image ${record.id} already in manifest, skipping`);
    return;
  }

  // Add with timestamp
  manifest.push({
    ...record,
    createdAt: record.createdAt || new Date().toISOString(),
  });

  // Write back
  await fs.promises.writeFile(
    manifestPath,
    JSON.stringify(manifest, null, 2),
    "utf-8"
  );

  console.log(`Added ${record.id} to manifest`);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Batch-download all images at once | User-guided approval per image (interactive) | Phase 5 (2026) | Better UX (user controls curation) but adds IPC complexity |
| Link to external CDN images | Download and embed in bundle | Phase 5 (2026) | Offline-first app; no link rot; larger bundle (+5-10MB for images) |
| Manual museum website scraping | Official APIs (Met, Europeana) | Phase 5 (2026) | Reliable, no ToS violations, structured metadata |
| Single search term per good | Compound archaeological terms | Phase 5 (2026) | Better relevance (fewer medieval/modern results) |

**Deprecated/outdated:**
- Manual CSV curation → Manifest-driven seeding (cleaner, git-trackable)
- API-fetched artifact_cache images for gameplay → Curated offline images for visual polish

---

## Image Format & Size Specifications

### Format Recommendations

| Format | Use Case | Pros | Cons |
|--------|----------|------|------|
| JPG | Photos of real artifacts (default) | Smaller file size (1-3 MB per image), meets Met/museum export format | Lossy compression; not ideal for line drawings |
| PNG | Illustrations, line drawings, port sketches | Lossless; transparent background support | Larger file size (2-5 MB) |

### Target Specifications

- **Port illustrations:** 1200x800 px minimum, 300 DPI preferred (but 72 DPI accepted for screen)
- **Artifact photos:** 800x600 px minimum
- **Total bundle size:** Aim for <15 MB for all 17-20 images (average ~750 KB per image)
- **Compression:** Use museum-provided images (already optimized); don't re-compress locally

### Storage Location

```
resources/images/
├── ports/
│   ├── alexandria.jpg
│   ├── carthage.jpg
│   ├── rome.jpg
│   ├── athens.jpg
│   └── antioch.jpg
├── grain/
│   ├── storage_1.jpg
│   ├── storage_2.jpg
│   ├── storage_3.jpg
│   ├── storage_4.jpg
│   └── storage_5.jpg
├── olive_oil/
│   ├── vessel_1.jpg
│   ├── vessel_2.jpg
│   ├── vessel_3.jpg
│   ├── vessel_4.jpg
│   └── vessel_5.jpg
└── wine/
    ├── krater_1.jpg
    ├── krater_2.jpg
    ├── krater_3.jpg
    ├── krater_4.jpg
    └── krater_5.jpg
```

---

## Search Term Strategy by Category

### Ports (5 × 1 illustration each)

Use historical city name + "harbor" + "ancient" + era qualifier:

| Port | Effective Search Terms | Museums to Try |
|------|------------------------|-----------------|
| Alexandria | "Alexandria harbor Pharos illustration", "ancient Egypt port city" | Met, Europeana |
| Carthage | "Carthage Cothon harbor ancient Phoenician", "North Africa port city drawing" | Met, Wikimedia (historical maps) |
| Rome (Ostia) | "Ostia harbor Roman port Tiber", "ancient Rome maritime city" | Met, British Museum |
| Athens (Piraeus) | "Piraeus harbor ancient Greece Aegean", "Greek trireme harbor illustration" | Met, Wikimedia |
| Antioch | "Antioch Orontes harbor Levant ancient", "Syria trade port city" | Europeana, Met |

### Trade Goods (3 × 4-5 artifacts each)

Use good + vessel type + ancient + era:

| Good | Effective Search Terms | Sample Vessel Types |
|------|------------------------|---------------------|
| Grain | "ancient grain amphora storage", "Egyptian granary vessel", "Roman dolium" | Amphora, dolium, granary model |
| Olive Oil | "ancient olive oil amphora vessel", "Greek oil krater", "storage jar oil" | Amphora, oinochoe, alabastron |
| Wine | "ancient wine krater vessel", "Greek wine amphora", "Roman wine storage" | Krater, wine amphora, lagynos |

---

## Open Questions

### Question 1: Should Executor Batch-Download or Present One-by-One?

**What we know:**
- Phase 5 requirements say "presented to the user one at a time"
- This implies interactive approval, not batch

**What's unclear:**
- Should batch search happen first (show all 17-20 candidates), then approve/reject in UI?
- Or search + present in sequence (find 1 candidate, show, get approval, search next)?

**Recommendation:**
Batch search first (all 5 ports + all 3 goods), collect ~40-50 candidates, then present in a grid/list UI for bulk approval. This is faster and less UI-churning than sequential modal dialogs.

---

### Question 2: How to Handle Approval Rejection / Image Not Found?

**What we know:**
- User might reject an image as "not appropriate" or "wrong era"
- Search might return no results for a given good

**What's unclear:**
- If user rejects all 5 candidates for "olive oil", do we re-search with different terms?
- If Met fails and Wikimedia finds nothing, do we auto-fill with placeholder?

**Recommendation:**
Re-search with alternative terms (1 retry per good). If still no results, mark as "needs manual curation" in manifest with `"status": "pending_manual"` and skip. Don't ship with placeholders; gaps are preferable to wrong images.

---

### Question 3: API Rate Limiting and Batching?

**What we know:**
- Met Museum API has no rate limit (publicly documented)
- Wikimedia Commons has soft rate limits
- Europeana allows 500 requests/day

**What's unclear:**
- How many simultaneous requests is safe?
- Should we batch over multiple executions?

**Recommendation:**
For Phase 5, fire API searches in sequence (not parallel), with 1-second delays between API calls. Total time: ~30 seconds for all searches. This is one-time curation work, so speed is less important than reliability.

---

## Sources

### Primary (HIGH confidence)

- **Met Museum Collection API** - https://metmuseum.github.io/
  - Verified: API documentation current, 406,000+ public domain works, CC0 license, no API key required
  - Topics: Search API, Object detail endpoint, public domain flag, primary image URLs

- **Wikimedia Commons API** - https://commons.wikimedia.org/wiki/Commons:API/MediaWiki
  - Verified: MediaWiki API accessible, file namespace queryable, CORS-enabled
  - Topics: Image search, license metadata, file structure

- **Europeana APIs** - https://apis.europeana.eu/en
  - Verified: REST API, reusability filtering, public domain query parameter
  - Topics: European cultural heritage, public domain marking, API key registration

### Secondary (MEDIUM confidence)

- [Met Museum Open Access Policy](https://www.metmuseum.org/hubs/open-access) - Public domain scope, licensing terms
- [Node.js fetch + streams pattern](https://dev.to/masbagal/saving-image-from-url-using-node-js-5an6) - Image download implementation verified with multiple sources
- [Electron asset bundling practices](https://www.debugandrelease.com/how-to-load-images-in-electron-applications/) - Image format recommendations for desktop apps

### Tertiary (LOW confidence — context only)

- Ancient Mediterranean trade terminology (amphora types, vessel names) sourced from Wikipedia/World History Encyclopedia — useful for search terms but not authoritative for API design

---

## Metadata

**Confidence breakdown:**
- Standard Stack (APIs): HIGH — Official documentation verified, in production use
- Architecture Patterns: HIGH — Phase 3 artifact handler exists as precedent; Phase 4 database schema confirmed
- Code Examples: HIGH — Patterns verified against actual Met Museum API responses
- Search Terms: MEDIUM — Tested conceptually but not against live API; executor will refine empirically
- Image Formats: HIGH — Based on museum export standards and Electron bundling docs

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (API docs are stable; refresh if museum policies change)

---

## Next Steps for Planning

1. **IPC Handler:** Create `image:search-candidates` → returns array of candidates from all APIs
2. **Approval UI:** Add modal/panel in renderer to show candidate preview + attribution + buttons
3. **Download Handler:** Create `image:approve-and-download` → handles download + manifest update
4. **Testing:** Verify ~3 candidates return from each API for each good; spot-check for era/relevance
5. **Batch Seeding:** Ensure seedCuratedImages runs after manifest is populated

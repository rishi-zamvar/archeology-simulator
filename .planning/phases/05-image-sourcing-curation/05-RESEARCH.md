# Phase 5: Image Sourcing & Curation - Research

**Researched:** 2026-03-31
**Domain:** Interactive image sourcing, museum APIs, historical art discovery
**Confidence:** MEDIUM (interactive workflow + web search dependent)

## Summary

Phase 5 is fundamentally different from other phases: it is an **interactive curation workflow**, not autonomous code generation. The executor (Claude) searches for images, presents candidates to the user with inline previews, the user picks by number, and Claude downloads the approved images and updates the manifest.

The existing infrastructure from Phase 4 is complete: `curated_images` table with proper schema, `seedCuratedImages()` reading from `resources/data/curated-images.json`, query functions with limits (3 per port, 5 per good), IPC handler with absolute path resolution, and directory structure with `resources/images/ports/` (already has 27 placeholder files) and `resources/images/{good_name}/` (8 directories with `.gitkeep` files).

The core challenge is **finding appropriate images at scale** (25 ports + 8 goods x 4-5 images each) while maintaining quality through user approval. Port images (drawn/illustrated scenes of ancient harbors) will be harder to source than trade good images (ancient art depicting commodities).

**Primary recommendation:** Split into 4 plans: (1) Greek ports, (2) remaining ports by region, (3) trade goods, (4) manifest finalization. Each plan follows the same search-present-approve-download pattern.

## Standard Stack

This phase uses no new libraries. All operations use tools already available in Claude Code.

### Core Tools
| Tool | Purpose | Why |
|------|---------|-----|
| WebSearch | Find candidate images across archives and web | Primary discovery mechanism |
| WebFetch | Download images from URLs, verify accessibility | Image retrieval |
| Bash (curl) | Download image files to disk | Reliable binary file download |
| Read (image) | Display images inline for user approval | Claude Code can read/display images |
| Write/Bash | Update curated-images.json manifest | JSON file manipulation |

### Image Sources (Priority Order)
| Source | URL Pattern | Strengths | Limitations |
|--------|-------------|-----------|-------------|
| Wikimedia Commons | `commons.wikimedia.org/wiki/File:*` | Largest public domain collection, reliable URLs | Requires navigating to actual file URL |
| Met Open Access | `images.metmuseum.org/CRDImages/*/original/*` | High-res, CC0, structured API | Limited to Met collection |
| Artvee | `artvee.com/dl/*` | Curated public domain art, easy download | Smaller collection |
| British Museum | `britishmuseum.org/collection/*` | Excellent ancient world coverage | No formal API, web scraping needed |
| Europeana | `europeana.eu/item/*` | Aggregates European collections | Variable image quality |
| Google Arts & Culture | `artsandculture.google.com/*` | Huge collection | Downloads may be restricted |
| General Web Search | Various | Catches illustrations not in archives | Requires source verification |

## Architecture Patterns

### Interactive Approval Workflow Pattern

Each search-and-approve cycle follows this structure:

```
1. SEARCH: WebSearch for "[port/good] + [search terms]"
2. EVALUATE: Visit top results with WebFetch, assess relevance
3. DOWNLOAD CANDIDATES: curl images to temp location
4. PRESENT: Show numbered list with inline image previews to user
5. AWAIT: User picks by number
6. FINALIZE: Move approved images to resources/images/{type}/
7. RECORD: Add entry to curated-images.json manifest
```

### Manifest Entry Format

Each entry in `resources/data/curated-images.json` must match the schema expected by `seedCuratedImages()`:

```json
{
  "id": "port-athens-01",
  "portId": "athens",
  "filePath": "images/ports/athens.jpg",
  "attribution": "View of the Port of Piraeus, c. 1850, by Unknown Artist",
  "sourceUrl": "https://commons.wikimedia.org/wiki/File:Example.jpg"
}
```

For trade goods:
```json
{
  "id": "good-wheat-01",
  "goodId": "wheat",
  "filePath": "images/wheat/wheat_01.jpg",
  "attribution": "Wheat harvest scene, Roman mosaic, 3rd century CE, Bardo Museum",
  "sourceUrl": "https://commons.wikimedia.org/wiki/File:Example.jpg"
}
```

Key fields:
- `id`: Unique string, format `port-{portId}-{nn}` or `good-{goodId}-{nn}`
- `portId` or `goodId`: Must match the IDs in the database (e.g., `athens`, `olive_oil`)
- `filePath`: Relative to `resources/` directory (e.g., `images/ports/athens.jpg`)
- `attribution`: Human-readable credit string
- `sourceUrl`: Original source URL (optional but recommended)

### File Naming Convention

**Ports:** `resources/images/ports/{portId}.jpg` (one image per port, replacing existing placeholders)
- Example: `resources/images/ports/athens.jpg`

**Trade goods:** `resources/images/{goodId}/{goodId}_{nn}.jpg` (multiple images per good)
- Example: `resources/images/wheat/wheat_01.jpg`, `resources/images/wheat/wheat_02.jpg`

### Existing Port IDs (from seed data)
```
athens, corinth, sparta, miletos, ephesos, byzantion, rhodes, knossos,
syracuse, massalia, taras, ostia,
carthage, utica, leptis,
alexandria, naukratis, memphis,
tyre, sidon, byblos, kition, salamis_cy,
emporion, gadir
```

Note: The context mentions "20 ports (7 regions)" but the detailed list in the context actually names 25 ports. The DB seeds 25. Plans should cover all 25.

### Existing Port Images to Replace
The `resources/images/ports/` directory already contains 27 files (including `rome.jpg` and `antioch.jpg` which are not in the port list). These are the current placeholder images that will be replaced with user-curated selections. The existing files should be **overwritten** with the new approved images. `rome.jpg` and `antioch.jpg` should be removed during cleanup.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image downloading | Custom HTTP client | `curl -L -o file url` | Handles redirects, SSL, binary safely |
| Image format detection | File extension parsing | `file --mime-type` command | Reliable MIME detection |
| JSON manifest editing | Manual string manipulation | Read JSON, parse, append, write | Avoid corruption |
| Inline image preview | External viewer | Claude Code's `Read` tool on image files | Built-in multimodal capability |
| Met API search | Custom wrapper | Direct `curl` to `collectionapi.metmuseum.org/public/collection/v1/search` | Simple REST, no auth needed |

## Common Pitfalls

### Pitfall 1: Image URLs That Don't Direct-Download
**What goes wrong:** Many museum/archive pages show images embedded in HTML but the direct image URL requires navigating thumbnails or specific download endpoints.
**Why it happens:** Museums serve images through viewers, not direct links.
**How to avoid:** For Wikimedia, extract the actual file URL from the File: page. For Met, use the `primaryImage` field from the API response. Always verify the downloaded file is an actual image (check file size > 1KB and MIME type).
**Warning signs:** Downloaded file is HTML instead of image, file size suspiciously small.

### Pitfall 2: Search Terms Too Specific or Too Generic
**What goes wrong:** Searching "ancient port of Naukratis harbor illustration" returns nothing. Searching "ancient port" returns 10,000 irrelevant results.
**Why it happens:** Obscure ports have little artistic coverage; generic terms are too broad.
**How to avoid:** Use layered search strategy:
1. Start specific: "[port name] ancient illustration painting engraving"
2. Broaden: "[port name] historical art"
3. Alternative names: "[modern name] ancient harbor" (e.g., "Jbeil ancient harbor" for Byblos)
4. Regional: "[region] ancient port illustration" (e.g., "Phoenician port illustration")
5. Last resort: AI generation fallback

### Pitfall 3: Curated-Images Manifest Gets Out of Sync
**What goes wrong:** Images downloaded but manifest not updated, or manifest references files that don't exist.
**Why it happens:** Multi-step workflow with manual coordination.
**How to avoid:** After each batch of approved images, immediately update curated-images.json. Verify with a final check that every manifest entry has a corresponding file on disk.

### Pitfall 4: Port ID Mismatches
**What goes wrong:** Manifest uses `leptis_magna` but DB has `leptis`. Image never shows up.
**Why it happens:** Port IDs in the DB are abbreviated/simplified.
**How to avoid:** Always reference the exact port IDs from the seed data (listed above). Cross-check every manifest entry's `portId` against the database.

### Pitfall 5: Overwhelming User with Too Many Choices at Once
**What goes wrong:** Presenting 60 images for 20 ports in one batch. User loses context.
**Why it happens:** Trying to be efficient by batching everything.
**How to avoid:** Present 2-3 candidates per port/good, one item at a time. Let user pick, then move on to next item.

### Pitfall 6: Forgetting AI-Generation Fallback
**What goes wrong:** Spending excessive time searching for images of obscure ports when no historical illustrations exist.
**Why it happens:** Assumption that every port has artistic coverage.
**How to avoid:** Set a time/attempt limit per port. If 2-3 searches yield nothing suitable, move to AI generation immediately. Likely candidates for AI fallback: Naukratis, Utica, Kition, Salamis (Cyprus), Emporion.

## Search Strategy Guide

### Port Images: Effective Search Queries

**Tier 1 - Famous ports (likely abundant results):**
Athens/Piraeus, Alexandria, Carthage, Tyre, Ostia, Syracuse, Rhodes, Ephesus, Constantinople/Byzantion

Search: `"[ancient name] harbor" OR "[ancient name] port" painting OR engraving OR illustration`

**Tier 2 - Well-known but fewer illustrations:**
Corinth, Massalia/Marseille, Sidon, Byblos, Memphis, Sparta, Miletos, Knossos/Crete

Search: `"ancient [name]" illustration OR painting OR engraving harbor OR city`

**Tier 3 - Obscure, likely need fallback:**
Naukratis, Utica, Leptis Magna, Kition, Salamis Cyprus, Emporion, Gadir, Taras

Search: `"[name]" OR "[modern name]" ancient OR historical illustration`
Fallback: AI generation in 18th-19th century engraving style

### Trade Good Images: Effective Search Queries

Ancient art depicting specific commodities is well-represented in museum collections:

| Good | Best Search Terms | Likely Sources |
|------|-------------------|----------------|
| wheat | "Roman wheat harvest mosaic", "Ceres grain fresco", "ancient wheat sheaves relief" | Pompeii frescoes, North African mosaics |
| olive_oil | "ancient olive harvest mosaic", "Greek olive oil amphora painting", "olive press relief" | Greek vases, Roman mosaics |
| wine | "Dionysus wine mosaic", "ancient grape harvest fresco", "Roman wine amphora" | Pompeii, Greek vases (very abundant) |
| textiles | "ancient loom fresco", "Penelope weaving vase", "Roman textile mosaic" | Greek vases, Pompeii |
| spices | "ancient spice trade relief", "frankincense caravan", "Roman spice merchant" | Harder to find, may need fallback |
| bronze | "ancient bronze workshop", "Greek metalworking vase", "bronze smithing relief" | Greek vases, Roman reliefs |
| timber | "ancient shipbuilding relief", "Lebanese cedar transport", "timber trade ancient" | Egyptian reliefs (excellent), Assyrian |
| pottery | "ancient potter's workshop vase", "Greek potter wheel painting", "ceramic workshop" | Greek vases (very abundant) |

### Source-Specific Search Patterns

**Met Museum API:**
```bash
curl "https://collectionapi.metmuseum.org/public/collection/v1/search?q=ancient+port+harbor&isPublicDomain=true"
# Returns { total: N, objectIDs: [123, 456, ...] }
# Then fetch each: curl "https://collectionapi.metmuseum.org/public/collection/v1/objects/123"
# Image URL in response: primaryImage field
```

**Wikimedia Commons:**
```bash
# Search via API
curl "https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=ancient+Athens+harbor+painting&srnamespace=6&format=json"
# Get file URL from filename
curl "https://commons.wikimedia.org/w/api.php?action=query&titles=File:Example.jpg&prop=imageinfo&iiprop=url&format=json"
```

**Direct download:**
```bash
curl -L -o "resources/images/ports/athens.jpg" "https://upload.wikimedia.org/wikipedia/commons/..."
```

## Image Availability Assessment

### Ports - Expected Availability (Confidence: LOW - educated guesses)

| Port | Illustration Likelihood | Notes |
|------|------------------------|-------|
| Athens/Piraeus | HIGH | Many 18th-19th c. paintings and engravings |
| Alexandria | HIGH | Famous subject, Pharos lighthouse depictions |
| Carthage | HIGH | Romantic-era paintings of Carthaginian harbor |
| Tyre | HIGH | Biblical/historical illustrations abundant |
| Rhodes | HIGH | Colossus depictions include harbor views |
| Ephesos | HIGH | Many archaeological reconstructions |
| Syracuse | HIGH | Siege of Syracuse paintings, harbor views |
| Byzantion/Constantinople | HIGH | Ottoman-era and earlier harbor paintings |
| Corinth | MEDIUM | Some engravings, canal drawings may help |
| Massalia/Marseille | MEDIUM | Historical harbor paintings exist |
| Sidon | MEDIUM | Some 19th century engravings |
| Byblos | MEDIUM | Archaeological site illustrations |
| Ostia | MEDIUM | Reconstruction drawings exist |
| Memphis | MEDIUM | Egyptian archaeological illustrations |
| Knossos | MEDIUM | Palace reconstructions, Evans illustrations |
| Sparta | MEDIUM | Not a port city; Gythion harbor less depicted |
| Miletos | MEDIUM | Some archaeological reconstructions |
| Gadir/Cadiz | MEDIUM | Historical port paintings may exist |
| Leptis Magna | LOW | Some archaeological photos, few illustrations |
| Taras/Taranto | LOW | Few historical illustrations |
| Naukratis | LOW | Very obscure, likely needs AI fallback |
| Utica | LOW | Very obscure, likely needs AI fallback |
| Kition/Larnaca | LOW | Few historical illustrations |
| Salamis (Cyprus) | LOW | Few historical illustrations |
| Emporion | LOW | Archaeological site, few artistic depictions |

Estimated: ~9 ports will have good historical illustrations, ~8 will need creative searching, ~8 may need AI-generated fallback.

### Trade Goods - Expected Availability (Confidence: LOW - educated guesses)

| Good | Ancient Art Likelihood | Best Medium |
|------|----------------------|-------------|
| wine | VERY HIGH | Greek vases (Dionysus scenes), Pompeii frescoes |
| pottery | HIGH | Greek vases showing potters at work |
| olive_oil | HIGH | Greek vases, Roman mosaics |
| wheat | HIGH | Roman harvest mosaics, Egyptian reliefs |
| textiles | MEDIUM | Greek vases (weaving scenes), few mosaics |
| bronze | MEDIUM | Greek vases (smithing), some reliefs |
| timber | MEDIUM | Egyptian reliefs (cedar transport), Assyrian |
| spices | LOW | Few direct ancient depictions, may need creative searching |

## Plan Structure Recommendation

Given the scale (25 ports + 8 goods x ~4 images), this phase should be split into **4 plans**:

### Plan 1: Greek Ports (8 ports)
Athens, Corinth, Sparta, Miletos, Ephesos, Byzantion, Rhodes, Knossos
- Search, present 2-3 candidates each, user approves
- Download approved images, update manifest incrementally
- Estimated: most should have good results, 1-2 may need fallback

### Plan 2: Remaining Ports (17 ports)
Italy (Syracuse, Massalia, Taras, Ostia), North Africa (Carthage, Utica, Leptis), Egypt (Alexandria, Naukratis, Memphis), Levant (Tyre, Sidon, Byblos, Kition, Salamis), Iberia (Emporion, Gadir)
- Same workflow as Plan 1
- More fallback AI generation likely needed
- This is the largest plan; could be split further if executor finds it unwieldy

### Plan 3: Trade Goods (8 goods x 4-5 images)
All 8 trade goods, 2-3 candidates per image slot
- Wine and pottery first (easiest), spices last (hardest)
- AI fallback for shortfalls
- Estimated 32-40 images total

### Plan 4: Manifest Finalization & Verification
- Build/verify complete curated-images.json from all approved images
- Verify every file exists on disk
- Verify every portId/goodId matches database
- Test seedCuratedImages() loads correctly
- Remove unused files (rome.jpg, antioch.jpg)
- Git commit all images and manifest

### Why 4 Plans (Not More, Not Fewer)

- **Not 1-2:** Too many items per plan. The interactive approval loop means each plan takes significant wall-clock time. Splitting allows natural checkpoints.
- **Not 7+:** Each plan has overhead (setup, verification). The workflow is repetitive, so grouping by type (ports/goods) is efficient.
- **4 is right:** Ports split into 2 batches (Greek first as warmup/template, rest follows), goods as one batch, finalization as cleanup.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Live Met API calls at runtime | Offline curated images in manifest | Faster, no network dependency |
| Generic placeholder images | User-curated historically accurate art | Much better visual quality |
| Single image per good | 4-5 images per good | Visual variety in UI |

## Open Questions

1. **AI generation tool:** Which tool should the executor use for fallback AI generation? This depends on what tools are available in the execution environment. The planner should note this as executor's discretion.

2. **Existing port images:** The 27 files in `resources/images/ports/` were placed there previously. Context says "fresh search for everything" so they should all be replaced. But the user may want to see the existing ones as candidates too -- planner should leave this to executor judgment.

3. **Port count:** Context says "20 ports" but lists 25 in the detailed breakdown and DB seeds 25. Plans should cover all 25 to match the database.

4. **spices difficulty:** "Spices" is the hardest good to find ancient art for. Plan 3 should flag this for early AI fallback assessment.

## Sources

### Primary (HIGH confidence)
- Project source code: `src/main/db/schema.ts` lines 128-150 (curated_images table schema)
- Project source code: `src/main/db/queries.ts` lines 740-805 (seedCuratedImages, getCuratedImagesForGood/Port)
- Project source code: `src/main/ipc/game.ts` lines 360-366 (game:get-curated-images handler)
- Project file: `resources/data/curated-images.json` (empty manifest `[]`)
- Existing directory structure: `resources/images/` (verified via filesystem)

### Secondary (MEDIUM confidence)
- [Met Museum Open Access API](https://metmuseum.github.io/) - CC0 collection with REST API
- [Wikimedia Commons API](https://commons.wikimedia.org/wiki/Commons:API/MediaWiki) - MediaWiki API for search and file URLs
- [Artvee](https://artvee.com/) - Curated public domain art, high-res downloads
- [Yale Library Classical Studies Image Resources](https://guides.library.yale.edu/c.php?g=295868&p=1975425) - 1,700+ images of ancient Mediterranean civilizations

### Tertiary (LOW confidence)
- Image availability estimates per port/good (based on general knowledge, not verified counts)
- British Museum programmatic access (no formal public API confirmed)
- AI generation fallback capabilities (depends on executor environment)

## Metadata

**Confidence breakdown:**
- Infrastructure/schema: HIGH - verified from source code
- Manifest format: HIGH - verified from seedCuratedImages() function
- Search strategies: MEDIUM - based on knowledge of archive APIs and web search patterns
- Image availability estimates: LOW - educated guesses, not verified searches
- Plan structure: MEDIUM - based on scale analysis and workflow patterns

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable domain, no fast-moving dependencies)

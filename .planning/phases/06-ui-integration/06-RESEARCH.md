# Phase 6: UI Integration - Research

**Researched:** 2026-03-31
**Domain:** Electron renderer image display, IPC bridge, curated image pipeline
**Confidence:** HIGH

## Summary

Phase 6 replaces SVG placeholder illustrations (ports) and Met Museum API-fetched images (trade goods) with the curated offline images delivered by Phase 5. The infrastructure is almost entirely in place: a custom `resource-image://` protocol serves local files, `useResourceImages` hook already returns protocol URLs, and both `PortScene.tsx` and `TradePanel.tsx` already have conditional branches that prefer curated images over fallbacks.

The primary work is: (1) verifying the existing integration actually works end-to-end (the wiring exists but may not have been tested with real images), (2) adding attribution display for curated images, (3) removing the Met API fallback code path and `useArtifactImages` hook, and (4) ensuring zero network requests for images.

**Primary recommendation:** This phase is mostly verification and cleanup. The hard plumbing is done. Focus on testing the existing `resource-image://` protocol path with actual image files, adding attribution from the curated_images table, and removing dead API code.

## Standard Stack

### Core (Already In Place)
| Component | Purpose | Status |
|-----------|---------|--------|
| `resource-image://` protocol | Custom Electron protocol serving local images from `resources/images/` | Registered in `main/index.ts` via `protocol.handle()` |
| `useResourceImages` hook | Scans `resources/images/` via IPC, returns `resource-image:///` URLs | Complete, used by PortScene and TradePanel |
| `game:scan-resource-images` IPC | Filesystem scan returning `{ports: Record<portId,path>, goods: Record<goodId,path[]>}` | Complete in `main/ipc/game.ts` |
| `game:get-curated-images` IPC | DB query returning curated image metadata with attribution | Complete but NOT currently used by renderer |
| `seedCuratedImages()` | Seeds `curated_images` table from `curated-images.json` manifest on app launch | Called in `main/index.ts` |

### To Remove
| Component | Purpose | Why Remove |
|-----------|---------|------------|
| `useArtifactImages` hook | Fetches Met Museum API artifacts per good | Replaced by curated images |
| `ArtifactImage` component | Lazy-loading museum artifact thumbnail | No longer needed |
| `ArtifactCaption` component | Caption for API-fetched artifacts | Replace with curated attribution |
| `game:get-artifacts` IPC handler | Met Museum + Wikimedia fetch pipeline | No longer needed for offline goal |
| `image:search-port-candidates` IPC | Port image candidate search | Phase 5 tool, not needed at runtime |

## Architecture Patterns

### Current Image Flow (What Already Works)

```
PortScene.tsx
  |-- useResourceImages() → { ports: { portId: "resource-image:///ports/portId.jpg" } }
  |-- if curatedPortImage exists → <img src={curatedPortImage} />
  |-- else → <PortIllustration region={region} />  (SVG fallback)

TradePanel.tsx
  |-- useResourceImages() → { goods: { goodId: ["resource-image:///goodId/goodId_01.jpg", ...] } }
  |-- if curatedUrls[0] exists → <img src={curatedUrls[0]} />
  |-- else → useArtifactImages() → Met API → <ArtifactImage /> (API fallback)
```

### Target Image Flow (Phase 6 End State)

```
PortScene.tsx
  |-- useResourceImages() → { ports: { portId: "resource-image:///ports/portId.jpg" } }
  |-- <img src={curatedPortImage} />  (always available — 25 ports covered)
  |-- PortIllustration.tsx kept as emergency fallback only

TradePanel.tsx
  |-- useResourceImages() → { goods: { goodId: [...urls] } }
  |-- Show curated image(s) with attribution from curated_images table
  |-- No Met API calls, no ArtifactImage component
```

### Pattern: Attribution Display

The `game:get-curated-images` IPC handler returns attribution and sourceUrl from the curated_images DB table. Currently `useResourceImages` only returns file paths (no attribution). Two approaches:

**Option A (Recommended): Merge attribution into useResourceImages**
- Modify `useResourceImages` to also call `game:get-curated-images` for metadata
- Return `{ ports: Record<portId, { url: string; attribution: string; sourceUrl: string }>, goods: Record<goodId, Array<{ url: string; attribution: string; sourceUrl: string }>> }`

**Option B: Separate hook for attribution**
- Keep `useResourceImages` as-is for URLs
- Add `useCuratedAttribution(ids)` hook that calls `game:get-curated-images`
- Compose in components

Option A is simpler since both hooks fetch on mount anyway.

### Image Coverage Verification

**Ports (25/25 covered):**
All 25 port images exist at `resources/images/ports/{portId}.jpg`. The `resource-image://` protocol and `useResourceImages` hook handle this. No port should ever show SVG fallback.

**Trade Goods (8/8 covered, 4 images each = 32 total):**
All 8 goods have 4 images each at `resources/images/{goodId}/{goodId}_0N.jpg`. Currently only the first image is shown in TradePanel. Phase 6 could optionally show a small gallery or rotate through them.

### Anti-Patterns to Avoid
- **Don't remove PortIllustration.tsx entirely:** Keep as emergency fallback in case an image file is missing/corrupt. The conditional already exists in PortScene.
- **Don't fetch attribution on every render:** Cache the curated image metadata in the hook state, same as `useResourceImages` already does.
- **Don't break the curated_images IPC for future use:** The `game:get-curated-images` handler is well-built and useful for attribution even if `resource-image://` handles the actual display.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Local file serving in Electron | `file://` URLs with CSP hacks | `resource-image://` custom protocol (already built) | Security: path traversal prevention, proper CORS |
| Image lazy loading | Custom IntersectionObserver | Native `loading="lazy"` on `<img>` | Browser handles it; ArtifactImage's custom IO was for external URLs |
| Image error handling | Complex error state machines | Simple `onError` with parchment fallback div | All images are local and verified to exist |

## Common Pitfalls

### Pitfall 1: resource-image:// URL Construction
**What goes wrong:** The `resource-image://` scheme is registered as `standard: true`, which means URLs are parsed with hostname semantics. `resource-image:///ports/foo.jpg` has empty hostname and path `/ports/foo.jpg`.
**Why it happens:** Standard schemes treat the part after `://` and before the first `/` as hostname.
**How to avoid:** The protocol handler in `main/index.ts` already handles this by combining `url.hostname` and `url.pathname`. The `useResourceImages` hook uses triple-slash (`resource-image:///`) to keep hostname empty. Don't change this pattern.
**Warning signs:** Images not loading → check DevTools network tab for 403/404 from the custom protocol.

### Pitfall 2: Stale useResourceImages Cache
**What goes wrong:** If the scan runs before `seedCuratedImages()` populates the DB, or if the filesystem scan misses files.
**Why it happens:** Race condition on app startup.
**How to avoid:** The scan is filesystem-based (not DB-based), so it doesn't depend on seeding. But verify by checking that `scanResourceImages` runs after the app is ready and `resources/images/` is populated.
**Warning signs:** `useResourceImages` returns empty `ports` or `goods` maps.

### Pitfall 3: Removing Met API Code Prematurely
**What goes wrong:** Removing `useArtifactImages` and `ArtifactImage` before verifying curated images work perfectly.
**Why it happens:** Eager cleanup.
**How to avoid:** First verify curated path works for all 25 ports and all 8 goods. Then remove API code. Two separate tasks.
**Warning signs:** Blank image areas after cleanup.

### Pitfall 4: Multiple Image Display for Trade Goods
**What goes wrong:** Currently only `curatedUrls[0]` is shown. Each good has 4 images.
**Why it happens:** TradePanel only shows one image per good row, which is fine for the compact trade UI.
**How to avoid:** Decide upfront whether to show 1 image (current) or a small gallery. For Phase 6, showing 1 with attribution is sufficient. A gallery can be a future enhancement.

## Code Examples

### Current PortScene Integration (Already Working)
```typescript
// src/renderer/components/PortScene.tsx lines 49-51, 94-109
const { ports: portImages } = useResourceImages();
const curatedPortImage = portImages[portId];

// In render:
{curatedPortImage ? (
  <img src={curatedPortImage} alt={`${portName} illustration`}
    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
) : (
  <PortIllustration region={region} />
)}
```

### Current TradePanel Integration (Already Working for Image Display)
```typescript
// src/renderer/components/TradePanel.tsx lines 64, 167-189
const { goods: curatedGoods } = useResourceImages();

// In render per good:
const curatedUrls = curatedGoods[good.id];
if (curatedUrls && curatedUrls.length > 0) {
  return <img src={curatedUrls[0]} alt={good.name} style={{ objectFit: 'cover' }} />;
}
// Falls back to ArtifactImage (Met API) — this is what Phase 6 removes
```

### Attribution Display Pattern (To Add)
```typescript
// Example: Adding attribution below curated image in TradePanel
<figure style={{ margin: 0 }}>
  <img src={curatedUrls[0]} alt={good.name} style={{ width: 120, height: 120, objectFit: 'cover' }} />
  <figcaption style={{ fontSize: '0.6rem', color: '#7a5c45', fontStyle: 'italic' }}>
    {attribution} {/* From curated_images table */}
  </figcaption>
</figure>
```

### Verifying Zero Network Requests
```typescript
// In Electron DevTools Console:
// Network tab should show ZERO external requests after all images load
// All image requests should be resource-image:// protocol
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Met Museum API calls at runtime | Pre-curated local images via resource-image:// protocol | Phase 4-5 | Fully offline, no API dependency |
| SVG placeholder illustrations per region | Curated historical JPG per port | Phase 5 | 25 unique port images instead of 6 regional SVGs |
| ArtifactImage with IntersectionObserver | Simple `<img>` with local protocol URL | Phase 6 (this phase) | Simpler code, no lazy-load needed for local files |

## Open Questions

1. **Multiple images per trade good:**
   - What we know: Each good has 4 curated images, but TradePanel only shows 1
   - What's unclear: Should Phase 6 add a small carousel/gallery, or is 1 image sufficient?
   - Recommendation: Show 1 image for now (matches current layout). Gallery is a separate enhancement.

2. **Port image attribution overlay:**
   - What we know: Port images fill the entire PortScene background. Attribution data exists in DB.
   - What's unclear: Where to display attribution for port images (small text overlay? Info panel?)
   - Recommendation: Small semi-transparent attribution line at bottom of PortScene, similar to the existing instruction hint styling.

3. **Dead code cleanup scope:**
   - What we know: `ArtifactImage.tsx`, `useArtifactImages.ts`, `game:get-artifacts` IPC handler, and Met/Wikimedia fetch code can all be removed
   - What's unclear: Should `image:search-port-candidates` IPC also be removed? It was a Phase 5 curation tool.
   - Recommendation: Remove it. It's a development tool, not a runtime feature. Keep the curated-images.json manifest and seedCuratedImages() — those are the runtime path.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all relevant files:
  - `src/main/index.ts` (protocol registration, lines 48-101)
  - `src/main/ipc/game.ts` (IPC handlers for curated images and resource scan)
  - `src/main/preload.ts` (IPC bridge surface)
  - `src/renderer/components/PortScene.tsx` (port image display with fallback)
  - `src/renderer/components/TradePanel.tsx` (trade good image display with fallback)
  - `src/renderer/hooks/useResourceImages.ts` (resource-image:// URL construction)
  - `src/renderer/hooks/useArtifactImages.ts` (Met API hook to remove)
  - `src/renderer/components/ArtifactImage.tsx` (artifact component to remove)
- Filesystem verification: 25 port images, 32 trade good images confirmed on disk

### Secondary (MEDIUM confidence)
- Electron custom protocol API behavior (standard scheme hostname parsing) verified against codebase implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all code inspected directly, protocol and hooks verified
- Architecture: HIGH - current and target flows traced through actual code
- Pitfalls: HIGH - identified from actual code patterns and URL parsing semantics

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable — no external dependencies changing)

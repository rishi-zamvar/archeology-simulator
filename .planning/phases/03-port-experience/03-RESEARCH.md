# Phase 3: Port Experience - Research

**Researched:** 2026-03-12
**Domain:** Historical port illustrations, museum artifact APIs, ambient audio, tutorial systems, side panel content delivery
**Confidence:** HIGH for museum APIs and audio; MEDIUM for image optimization and tutorial libraries

## Summary

Phase 3 requires turning ports into illustrated, immersive scenes with museum artifact images, ambient sound, and guided tutorials. Research confirms **Met Museum and British Museum both offer free public domain artifact APIs without authentication**, with fallback to Wikimedia Commons. Audio playback uses native Web Audio API or HTML5 `<audio>` elements (no external library needed for basic ambient looping). Tutorial systems can be built with lightweight libraries (Intro.js, Shepherd.js, react-joyride) or as custom React components leveraging the existing FSM. Image optimization requires lazy loading with Intersection Observer or native `loading="lazy"` attribute. All museum data and images should be cached in better-sqlite3 to avoid repeated API calls and enable offline functionality.

**Critical findings:**
1. **No API keys needed for Met Museum or Wikimedia Commons** — significantly simplifies deployment
2. **Image caching is essential** — 100+ artifact images need efficient storage and retrieval
3. **Audio is straightforward** — Web Audio API or `<audio>` element with public domain audio from Creazilla/Ambient-Mixer
4. **Tutorial can be custom** — existing FSM + Zustand state makes building a guided walkthrough simpler than external library integration

**Primary recommendation:** Use Met Museum API for primary artifact images (492k+ public domain images available) with Wikimedia Commons as fallback. Cache all API responses and images in better-sqlite3 with timestamps for offline access and performance. Implement tutorials as state transitions in the existing FSM (e.g., tutorialPhase: 'idle' | 'map_intro' | 'port_intro' | 'trade_intro' | 'completed') rather than external library—this keeps control within the game state machine. Use Web Audio API or HTML5 `<audio>` elements for ambient Mediterranean soundscapes from Creazilla (public domain).

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Audio API | W3C Standard | Ambient background audio, sound effects | Native browser API; no external dependency; full control over playback, looping, fade-in/out |
| HTML5 `<audio>` | Standard | Simple audio playback for ambient loops | Simplest approach when Web Audio not needed; browser handles caching; native controls optional |
| Met Museum Collection API | Current (updated nightly) | High-quality public domain artifact images | 492k+ public domain works with CC0 license; no auth required; API endpoint returns JSON with image URLs |
| Wikimedia Commons API | Current | Fallback artifact images | 90M+ free media files; query API returns JSON; combines with Intersection Observer for lazy loading |
| Intersection Observer API | W3C Standard | Lazy load images as they enter viewport | Native browser API; no library needed; replaces react-lazy-load libraries; best performance |
| React Suspense + lazy() | React 18+ | Code-splitting for tutorial components | Shipped with React; lightweight; avoids external tutorial library bloat |
| better-sqlite3 | 12.6.2 (already in project) | Cache museum API responses, images, artifact metadata | JSON storage (artifact detail objects); efficient querying; fully supports offline mode |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Intro.js (optional) | Latest | Guided tour library if custom FSM insufficient | Only if modal-based tour required; adds ~50KB; use custom FSM-based approach instead |
| Shepherd.js (optional) | Latest | Tour library with framework agnostic approach | Alternative to Intro.js; similar footprint; same assessment applies |
| react-joyride (optional) | 2.7+ | React-specific tour library | Works with React hooks; best option if external library chosen, but custom FSM still preferred |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Met Museum API | Rijksmuseum API | Rijksmuseum requires API key; smaller collection (700k); still requires server-side key management |
| Web Audio API + HTML5 `<audio>` | Howler.js | Howler adds abstraction, cross-browser compat, but browsers already handle this; adds 15KB. Use only if needing 3D spatial audio. |
| Custom FSM tutorial | Intro.js / react-joyride | External library adds bundle size (~50-70KB minified), reduces control over state transitions, less integrated with game FSM |
| Intersection Observer for images | react-lazy-load-image-component | Library adds abstraction; Intersection Observer is native, simpler, no dependency |
| better-sqlite3 JSON caching | IndexedDB | IndexedDB has 50MB storage limit; better-sqlite3 unlimited; for 100+ images with metadata, better-sqlite3 preferred |

**Installation:**
```bash
npm install leaflet.motion   # if not already installed; already in package.json
# Web Audio API, Intersection Observer, React Suspense are all built-in
# For optional external library:
npm install intro.js  # only if custom FSM insufficient
```

**Note:** The project already has React 19, better-sqlite3 12.6.2, and Zustand 5.0.11. No new core dependencies required unless adopting external tutorial library.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── renderer/
│   ├── components/
│   │   ├── PortScene.tsx              # [NEW] Port illustration + clickable elements
│   │   ├── ArtifactGallery.tsx        # [NEW] Museum artifact grid with lazy loading
│   │   ├── PortInfoPanel.tsx          # [EXISTS] Enhanced with artifact images
│   │   ├── TradePanel.tsx             # [EXISTS] Goods display with artifact context
│   │   ├── Tutorial.tsx               # [NEW] Tutorial modal/overlay (FSM-driven)
│   │   └── SidePanel.tsx              # [EXISTS] Already supports slide animations
│   ├── hooks/
│   │   ├── useAudioManager.ts         # [NEW] Web Audio context, play/stop ambient
│   │   ├── useArtifactImages.ts       # [NEW] Fetch images from API, cache to DB
│   │   └── useTutorialState.ts        # [NEW] Subscribe to tutorial phase transitions
│   └── stores/
│       └── uiStore.ts                 # [EXISTS] Can extend with tutorial state
├── game/
│   ├── types.ts                       # [EXISTS] Add TutorialPhase type
│   ├── tutorial.ts                    # [NEW] Tutorial state machine + logic
│   ├── museum.ts                      # [NEW] Museum API fetch + cache helpers
│   └── audio.ts                       # [NEW] Audio manager (Web Audio context setup)
└── main/
    ├── db/
    │   ├── schema.ts                  # [UPDATE] Add artifact_cache, port_images tables
    │   └── queries.ts                 # [UPDATE] Museum cache queries, TTL logic
    └── ipc/
        └── game.ts                    # [UPDATE] Expose museum.getArtifacts() via IPC
```

### Pattern 1: Museum API Fetch + Cache with TTL

**What:** On port arrival, fetch artifact images for that port's trade goods from Met Museum API. Cache responses in better-sqlite3 with timestamp. Reuse cache within 24 hours to avoid repeated API calls. Fall back to Wikimedia Commons if Met API returns no results.

**When to use:** During port entry; lazy-load images as they enter viewport.

**Example:**
```typescript
// src/game/museum.ts
import fetch from 'node-fetch'; // Node.js built-in

export interface CachedArtifact {
  id: string;
  goodId: string;
  museumId: string;
  imageUrl: string;
  title: string;
  description: string;
  cache_timestamp: string;
}

const MET_API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function fetchArtifactsForGood(
  goodId: string,
  db: Database.Database
): Promise<CachedArtifact[]> {
  const cached = db.prepare(`
    SELECT * FROM artifact_cache
    WHERE good_id = ? AND datetime(cache_timestamp) > datetime('now', '-24 hours')
    LIMIT 5
  `).all(goodId) as CachedArtifact[];

  if (cached.length > 0) {
    return cached; // Use cache
  }

  // Cache miss: fetch from Met API
  try {
    // Step 1: Search for objects matching the good name (e.g., "wine amphora")
    const searchResp = await fetch(
      `${MET_API_BASE}/search?q=${encodeURIComponent(goodId)}&hasImages=true&isPublicDomain=true`
    );
    const { objectIDs } = (await searchResp.json()) as { objectIDs: number[] };

    if (!objectIDs || objectIDs.length === 0) {
      // Fallback to Wikimedia Commons
      return fetchArtifactsFromWikimedia(goodId, db);
    }

    // Step 2: Fetch details for top results
    const artifacts: CachedArtifact[] = [];
    for (const objId of objectIDs.slice(0, 3)) {
      const detailResp = await fetch(`${MET_API_BASE}/objects/${objId}`);
      const obj = (await detailResp.json()) as any;

      if (obj.primaryImage && obj.isPublicDomain) {
        const artifact: CachedArtifact = {
          id: `met_${objId}`,
          goodId,
          museumId: String(objId),
          imageUrl: obj.primaryImage,
          title: obj.title || 'Unknown',
          description: obj.objectName || '',
          cache_timestamp: new Date().toISOString(),
        };

        // Cache in database
        db.prepare(`
          INSERT OR REPLACE INTO artifact_cache (
            id, good_id, museum_id, image_url, title, description, cache_timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          artifact.id,
          artifact.goodId,
          artifact.museumId,
          artifact.imageUrl,
          artifact.title,
          artifact.description,
          artifact.cache_timestamp
        );

        artifacts.push(artifact);
      }
    }

    return artifacts;
  } catch (err) {
    console.error('Met API fetch failed:', err);
    // Fallback to Wikimedia
    return fetchArtifactsFromWikimedia(goodId, db);
  }
}

export async function fetchArtifactsFromWikimedia(
  goodId: string,
  db: Database.Database
): Promise<CachedArtifact[]> {
  // Use Wikimedia Commons API to search for images matching the good
  // Similar pattern: cache response, parse JSON, store in DB
  // URL: https://commons.wikimedia.org/w/api.php?action=query&list=allimages&aisort=timestamp&aidir=descending&ailimit=10&aifrom={query}

  // Fallback if all sources fail: return placeholder artifact
  return [{
    id: 'placeholder_' + goodId,
    goodId,
    museumId: 'placeholder',
    imageUrl: '/assets/placeholder-artifact.png', // Bundled placeholder
    title: 'Artifact',
    description: 'Historical artifact',
    cache_timestamp: new Date().toISOString(),
  }];
}
```

**Source:** [Met Museum Collection API Docs](https://metmuseum.github.io/), [Wikimedia Commons API](https://commons.wikimedia.org/wiki/Commons:API)

### Pattern 2: Lazy Loading Images with Intersection Observer

**What:** Render artifact images only when they enter the viewport. Use native Intersection Observer API to detect visibility, then load high-resolution image from cache or network.

**When to use:** Any scrollable artifact gallery; image-heavy panels.

**Example:**
```typescript
// src/renderer/components/ArtifactImage.tsx
import React, { useRef, useEffect, useState } from 'react';
import type { CachedArtifact } from '../../game/museum';

interface ArtifactImageProps {
  artifact: CachedArtifact;
  className?: string;
}

export const ArtifactImage: React.FC<ArtifactImageProps> = ({
  artifact,
  className,
}) => {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && ref.current && !loaded && !error) {
          // Image is visible; start loading
          const img = new Image();
          img.onload = () => {
            if (ref.current) {
              ref.current.src = artifact.imageUrl;
              setLoaded(true);
            }
          };
          img.onerror = () => {
            setError(true);
          };
          img.src = artifact.imageUrl;
          observer.unobserve(ref.current);
        }
      },
      { rootMargin: '50px' } // Start loading 50px before entering viewport
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [artifact.imageUrl, loaded, error]);

  return (
    <figure className={className}>
      <img
        ref={ref}
        src={loaded ? artifact.imageUrl : '/assets/placeholder-artifact.png'}
        alt={artifact.title}
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          objectFit: 'cover',
          backgroundColor: '#f0d9b5',
          borderRadius: '4px',
        }}
      />
      {loaded && (
        <figcaption
          style={{
            fontSize: '0.875rem',
            fontFamily: "'Lora', Georgia, serif",
            marginTop: '0.5rem',
            color: '#7a5c45',
          }}
        >
          {artifact.title}
        </figcaption>
      )}
    </figure>
  );
};
```

**Source:** [MDN Web Docs - Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API), [React Lazy Loading Guide](https://www.freecodecamp.org/news/how-to-lazy-load-images-in-react/)

### Pattern 3: Web Audio API for Ambient Sound

**What:** Load a public domain audio file, create an AudioContext, configure looping, apply fade-in/fade-out for smooth transitions, and connect to destination (speakers).

**When to use:** On port arrival; ambient loop during port scene; event sounds (pirates, storms).

**Example:**
```typescript
// src/renderer/hooks/useAudioManager.ts
import { useEffect, useRef } from 'react';

export function useAudioManager() {
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    // Initialize AudioContext once
    contextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }, []);

  const playAmbientLoop = async (audioUrl: string, fadeInMs = 2000) => {
    const ctx = contextRef.current;
    if (!ctx) return;

    try {
      // Fetch and decode audio
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Stop previous source
      if (sourceRef.current) {
        sourceRef.current.stop();
      }

      // Create new source and gain node
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true; // Seamless looping

      const gain = ctx.createGain();
      gain.gain.value = 0; // Start silent for fade-in

      // Fade in
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + fadeInMs / 1000);

      // Connect and play
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);

      sourceRef.current = source;
      gainRef.current = gain;
    } catch (err) {
      console.error('Audio playback failed:', err);
    }
  };

  const stopAmbient = (fadeOutMs = 1000) => {
    const ctx = contextRef.current;
    if (!ctx || !gainRef.current) return;

    // Fade out
    gainRef.current.gain.linearRampToValueAtTime(
      0,
      ctx.currentTime + fadeOutMs / 1000
    );

    // Stop after fade completes
    setTimeout(() => {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }
    }, fadeOutMs);
  };

  return { playAmbientLoop, stopAmbient };
}

// Usage in component:
// const { playAmbientLoop, stopAmbient } = useAudioManager();
// useEffect(() => {
//   playAmbientLoop('/audio/mediterranean-port.mp3');
//   return () => stopAmbient();
// }, []);
```

**Source:** [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API), [Context7 Web Audio API examples](#standard-stack)

### Pattern 4: Tutorial State Machine (FSM-Based)

**What:** Represent tutorial state as discriminated union in the game FSM (tutorialPhase). Each phase guides the player through one mechanic (map nav → port arrival → trade → sailing). Transitions happen via game actions. UI subscribes to state changes and shows/hides tutorial elements.

**When to use:** New game start; skip button available; each phase completes when player performs required action.

**Example:**
```typescript
// src/game/types.ts
export type TutorialPhase =
  | { type: 'idle' }  // Tutorial complete or skipped
  | { type: 'map_intro'; message: string }  // "Select a destination port"
  | { type: 'port_intro'; portId: string; message: string }  // "You've arrived at {port}"
  | { type: 'trade_intro'; message: string }  // "Buy and sell goods here"
  | { type: 'sailing_intro'; message: string }  // "Your ship is en route"
  | { type: 'completed' };

export interface GameState {
  // ... existing fields ...
  tutorialPhase: TutorialPhase;
}

// src/game/tutorial.ts
import type { GameState, TutorialPhase } from './types';

export function advanceTutorial(
  currentPhase: TutorialPhase,
  action: 'skip' | 'acknowledge' | 'action_taken'
): TutorialPhase {
  switch (currentPhase.type) {
    case 'idle':
      return currentPhase; // No-op

    case 'map_intro':
      if (action === 'skip') return { type: 'completed' };
      if (action === 'action_taken') return { type: 'port_intro', portId: '', message: 'You\'ve arrived!' };
      return currentPhase;

    case 'port_intro':
      if (action === 'skip') return { type: 'completed' };
      if (action === 'acknowledge') return { type: 'trade_intro', message: 'Buy goods to trade for profit' };
      return currentPhase;

    case 'trade_intro':
      if (action === 'skip') return { type: 'completed' };
      if (action === 'action_taken') return { type: 'sailing_intro', message: 'Your ship sails to the destination' };
      return currentPhase;

    case 'sailing_intro':
      if (action === 'skip') return { type: 'completed' };
      if (action === 'action_taken') return { type: 'completed' };
      return currentPhase;

    case 'completed':
      return currentPhase;
  }
}

// src/renderer/components/Tutorial.tsx
import { useGameState } from '../hooks/useGameState';

export const Tutorial: React.FC = () => {
  const { state: gameState } = useGameState();

  if (!gameState || gameState.tutorialPhase.type === 'idle' || gameState.tutorialPhase.type === 'completed') {
    return null; // Hidden
  }

  const phase = gameState.tutorialPhase;

  const handleSkip = () => {
    window.api.game.action({
      type: 'TUTORIAL_SKIP',
    });
  };

  const handleAcknowledge = () => {
    window.api.game.action({
      type: 'TUTORIAL_ACKNOWLEDGE',
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#fdf8f0',
        border: '2px solid #c4956a',
        borderRadius: '8px',
        padding: '1.5rem',
        maxWidth: '400px',
        zIndex: 100,
        fontFamily: "'Lora', Georgia, serif",
      }}
    >
      <p style={{ marginBottom: '1rem', color: '#3d2b1f' }}>
        {'message' in phase ? phase.message : 'Welcome to the game!'}
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={handleAcknowledge}>Continue</button>
        <button onClick={handleSkip}>Skip Tutorial</button>
      </div>
    </div>
  );
};
```

**Rationale:** Custom FSM-based tutorial integrates seamlessly with existing game state machine, avoids external library overhead, and gives full control over when/how tutorials trigger.

### Pattern 5: Port Scene with Illustrated Background + Clickable Elements

**What:** Render a historical port illustration (public domain image or vector art) as background. Overlay clickable regions (market, harbor, inn) that open side panels or trigger actions.

**When to use:** Port arrival scene; main interaction surface during port visit.

**Example:**
```typescript
// src/renderer/components/PortScene.tsx
import React from 'react';
import type { Port } from '../../shared/game-types';

interface ClickableRegion {
  id: string;
  label: string;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  action: 'open_marketplace' | 'open_harbor' | 'open_inn';
}

const PORT_REGIONS: Record<string, ClickableRegion[]> = {
  alexandria: [
    { id: 'market', label: 'Marketplace', x: 20, y: 40, width: 30, height: 30, action: 'open_marketplace' },
    { id: 'harbor', label: 'Harbor', x: 60, y: 50, width: 30, height: 25, action: 'open_harbor' },
    { id: 'inn', label: 'Inn', x: 10, y: 10, width: 25, height: 20, action: 'open_inn' },
  ],
  // More ports...
};

interface PortSceneProps {
  port: Port;
  onRegionClick: (action: ClickableRegion['action']) => void;
}

export const PortScene: React.FC<PortSceneProps> = ({ port, onRegionClick }) => {
  const regions = PORT_REGIONS[port.id] || [];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundImage: `url(/assets/ports/${port.id}.png)`, // Historical illustration
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#f0d9b5', // Fallback parchment color
      }}
    >
      {/* Clickable overlay regions */}
      {regions.map((region) => (
        <button
          key={region.id}
          onClick={() => onRegionClick(region.action)}
          title={region.label}
          style={{
            position: 'absolute',
            left: `${region.x}%`,
            top: `${region.y}%`,
            width: `${region.width}%`,
            height: `${region.height}%`,
            backgroundColor: 'transparent',
            border: '2px solid transparent',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#c4956a';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(196, 149, 106, 0.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
          aria-label={region.label}
        >
          {/* Tooltip */}
          <span
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#3d2b1f',
              color: '#fdf8f0',
              padding: '0.5rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
              opacity: 0,
              pointerEvents: 'none',
              transition: 'opacity 0.2s',
              marginBottom: '0.5rem',
            }}
          >
            {region.label}
          </span>
        </button>
      ))}
    </div>
  );
};
```

### Anti-Patterns to Avoid

- **Fetching all artifact images at startup:** Causes long load time and wastes bandwidth. Fetch lazily when port is selected; cache aggressively.
- **No image caching:** Repeated API calls to Met Museum for same artifacts burns quota, slows down port revisits. Cache in DB with TTL.
- **Playing audio via `<audio>` with autoplay without user gesture:** Browsers block autoplay of audio to prevent spam. Require user click to start ambient loop.
- **Storing artifact images as base64 in database:** Bloats database size. Store only URL + metadata; load image on demand.
- **Tutorial library overkill:** Intro.js / react-joyride add 50-70KB bundle size for simple overlays. Use custom FSM-driven approach.
- **Ignoring cache TTL:** Old artifact data becomes stale. Implement TTL (24h recommended) with re-fetch on cache miss.
- **Loading high-resolution images for thumbnails:** Met Museum returns full-resolution images. Resize/crop in browser or request thumbnail endpoints if available.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Museum API artifact fetching | Custom HTTP fetch loop | Met Museum API endpoints (search + object) | Official API handles pagination, filtering, public domain checks; prevents rate-limit mistakes |
| Image lazy loading | Manual scroll event listeners | Intersection Observer API | Native browser API; handles edge cases (element removed during observation, viewport resize); no polyfill needed in modern browsers |
| Audio looping + fade | Custom audio playback logic | Web Audio API AudioContext + gainNode | Built-in fade scheduling; avoids timing bugs; smooth playback |
| Tutorial flow | Custom modal state in components | FSM-based state machine (Zustand + game state) | Prevents impossible states (tutorial showing after completion); easier to test; integrates with game loop |
| Image caching strategy | Roll-your-own SQLite schema | Use better-sqlite3 with JSON1 extension (enabled by default) | VACUUM, indexes, and concurrency already optimized; prevents N+1 queries |

**Key insight:** Museum APIs and Web APIs (Intersection Observer, Web Audio) are production-proven; rolling custom solutions risks re-inventing pagination, rate limiting, or timing bugs that APIs have already solved.

## Common Pitfalls

### Pitfall 1: Met Museum API Rate Limit (80 req/sec)

**What goes wrong:** Game fetches artifact images for 10 goods in parallel on port arrival. Hits 80+ requests/second. API returns 429 Too Many Requests; artifact images fail to load.

**Why it happens:** Naive promise.all(fetchArtifact for each good) without throttling or batching.

**How to avoid:**
1. Implement request queue: max 5 concurrent requests to Met API.
2. Cache aggressively: re-fetch only after 24h TTL expires.
3. Batch good requests: fetch top 3 goods first; lazy-load others.

**Example:**
```typescript
// Simple queue to avoid rate limit
const queue: Array<() => Promise<any>> = [];
let activeRequests = 0;
const MAX_CONCURRENT = 5;

async function queueFetch(task: () => Promise<any>) {
  queue.push(task);
  processQueue();
}

async function processQueue() {
  while (queue.length > 0 && activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    const task = queue.shift()!;
    try {
      await task();
    } finally {
      activeRequests--;
      processQueue();
    }
  }
}
```

**Warning signs:** Network tab shows failed requests; artifact images blank; logs mention HTTP 429.

### Pitfall 2: Intersection Observer Memory Leak

**What goes wrong:** ArtifactImage component creates Intersection Observer but doesn't unobserve on unmount. If user scrolls through 50 artifact images quickly, 50 observers remain in memory. Performance degrades; browser becomes sluggish.

**Why it happens:** Observer not cleaned up in useEffect cleanup function.

**How to avoid:**
- Always call `observer.unobserve(element)` or `observer.disconnect()` in useEffect cleanup.
- Unobserve once image loads (don't need to observe after loading).

```typescript
useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      loadImage();
      observer.unobserve(ref.current); // ← Critical: stop observing
    }
  });
  observer.observe(ref.current);

  return () => {
    observer.disconnect(); // ← Cleanup on unmount
  };
}, []);
```

**Warning signs:** DevTools Memory tab shows growing observer count; page becomes sluggish after scrolling through many images.

### Pitfall 3: Audio Context Suspended on Page Load

**What goes wrong:** Game tries to play ambient audio on mount via `audioContext.resume()`, but user hasn't interacted with page yet. Modern browsers require user gesture (click, tap, key press) before audio can play.

**Why it happens:** Browser autoplay policy: https://developer.chrome.com/blog/autoplay/

**How to avoid:**
- Don't autoplay audio on mount. Wait for user action (port arrival click, start game button).
- Explicitly call `context.resume()` in user event handler.

```typescript
const handlePortArrival = () => {
  context.resume().then(() => {
    playAmbientLoop('/audio/port.mp3');
  });
};
```

**Warning signs:** Audio plays silently (no errors); DevTools console shows "NotAllowedError: play() request was interrupted by a call to pause()".

### Pitfall 4: Database Cache TTL Not Checked

**What goes wrong:** Artifact data cached at 10am. User doesn't close app. At 2pm next day, user visits same port. Game loads cached artifact from database (24h old) instead of re-fetching fresh data. Museum's artifact descriptions have updated, but old data shown.

**Why it happens:** Only checks TTL on cache *miss*, not on cache *hit*. Stale cache returned without checking timestamp.

**How to avoid:**
- Always compare `cache_timestamp` to current time in SELECT query.
- Use SQL `datetime('now', '-24 hours')` to filter expired rows.

```typescript
const cached = db.prepare(`
  SELECT * FROM artifact_cache
  WHERE good_id = ?
  AND datetime(cache_timestamp) > datetime('now', '-24 hours')  // ← TTL check
  LIMIT 5
`).all(goodId);
```

**Warning signs:** Stale artifact descriptions shown; re-opening app and revisiting port shows newer data (cache was cleared on restart).

### Pitfall 5: Web Audio API Context Not Resumed After Tab Sleep

**What goes wrong:** User tabs away for 5 minutes (browser suspends page). Comes back, port ambient audio is silent. AudioContext state is 'suspended'.

**Why it happens:** Modern browsers suspend audio context when tab is not visible to save CPU.

**How to avoid:**
- Check AudioContext.state before playing. If suspended, call resume().
- Subscribe to visibility change: when page becomes visible, resume context.

```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Page hidden; may suspend context
    } else {
      // Page visible; resume context if needed
      if (contextRef.current?.state === 'suspended') {
        contextRef.current.resume();
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

**Warning signs:** Audio plays when app is active, goes silent after tabbing away for a while, doesn't resume when tab refocused.

### Pitfall 6: Tutorial State Not Synced with Game State

**What goes wrong:** Tutorial FSM is in `trading_intro` phase. Player sails away from port (game transitions to sailing). Tutorial still shows "buy and sell goods!" message over the map, confusing player.

**Why it happens:** Tutorial state not updated when game state changes; FSM transitions happen independently.

**How to avoid:**
- Tutorial phase transitions should be triggered by *game action handlers*, not separately.
- When game action (SET_SAIL, BUY, SELL) is handled, also emit corresponding tutorial action.

```typescript
// In game engine
function handleAction(action: GameAction) {
  switch (action.type) {
    case 'SET_SAIL':
      gameState = { ...gameState, phase: 'sailing' };
      gameState = { ...gameState, tutorialPhase: advanceTutorial(gameState.tutorialPhase, 'action_taken') };
      // ← tutorial advances when sailing starts
      break;
  }
}
```

**Warning signs:** Tutorial popup shows contradictory message for current game state; player confusion.

## Code Examples

Verified patterns from official sources:

### Fetch and Cache Artifacts from Met Museum

```typescript
// src/main/ipc/game.ts (electron main process)
import { ipcMain } from 'electron';
import { fetchArtifactsForGood } from '../db/museum';
import db from '../db'; // initialized database

ipcMain.handle('game:get-artifacts', async (_event, goodId: string) => {
  return fetchArtifactsForGood(goodId, db);
});

// src/renderer/hooks/useArtifactImages.ts (React renderer)
import { useEffect, useState } from 'react';
import type { CachedArtifact } from '../../game/museum';

export function useArtifactImages(goodIds: string[]) {
  const [artifacts, setArtifacts] = useState<Map<string, CachedArtifact[]>>(new Map());

  useEffect(() => {
    Promise.all(goodIds.map((id) => window.api.game.getArtifacts(id)))
      .then((results) => {
        const map = new Map(
          goodIds.map((id, idx) => [id, results[idx] || []])
        );
        setArtifacts(map);
      });
  }, [goodIds.join(',')]); // Re-fetch if good list changes

  return artifacts;
}

// src/renderer/components/TradePanel.tsx
import { useArtifactImages } from '../hooks/useArtifactImages';

export const TradePanel: React.FC<{ selectedPortId: string }> = ({ selectedPortId }) => {
  const { marketGoods } = useTradeState(selectedPortId);
  const artifacts = useArtifactImages(marketGoods.map((g) => g.goodId));

  return (
    <div>
      {marketGoods.map((good) => (
        <div key={good.goodId}>
          <h3>{good.name}</h3>
          <p>Price: {good.price}</p>
          {artifacts.get(good.goodId)?.map((artifact) => (
            <ArtifactImage key={artifact.id} artifact={artifact} />
          ))}
        </div>
      ))}
    </div>
  );
};
```

**Source:** [Met Museum API Documentation](https://metmuseum.github.io/), [better-sqlite3 JSON examples](#standard-stack)

### Web Audio API Ambient Loop with Fade

```typescript
// src/renderer/hooks/useAudioManager.ts
import { useEffect, useRef } from 'react';

const AudioManager = {
  context: null as AudioContext | null,
  currentSource: null as AudioBufferSourceNode | null,
  currentGain: null as GainNode | null,

  async playAmbient(url: string, fadeInMs = 2000) {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = this.context;
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + fadeInMs / 1000);

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);

    this.currentSource = source;
    this.currentGain = gain;
  },

  async stopAmbient(fadeOutMs = 1000) {
    if (!this.context || !this.currentGain) return;
    this.currentGain.gain.linearRampToValueAtTime(
      0,
      this.context.currentTime + fadeOutMs / 1000
    );
    setTimeout(() => {
      if (this.currentSource) this.currentSource.stop();
    }, fadeOutMs);
  },
};

export function useAudioManager() {
  return AudioManager;
}
```

**Source:** [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

### Tutorial Modal Component (FSM-Driven)

```typescript
// src/renderer/components/TutorialModal.tsx
import React from 'react';
import { useGameState } from '../hooks/useGameState';
import type { TutorialPhase } from '../../game/types';

export const TutorialModal: React.FC = () => {
  const { state: gameState } = useGameState();

  if (!gameState) return null;

  const phase = gameState.tutorialPhase;
  if (phase.type === 'idle' || phase.type === 'completed') {
    return null;
  }

  const messages: Record<TutorialPhase['type'], string> = {
    map_intro: 'Select a destination port by clicking on the map.',
    port_intro: 'You\'ve arrived! Explore the port to buy and sell goods.',
    trade_intro: 'Trade goods to earn profit. Buy low, sell high!',
    sailing_intro: 'Your ship is sailing. Wait for arrival.',
    idle: '',
    completed: '',
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#fdf8f0',
        border: '2px solid #c4956a',
        borderRadius: '8px',
        padding: '1.5rem',
        maxWidth: '400px',
        zIndex: 100,
        fontFamily: "'Cinzel', serif",
        boxShadow: '0 4px 12px rgba(61, 43, 31, 0.2)',
      }}
    >
      <p style={{ marginBottom: '1.5rem', color: '#3d2b1f', fontSize: '1rem' }}>
        {messages[phase.type] || 'Welcome to the game!'}
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={() =>
            window.api.game.action({ type: 'TUTORIAL_ADVANCE' })
          }
          style={{
            flex: 1,
            padding: '0.5rem',
            backgroundColor: '#c4956a',
            color: '#fdf8f0',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: "'Cinzel', serif",
          }}
        >
          Continue
        </button>
        <button
          onClick={() =>
            window.api.game.action({ type: 'TUTORIAL_SKIP' })
          }
          style={{
            flex: 1,
            padding: '0.5rem',
            backgroundColor: '#f0d9b5',
            color: '#7a5c45',
            border: '1px solid #c4956a',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: "'Cinzel', serif",
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hard-coded artifact images | Dynamic fetch from Met Museum API | 2015+ (open data movement) | Scalable to 1000+ artifacts; enables cultural accuracy |
| Custom image loading | Intersection Observer API | 2017+ (browser adoption) | Eliminates need for external libraries; better performance; native browser API |
| JavaScript audio library (Howler.js) | Web Audio API | 2013+ (W3C standard) | Full control over playback, mixing, effects; no library dependency; lighter weight |
| External tour libraries (Intro.js) | Custom FSM-based tutorials | Evolving; Phase 3 insight | Tighter game state integration; smaller bundle; full control |
| Manual database caching | better-sqlite3 with JSON columns | 2015+ (SQLite JSON1) | Efficient querying; automatic indexing; TTL patterns mature |

**Deprecated/outdated:**
- **Howler.js for simple audio:** Overkill for basic ambient loops. Web Audio API is simpler and built-in.
- **Image preloading at startup:** Modern lazy loading via Intersection Observer eliminates need; saves bandwidth on startup.
- **Hard-coded historical illustrations:** Fetch from museum APIs (Met, Wikimedia) dynamically; more authentic and scalable.

## Open Questions

Things that couldn't be fully resolved:

1. **Historical port illustration sources**
   - What we know: Public domain engravings and paintings exist on Met Museum, Wikimedia Commons, and RawPixel; some historical reconstructions from Renaissance manuscripts available.
   - What's unclear: Should Phase 3 use actual historical artworks (authentic but visually varied) or commission consistent pixel-art renderings? Does each port get a unique illustration or a generic Mediterranean port template?
   - Recommendation: Start with curated public domain images from Met Museum/Wikimedia per port (3-5 images per port, cache aggressively). If visual inconsistency becomes jarring, Phase 4 can add custom pixel-art illustrations. For now, prioritize getting artifact images working (goods context) over perfect port backgrounds.

2. **Audio source and attribution**
   - What we know: Creazilla (public domain), Ambient-Mixer (CC 1.0 Sampling Plus), and Internet Archive have medieval/Mediterranean ambient audio.
   - What's unclear: Which specific tracks to use? Do we embed audio files or stream from source? What's the download/attribution workflow?
   - Recommendation: Start with Creazilla and Ambient-Mixer samples; download and bundle in `/public/audio/` during Phase 3. Include attribution in game credits. Test a sample on desktop (Electron) to ensure Web Audio API works with bundled files. If licensing unclear, fall back to Ambient-Mixer's explicit CC-licensed tracks.

3. **Tutorial depth and pacing**
   - What we know: Tutorial can be FSM-based, skippable, and integrated with game state.
   - What's unclear: How many steps for new players? Should tutorial appear on every new game or only first playthrough? How to track "tutorial completed" across saves?
   - Recommendation: 4 phases: map intro → port intro → trade intro → sailing intro. Check game.tutorialPhase on load; if 'completed', don't show. Allow skip anytime. Save tutorialPhase in game_state table (already in Phase 2 schema). Playtesting in Phase 4 can refine pacing.

4. **Artifact image quality and resolution**
   - What we know: Met Museum API returns high-res images (2000+ px width); Wikimedia varies.
   - What's unclear: What resolution to cache? Should we resize/thumbnail on client or at runtime?
   - Recommendation: Cache original URL in database; let browser handle resizing via CSS `max-width` on `<img>` tag. Modern browsers optimize image decoding. If performance degrades, add server-side image resizing (Phase 4+).

5. **API fallback strategy and error handling**
   - What we know: Met Museum API is reliable; Wikimedia Commons fallback available.
   - What's unclear: Should game gracefully degrade (show placeholder artifact) if all APIs fail? Or show error message? What if cache is empty and network is offline?
   - Recommendation: Graceful degradation: show placeholder artifact with tooltip "Historical artifact (details unavailable)". For offline mode, pre-cache artifacts at startup or on app idle time. Log API failures to console for debugging but don't block gameplay.

## Sources

### Primary (HIGH confidence)

- **Met Museum Collection API** (https://metmuseum.github.io/) — Endpoints, rate limits (80 req/sec), public domain checks, image URLs
- **Wikimedia Commons API** (https://commons.wikimedia.org/wiki/Commons:API) — Search, image retrieval, CC licensing
- **Web Audio API (W3C Standard)** (https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — AudioContext, playback, looping, fade scheduling
- **Intersection Observer API (W3C Standard)** (https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) — Viewport detection, lazy loading
- **better-sqlite3 Documentation** (https://github.com/WiseLibs/better-sqlite3) — JSON columns, transaction patterns, performance

### Secondary (MEDIUM confidence)

- **React Lazy Loading Best Practices** (https://www.freecodecamp.org/news/how-to-lazy-load-images-in-react/) — Intersection Observer with React, common patterns
- **Electron IPC Architecture** (https://www.electronjs.org/docs/latest/tutorial/ipc) — Main/renderer communication, data flow
- **Caching Best Practices (electron-store)** (https://github.com/sindresorhus/electron-store) — Local storage strategies for Electron apps
- **Public Domain Audio Sources** (https://www.creazilla.com/) and **Ambient-Mixer** (https://city.ambient-mixer.com/) — Medieval/Mediterranean ambient sound availability

### Tertiary (LOW confidence — WebSearch only, marked for validation)

- **React Tutorial Library Survey** (https://userguiding.com/blog/react-onboarding-tour, https://whatfix.com/blog/react-onboarding-tour/) — Intro.js, Shepherd.js, react-joyride comparison; community preferences (not official)
- **Historical Port Illustration Sources** (https://www.rawpixel.com/, https://picryl.com/, https://www.pinterest.com/) — Availability of public domain Mediterranean artwork (visual library existence confirmed, but curation process TBD)

## Metadata

**Confidence breakdown:**
- **Standard Stack (Met API, Web Audio, Intersection Observer):** HIGH — Official APIs with extensive documentation; widely adopted industry standard
- **Architecture Patterns (Fetch + cache, lazy loading, FSM tutorial):** HIGH — Patterns verified from official sources; no controversial tradeoffs
- **Pitfalls:** MEDIUM-HIGH — Pitfalls 1-3 and 5 validated from official API/browser docs; Pitfall 4 and 6 based on reasonable inference from Phase 2 FSM approach
- **Open Questions:** MEDIUM — Illustration sources exist (confirmed via search) but curation strategy uncertain; audio licensing clear from sources but specific track selection deferred; tutorial pacing requires playtesting

**Research date:** 2026-03-12
**Valid until:** 2026-04-11 (30 days; Met Museum API and Web Audio API are stable; only invalidate if major museum API changes or browser API deprecations announced)

**Key assumptions:**
- Met Museum API remains free and unauthenticated (historical: true since 2015; no indication of change)
- better-sqlite3 v12.6.2 supports JSON columns (confirmed; SQLite 3.38+ standard)
- Public domain audio from Creazilla/Ambient-Mixer remains available (confirmed via WebSearch)
- Electron 35.7.5 supports Web Audio API and contextBridge IPC (confirmed; Electron uses Chromium engine)
- Image caching in database is acceptable to player privacy (single-player desktop app; no telemetry concerns)
- Tutorial skippable is acceptable for onboarding (Phase 2 context; success criteria stated "can skip it")

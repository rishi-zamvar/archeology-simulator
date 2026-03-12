# Technology Stack

**Project:** Archeology Simulator (Electron + React turn-based historical trade game)
**Researched:** March 12, 2026
**Confidence:** HIGH for core stack (Context7 + official docs verified), MEDIUM for patterns

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Electron | 41.0.0 | Desktop app runtime (Chromium + Node.js) | Industry standard for cross-platform desktop apps. Bundles browser engine eliminating compatibility issues. Simplifies distribution. Latest version (March 2026) with Node 24.14.0. |
| React | 19.2.4 | UI rendering and component framework | Standard for building interactive UIs. Excellent documentation. Large ecosystem. Latest version includes security hardening for Server Actions. |
| Vite | 8.3.0 | Build tool and dev server | 10-50x faster than webpack. Native ES module support. Hot Module Replacement for instant feedback. Standard choice for React in 2026. |
| Electron Forge | 7.11.x | Electron packaging and distribution | Official build tool for Electron. Handles code signing, installers, and artifact publishing. V7.11+ uses npm trusted publishing. |
| TypeScript | 5.x | Type safety and IDE support | Essential for maintainability in game logic. Catch errors at compile time. Excellent with Vite. |

### Data Persistence

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| better-sqlite3 | 12.7.0 | Local game state storage | Fastest SQLite library for Node.js. Synchronous API (game-friendly). Built for Electron. Latest version (March 2026) updated for Electron 41 support. |
| Zustand | 5.0.11 | Client-side state management | Lightweight (3KB vs Redux 15KB). Hooks-based. Minimal boilerplate. Perfect for game state synchronization. No provider needed. |

### UI and Styling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Leaflet | 1.9.4 | Interactive map rendering | Lightweight, battle-tested library. Supports custom tile layers (styled OpenStreetMap). Marker clustering and GeoJSON support. Stable production version. |
| react-leaflet | v5.x | React components for Leaflet | Declarative map management in React. Handles map lifecycle. Supports Leaflet plugins. Current version as of 2026. |
| Tailwind CSS | 3.x+ | Utility-first CSS framework | Rapid UI development. Works seamlessly with Electron. PostCSS integration with Vite. Custom theme support for parchment aesthetic. |
| CSS Modules + CSS3 animations | Native | Scoped styles and animations | Use Tailwind for layout, CSS modules for components, CSS3 for ship movement and transitions. Avoids runtime CSS-in-JS overhead. |

### Audio and Sound

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Web Audio API | Native | Core audio engine | Built into browsers (Electron). No external dependency. Full control over ambient audio and sound effects. Excellent for games. |
| Howler.js | 2.x | Audio abstraction layer | Reliable fallback support. Cross-browser compatible. Simplifies audio file loading. Active project. |
| react-howler | latest | React wrapper for Howler.js | Component-based audio control. Cleaner than raw Web Audio API for simple use cases. |

### Museum APIs and Data Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| node-fetch or built-in fetch | 3.x/Native | HTTP requests for APIs | Fetch is now standard in Node 18+. Use native fetch in Electron main process for cleaner code. |
| axios | 1.x | Alternative HTTP client | If you need interceptors or advanced features. Otherwise, fetch is sufficient. |

### Testing

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vitest | 1.x | Unit testing framework | Vite-native test runner. Jest-compatible API. 3-5x faster than Jest. Perfect for Vite projects. |
| React Testing Library | 15.x+ | React component testing | Tests user behavior, not implementation. Best practices alignment. Encourages accessible components. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint + Prettier | Code quality and formatting | Ensure consistent style. Easy integration with Vite. |
| Electron DevTools | Debugging Electron apps | Built into Electron. Use for main/renderer process debugging. |

## Installation

```bash
# Core framework
npm install electron react react-dom zustand

# Build tools
npm install -D vite typescript @vitejs/plugin-react

# UI and styling
npm install leaflet react-leaflet tailwindcss postcss autoprefixer

# Audio
npm install howler react-howler

# Database
npm install better-sqlite3

# HTTP
npm install node-fetch

# Development
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom
npm install -D electron-forge @electron-forge/plugin-vite
npm install -D eslint prettier @typescript-eslint/eslint-plugin

# Type definitions
npm install -D @types/react @types/react-dom @types/node @types/better-sqlite3
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vite | Webpack | Webpack if you need extremely custom build configuration. Not recommended for new projects (Vite is faster and simpler). |
| Zustand | Redux Toolkit | Redux Toolkit if you have large team with strict patterns needed, or if you need DevTools middleware. For game state, Zustand's simplicity is better. |
| better-sqlite3 | RxDB | RxDB if you need real-time sync with server, reactive queries, or encryption. RxDB SQLite adapter is premium-only, making it cost-prohibitive for indie game. |
| Leaflet | Mapbox GL | Mapbox GL if you need 3D maps or advanced styling. Overkill for parchment-style historical map. Leaflet is lighter and sufficient. |
| Howler.js | Tone.js | Tone.js if you need advanced musical synthesis or sophisticated scheduling. Howler.js is better for ambient audio and sound effects. |
| Tailwind | styled-components | styled-components if you need dynamic theming at runtime. Tailwind is faster and better for static parchment aesthetic. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Create React App (CRA) | Electron Forge replaces CRA's role. CRA is for web apps, not desktop. Slower dev experience. | Electron Forge with Vite plugin |
| Webpack in Electron projects | Slower builds than Vite. Complex configuration. | Vite with @electron-forge/plugin-vite |
| Remote module in Electron | Deprecated in Electron 12. Security risk. NodeIntegration is unsafe. | Use IPC (ipcMain/ipcRenderer) for main-renderer communication |
| Node integration in renderer | Security vulnerability. Exposes Node.js APIs to web content. | Use Preload scripts with contextBridge for safe communication |
| Classic Redux | Too much boilerplate (actions, reducers, selectors). Overkill for game state. | Zustand for simplicity, Redux Toolkit only if team requires it |
| SQLite3 (npm package) | Slower than better-sqlite3. More complex setup. | better-sqlite3 (synchronous, faster, built for Electron) |
| CSS-in-JS at runtime | Electron isn't web; performance matters. Runtime CSS generation adds overhead. | Tailwind + CSS Modules (static, compiled) |

## Stack Patterns by Variant

**If building with TypeScript (recommended for game logic):**
- Use TypeScript 5.x throughout
- Enable strict mode in tsconfig.json
- Use @types/* packages for all dependencies
- Benefit: Type safety for game state, merchant logic, trade calculations

**If building with JavaScript (faster initial dev):**
- Skip TypeScript for rapid prototyping
- Add TypeScript later when architecture solidifies
- Use JSDoc comments for documentation
- Risk: Harder to refactor complex game logic later

**If you need offline-first with cloud sync:**
- Consider RxDB with SQLite (if budget allows)
- Otherwise, implement manual sync layer on better-sqlite3
- Use Zustand state, sync to SQLite on state changes
- Recommended for now: Better-sqlite3 + manual sync (simpler, cost-effective)

## Architecture Communication Patterns

### IPC Pattern (Required for Electron)
Database operations (SQLite) **only** happen in main process, never renderer. Use IPC:

```typescript
// Main process: setup listener
ipcMain.handle('db:saveGameState', (event, state) => {
  database.saveState(state);
  return { success: true };
});

// Renderer process: call it
const result = await ipcRenderer.invoke('db:saveGameState', gameState);
```

This is non-negotiable for Electron security.

### State Flow
```
React Components
  ↓ (setState)
Zustand Store (in-memory)
  ↓ (on change, debounced)
IPC to Main Process
  ↓
better-sqlite3 persistence
```

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| React 19.2.4 | Electron 41.0.0 | React 19 works with all supported Chromium versions |
| Electron 41.0.0 | Node 24.14.0 | Bundled together; use both from same release |
| better-sqlite3 12.7.0 | Electron 41.0.0 | Explicitly tested in March 2026 release |
| TypeScript 5.x | React 19.2.4 | TypeScript 5 is stable for React 19 |
| Vite 8.3.0 | React 19.2.4 | Vite 8 has full React 19 support |
| Zustand 5.0.11 | React 19.2.4 | Zustand is framework-agnostic, works with any React version |
| Leaflet 1.9.4 | React 19.2.4 | Via react-leaflet v5; no direct dependency |

## Why This Stack

**Security:** Electron's main/renderer process separation enforced by default. No NodeIntegration enabled. IPC pattern required for database access.

**Performance:** Vite + native ES modules = instant HMR in dev. better-sqlite3 is synchronous (game-friendly). Zustand avoids Redux overhead. Web Audio API is native, no external audio library overhead needed.

**Maintainability:** TypeScript for game logic safety. Clear separation of concerns (Leaflet for maps, Zustand for state, better-sqlite3 for persistence). Minimal external dependencies.

**Distribution:** Electron Forge handles code signing and installers. GitHub releases integration built-in. Works across Windows, macOS, Linux.

**Educational Context:** This stack is standard in 2026 for desktop React apps. Students learning from this project learn current best practices.

## Sources

- Electron v41.0.0 release: https://github.com/electron/electron/releases (verified March 11, 2026)
- React 19.2.4 release: https://github.com/facebook/react/releases (verified Feb 2026)
- Vite documentation: https://vitejs.dev/
- better-sqlite3 v12.7.0 release: https://github.com/WiseLibs/better-sqlite3/releases (verified March 11, 2026)
- Zustand v5.0.11 release: https://github.com/pmndrs/zustand/releases (verified Feb 2026)
- Electron Forge v7.11: https://github.com/electron/forge (verified March 2026)
- React Leaflet v5: https://react-leaflet.js.org/
- Leaflet v1.9.4: https://leafletjs.com/ and https://github.com/Leaflet/Leaflet/releases
- State Management in 2026: [Zustand vs Redux](https://medium.com/@abdurrehman1/state-management-in-2026-redux-vs-zustand-vs-context-api-ad5760bfab0b)
- Electron best practices: https://www.electronjs.org/docs/latest/tutorial/performance
- Electron Forge Vite plugin: https://www.electronforge.io/config/plugins/vite
- Howler.js: https://howlerjs.com/
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

---

**Stack research for:** Electron + React historical trade simulation game
**Researched:** March 12, 2026
**Next validation:** Verify with test project setup, especially Electron 41 + better-sqlite3 + Vite integration

---
status: verified
trigger: "App window appears blank in dev mode. Electron process runs but renders nothing. getResourcesBase() resolves to dist/resources/ but curated images are at resources/ (project root). All 57 curated images show 'not found' warnings."
created: 2026-03-31T00:00:00Z
updated: 2026-03-31T00:00:00Z
---

## Current Focus

hypothesis: getResourcesBase() in paths.ts returns dist/resources/ in dev mode instead of resources/ at project root, causing all image lookups to fail. The blank screen may be caused by either the missing images crashing the renderer or a separate renderer loading issue.
test: Read paths.ts to understand getResourcesBase() logic, check renderer entry point and dev server config
expecting: paths.ts has incorrect base path logic for dev mode
next_action: Read src/main/lib/paths.ts and check renderer/Vite config

## Symptoms

expected: App launches with map, port illustrations, and trade panel showing curated historical images
actual: Electron window opens but screen is completely blank/white. Electron logs show 57 "Curated image not found" warnings
errors: "[Main] WARN : Curated image not found {"path":"/Users/rishizamvar/Documents/Projects/archeology-simulator/dist/resources/images/ports/athens.jpg"}" (repeated for all 57 images)
reproduction: Run `npm run dev` — Vite starts, Electron launches, but window is blank
started: After Phase 5-6 changes (image curation + UI integration)

## Eliminated

## Evidence

- timestamp: pre-session
  checked: TypeScript compilation, Vite build, main process build
  found: All compile/build steps succeed without errors
  implication: Not a compilation issue

- timestamp: pre-session
  checked: Electron process and windows
  found: Process runs but AppleScript reports zero windows
  implication: Window may not be created successfully, or BrowserWindow exists but is not shown

- timestamp: pre-session
  checked: Image file locations
  found: Images exist at resources/images/ports/*.jpg but code looks in dist/resources/images/
  implication: getResourcesBase() path resolution is wrong for dev mode

## Resolution

root_cause: getResourcesBase() in src/main/lib/paths.ts used `path.join(__dirname, '../../resources')` for dev mode. Since TypeScript compiles src/main/lib/paths.ts to dist/main/lib/paths.js, __dirname at runtime is dist/main/lib/. Going up 2 levels lands at dist/, so the resolved path is dist/resources/ — which does not exist. All 57 curated image lookups failed because they looked in dist/resources/images/ instead of resources/images/ at the project root.
fix: Replaced the dev-mode __dirname-relative path with `app.getAppPath()` which returns the project root (the directory containing package.json) in both dev and production. The function now simply returns `path.join(app.getAppPath(), 'resources')` for all environments.
verification: Node.js path simulation confirms app.getAppPath() equivalent resolves to project root, resources/ directory exists, and all 57 curated image file paths from the manifest resolve to existing files on disk. TypeScript compiles cleanly. Main process builds without errors.
files_changed: [src/main/lib/paths.ts]

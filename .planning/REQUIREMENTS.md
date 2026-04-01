# Requirements: v2.0.1 Polish & Stabilization

## Test Stabilization

- [ ] **TEST-01**: All existing unit tests pass (fix 54 broken tests from SET_SAIL, quest, and schema changes)
- [ ] **TEST-02**: TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [ ] **TEST-03**: Build-time dialogue validation passes (`npm run data:validate`)
- [ ] **TEST-04**: End-to-end game flow works: new game → intro → Piraeus port → buy pottery → sail to Tyre → arrive → quest advances

## Code Cleanup

- [ ] **CLEAN-01**: Remove dead code, unused imports, and stale comments across all files
- [ ] **CLEAN-02**: Consolidate duplicated logic (e.g., port name formatting, IPC error handling)
- [ ] **CLEAN-03**: Fix any TypeScript `any` casts with proper types where feasible

## UI Polish

- [ ] **UI-01**: Smooth transitions between screens (title → intro → game, port → sailing → port)
- [ ] **UI-02**: Better image framing in trade panel and port scenes (proper aspect ratios, rounded corners, consistent sizing)
- [ ] **UI-03**: Improved port info panel layout (less cramped, better typography hierarchy)
- [ ] **UI-04**: Dialogue modal polish (portrait sizing, text spacing, choice button styling)
- [ ] **UI-05**: Sailing overlay refinement (better positioning, clearer progress indicator)
- [ ] **UI-06**: Quest panel styling (better status badges, clearer objective hierarchy)

## Game Flow

- [ ] **FLOW-01**: Sailing animation plays smoothly with correct route from departure to destination
- [ ] **FLOW-02**: Double-click skip works reliably without crashes
- [ ] **FLOW-03**: Port arrival properly unlocks neighbors and shows first-visit content
- [ ] **FLOW-04**: Quest progression works end-to-end (buy → deliver → complete → next quest activates)

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| TEST-01 | TBD | Planned |
| TEST-02 | TBD | Planned |
| TEST-03 | TBD | Planned |
| TEST-04 | TBD | Planned |
| CLEAN-01 | TBD | Planned |
| CLEAN-02 | TBD | Planned |
| CLEAN-03 | TBD | Planned |
| UI-01 | TBD | Planned |
| UI-02 | TBD | Planned |
| UI-03 | TBD | Planned |
| UI-04 | TBD | Planned |
| UI-05 | TBD | Planned |
| UI-06 | TBD | Planned |
| FLOW-01 | TBD | Planned |
| FLOW-02 | TBD | Planned |
| FLOW-03 | TBD | Planned |
| FLOW-04 | TBD | Planned |

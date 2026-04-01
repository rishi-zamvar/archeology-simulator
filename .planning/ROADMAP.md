# Roadmap: Archeology Simulator

# 🚧 v2.0.1 Polish & Stabilization

### Phase 21: Test Stabilization & Code Cleanup
**Goal**: All tests pass, TypeScript clean, dead code removed, logic simplified
**Depends on**: Phase 20 (v2.0 complete)
**Requirements**: TEST-01, TEST-02, TEST-03, CLEAN-01, CLEAN-02, CLEAN-03
**Success Criteria** (what must be TRUE):
  1. `npx vitest run` exits with 0 failures
  2. `npx tsc --noEmit` produces zero errors
  3. No `any` casts in production code (tests exempted)
  4. No unused imports or dead functions detected by linter
**Plans**: TBD

### Phase 22: Game Flow Validation
**Goal**: End-to-end game flow works reliably without crashes or broken state
**Depends on**: Phase 21
**Requirements**: TEST-04, FLOW-01, FLOW-02, FLOW-03, FLOW-04
**Success Criteria** (what must be TRUE):
  1. New Game → intro → Piraeus → buy pottery → sail to Tyre → arrive completes without errors
  2. Sailing animation shows correct route from departure port to destination with smooth motion
  3. Double-click skip arrives at destination without V8 crash
  4. Quest objectives advance correctly on trade/arrival/dialogue actions
  5. Port neighbors unlock on arrival and map markers update
**Plans**: TBD

### Phase 23: UI Polish & Immersion
**Goal**: The game looks and feels polished — smooth transitions, better layouts, immersive design
**Depends on**: Phase 22
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. Screen transitions (title→intro→game, port→sailing→port) use CSS fade/slide animations
  2. Trade panel images have consistent aspect ratios with rounded corners and proper spacing
  3. Port info panel has clear typography hierarchy with comfortable reading spacing
  4. Dialogue modal shows NPC portrait at proper size with balanced text layout
  5. Sailing overlay is clearly visible without obstructing the map
  6. Quest panel has polished status badges and clear visual hierarchy
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 21. Test Stabilization | v2.0.1 | 0/? | Not started | - |
| 22. Game Flow | v2.0.1 | 0/? | Not started | - |
| 23. UI Polish | v2.0.1 | 0/? | Not started | - |

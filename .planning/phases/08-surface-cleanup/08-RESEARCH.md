# Phase 8: Surface Cleanup - Research

**Researched:** 2026-03-31
**Domain:** Electron renderer error handling, TypeScript strictness, ESLint hygiene
**Confidence:** HIGH

## Summary

Phase 8 covers three cleanup requirements: graceful IPC error display (ERR-03), zero tsc errors (CLN-01), and eslint-disable audit (CLN-02). The codebase is already well-structured from Phase 7's IPCResponse<T> work -- most hooks already capture errors into state. The main gaps are: (1) several IPC call sites in Shell.tsx silently swallow failures with empty `.catch(() => {})`, (2) three tsc errors in ShipMarker.tsx from a MotionLayer interface that incorrectly extends L.Layer, and (3) five eslint-disable comments that need justification review.

**Primary recommendation:** Add a global error toast component (like the existing eventToast pattern in Shell.tsx), fix the MotionLayer type to not extend L.Layer, and audit each eslint-disable for justification.

## Standard Stack

No new libraries needed. This phase works entirely with existing code.

### Core (Already in Project)
| Library | Purpose | Relevance |
|---------|---------|-----------|
| React 18 | UI rendering | Error toast component |
| TypeScript 5.x | Type checking | Fix tsc errors |
| Leaflet + leaflet.motion | Map animation | Fix MotionLayer types |
| ESLint | Linting | Audit disable comments |
| Zustand | State management | Potential error state store |

## Architecture Patterns

### Pattern 1: Error Toast Component
**What:** A reusable toast notification that appears when any IPC call fails, using the same pattern as the existing `eventToast` in Shell.tsx.
**When to use:** Any IPC failure that should be visible to the user.

The codebase already has this pattern at Shell.tsx lines 376-401 (eventToast). Extend this into a reusable component or add error toast state to the existing uiStore.

```typescript
// In uiStore.ts - add error toast state
interface UIState {
  // ... existing fields ...
  errorToast: string | null;
  showError: (message: string) => void;
  clearError: () => void;
}
```

### Pattern 2: Duck-Typed Interface (No Inheritance)
**What:** For leaflet.motion's MotionLayer, use a standalone interface instead of extending L.Layer. The `on` method signature conflict arises because L.Layer has dozens of overloaded `on` signatures that require specific event handler parameter types.
**When to use:** When wrapping untyped JS libraries that attach to global objects.

```typescript
// Instead of: interface MotionLayer extends L.Layer { ... }
// Use a standalone type with only the methods we call:
interface MotionLayer {
  motionStart: () => void;
  motionStop: () => void;
  on: (event: string, fn: (...args: unknown[]) => void) => MotionLayer;
  addTo: (map: L.Map) => MotionLayer;
  remove: () => MotionLayer;
}
```

### Anti-Patterns to Avoid
- **Silent catch blocks:** `.catch(() => {})` hides IPC failures from users. Always at minimum log the error or show a toast.
- **Extending typed interfaces for untyped libraries:** Extending L.Layer forces compatibility with all 50+ overloaded method signatures. Use duck typing instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error display | Custom error modal system | Extend existing eventToast pattern in Shell.tsx | Already styled, positioned, and auto-dismissing |
| Error state management | Per-component error state | uiStore.errorToast (Zustand) | Central place for error display, already used for UI state |

## Common Pitfalls

### Pitfall 1: MotionLayer Extending L.Layer
**What goes wrong:** The `on` method in MotionLayer uses `fn: () => void` (no params), but L.Layer requires `fn: (e: LeafletEvent) => void` (1+ params). TypeScript correctly rejects this as incompatible.
**Why it happens:** leaflet.motion has no TS types; the developer tried to give it types by extending L.Layer.
**How to avoid:** Don't extend L.Layer. Use a standalone interface with only the methods actually called. Use `as unknown as MotionLayer` at the creation site.
**Warning signs:** tsc error TS2430 (incorrectly extends interface) and TS2345 (not assignable to parameter type).

### Pitfall 2: Silent .catch(() => {}) Blocks
**What goes wrong:** IPC failures are swallowed silently. The user sees nothing when database errors, network issues, or state corruption occur.
**Why it happens:** During development, catch blocks are added as "TODO" placeholders that never get revisited.
**How to avoid:** Every catch block should either: (a) show a user-facing error toast, (b) have a written justification for why the failure is truly non-fatal.
**Warning signs:** Empty arrow functions in `.catch()`.

### Pitfall 3: useCallback with Stale Closures
**What goes wrong:** The TradePanel eslint-disable comments suppress react-hooks/exhaustive-deps warnings. The `getQty` and `setMsg` functions are captured in closures but not listed in deps.
**Why it happens:** Listing all deps would cause excessive re-renders; the developer intentionally captures a snapshot.
**How to avoid:** Either add a justification comment, or refactor to use refs for the mutable state that shouldn't trigger re-renders.

### Pitfall 4: Removing MotionLayer from Map
**What goes wrong:** When removing the MotionLayer, if we change the type to not extend L.Layer, we may need to adjust call sites that pass it to Leaflet methods expecting L.Layer.
**How to avoid:** Check lines 86 and 126 in ShipMarker.tsx where MotionLayer is passed to map methods. Use type assertions at those specific call sites.

## Code Examples

### ERR-03: IPC Error Sites Audit

**Sites that ALREADY handle errors visually (no action needed):**

| File | How Errors Display |
|------|-------------------|
| `App.tsx:19-42` | Error banner at top of screen when game load fails |
| `MapArea.tsx:39-48` | Full-component error message when port data fails to load |
| `PortInfoPanel.tsx:195` | Inline error message in panel |
| `EventCard.tsx:58-59` | Shows error as result text in modal |
| `TradePanel.tsx:88-89, 105-106` | Inline error feedback per-good row |
| `useTradeState.ts:54` | Sets error state (BUT this error is never displayed in Shell.tsx) |
| `useGameState.ts:42` | Sets error state, displayed by App.tsx banner |
| `useMapPorts.ts:36` | Sets error state, displayed by MapArea error div |

**Sites that SILENTLY SWALLOW errors (need fixing for ERR-03):**

| File | Line | Code | Assessment |
|------|------|------|------------|
| `Shell.tsx:94` | `.catch(() => {/* non-fatal: ship marker just won't animate */})` | Arguably non-fatal but should log. Justification comment exists. |
| `Shell.tsx:110` | `.catch(() => {/* non-fatal */})` | getPendingEvent failure -- event just won't show. Could warrant toast. |
| `Shell.tsx:128-133` | `void window.api.game.action(...)` -- no catch at all | SET_SAIL action fire-and-forget. State will sync via subscription but error invisible. |
| `TutorialModal.tsx:40` | `.catch(() => {/* Non-fatal */})` | Tutorial advance -- state syncs via subscription. Justifiable. |
| `TutorialModal.tsx:46` | `.catch(() => {/* Non-fatal */})` | Tutorial skip -- same rationale. Justifiable. |
| `MapArea.tsx:32` | `.catch(() => {/* Non-fatal */})` | START_TRADE action -- comment explains panels still show data. |
| `useResourceImages.ts:128` | `console.error(...)` | Logs but user sees nothing. Non-critical (images). |
| `useTradeState.ts:54` | `setError(...)` | Sets error but Shell.tsx NEVER reads or displays `useTradeState().error`. **Gap.** |

### CLN-01: TypeScript Error Fix

All 3 tsc errors are in `ShipMarker.tsx` and stem from the same root cause:

```
TS2430 at line 23: interface MotionLayer incorrectly extends L.Layer
TS2345 at line 86: MotionLayer not assignable to Layer parameter
TS2345 at line 126: MotionLayer not assignable to Layer parameter
```

**Fix:** Replace the interface definition and adjust usage sites:

```typescript
// New standalone interface (line 23 area):
interface MotionLayer {
  motionStart: () => void;
  motionStop: () => void;
  on: (event: string, fn: (...args: unknown[]) => void) => MotionLayer;
  addTo: (map: L.Map) => MotionLayer;
  remove: () => MotionLayer;
}

// At creation site, cast result:
const layer = (LMotion as LeafletWithMotion).motion.polyline(
  latlngs, pathOptions, motionOptions, markerOptions
) as unknown as MotionLayer;

// At map.addLayer/removeLayer calls (lines 86, 126), use type assertion:
map.addLayer(motionRef.current as unknown as L.Layer);
map.removeLayer(motionRef.current as unknown as L.Layer);
```

### CLN-02: ESLint Disable Audit

| File | Line | Rule | Current Justification | Verdict |
|------|------|------|-----------------------|---------|
| `queries.ts:691` | `@typescript-eslint/no-require-imports` | None written | **JUSTIFIED** -- `require()` needed for synchronous JSON import in CJS context; add justification comment |
| `preload.ts:23` | `@typescript-eslint/no-require-imports` | None written | **JUSTIFIED** -- conditional require for Electron APIs to allow unit testing outside Electron; add justification comment |
| `Shell.tsx:103` | `react-hooks/exhaustive-deps` | None written | **JUSTIFIED** -- intentionally depends only on `tradingState?.selectedPort` not the full tradingState object to avoid infinite re-render loop; add justification comment |
| `TradePanel.tsx:94` | `react-hooks/exhaustive-deps` | None written | **NEEDS REVIEW** -- `getQty` and `setMsg` are closures that capture state. Could potentially refactor with useRef. If kept, add justification. |
| `TradePanel.tsx:111` | `react-hooks/exhaustive-deps` | None written | **NEEDS REVIEW** -- same pattern as line 94. Same verdict. |

**Summary:** 0 removable suppressions (all are genuinely needed), but all 5 lack written justifications. The fix is to add explanatory comments to each.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Extending library types with `extends` | Duck-typed standalone interfaces for untyped JS | Avoids impossible type compatibility requirements |
| Silent .catch() blocks | Error toasts + justification comments | Users see failures; code is self-documenting |

## Open Questions

1. **useTradeState error display gap**
   - What we know: `useTradeState` returns an `error` field, but Shell.tsx destructures only `{ marketGoods, inventory, transactions }` and never checks error.
   - What's unclear: Whether trade data load failures should show a toast, an inline panel message, or an App-level banner.
   - Recommendation: Show error in the TradePanel area since it's contextual to trading. Could add a small error banner inside the trade panel float div.

2. **SET_SAIL fire-and-forget in Shell.tsx**
   - What we know: Line 128 uses `void window.api.game.action(...)` with no error handling at all.
   - What's unclear: Whether this should show an error or if the subscription-based state sync is sufficient.
   - Recommendation: Add `.catch()` with error toast -- if SET_SAIL fails, the user should know navigation didn't start.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all renderer files
- `npx tsc --noEmit` output showing exact errors
- `grep` for all eslint-disable comments

### Confidence Assessment
All findings are from direct code inspection -- no external research needed for this phase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, existing code only
- Architecture: HIGH -- extending existing eventToast pattern
- Pitfalls: HIGH -- errors identified from actual tsc output and code reading
- ESLint audit: HIGH -- every instance enumerated and analyzed

**Research date:** 2026-03-31
**Valid until:** Indefinite (codebase-specific findings, not library-version-dependent)

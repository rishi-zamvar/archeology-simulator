---
phase: 12-trade-ux-title-screen
verified: 2026-03-31T23:00:00Z
status: passed
score: 9/9 must-haves verified
---

# Phase 12: Trade UX & Title Screen Verification Report

**Phase Goal:** Players see profit/loss before confirming trades and encounter a proper entry screen when launching the game
**Verified:** 2026-03-31T23:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Each cargo item in the trade panel shows a green or red profit/loss indicator per unit | VERIFIED | `TradePanel.tsx` line 258: `color: profitPerUnit > 0 ? '#2b5c4a' : profitPerUnit < 0 ? '#8b2e2e' : '#7a5c45'` |
| 2 | Total profit/loss preview updates as the player adjusts the sell quantity | VERIFIED | `TradePanel.tsx` line 240: `const totalPL = profitPerUnit * qty` where `qty = getQty(good.id)` — reactive state from quantity stepper |
| 3 | Player can see where each cargo item was originally purchased | VERIFIED | `TradePanel.tsx` lines 266-274: renders `{batch.quantity}x bought at {portLabel} for {batch.boughtAtPrice}g{turnLabel}` per batch |
| 4 | Launching the game shows a title screen instead of jumping straight into gameplay | VERIFIED | `Shell.tsx` line 263: `if (screen === 'title') { return <TitleScreen .../>; }` — initial state is `'title'` |
| 5 | Title screen displays game title and Mediterranean merchant description | VERIFIED | `TitleScreen.tsx` lines 60-91: "Mare Nostrum" h1 + description paragraph present |
| 6 | New Game button is always visible on the title screen | VERIFIED | `TitleScreen.tsx` lines 117-123: New Game button rendered unconditionally |
| 7 | Continue button appears only when a save exists | VERIFIED | `TitleScreen.tsx` lines 108-116: `{hasSave && (<button>Continue</button>)}` |
| 8 | Clicking Continue loads the saved game and transitions to gameplay | VERIFIED | `Shell.tsx` line 79: `handleContinue` sets `screen` to `'game'`; `useGameState` already loaded in background |
| 9 | Clicking New Game resets all data and starts fresh | VERIFIED | `save.ts` lines 87-95: transaction deletes all 4 tables (`game_state`, `transaction_history`, `journal_entries`, `player_inventory`) then re-inserts INITIAL_STATE |

**Score:** 9/9 truths verified

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/shared/game-types.ts` | CargoItem with boughtAtTurn field | VERIFIED | Line 59: `boughtAtTurn?: number` present in CargoItem interface |
| `src/renderer/components/TradePanel.tsx` | P&L indicators per cargo row | VERIFIED | Lines 234-277: IIFE block computes `profitPerUnit`, `avgPurchasePrice`, `totalPL` and renders them; 425 lines total — substantive |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/renderer/components/TitleScreen.tsx` | Title screen component (min 40 lines) | VERIFIED | 127 lines; full component with game title, subtitle, description, flavor quote, conditional Continue + always-visible New Game |
| `src/main/ipc/save.ts` | game:hasSave and game:newGame IPC handlers | VERIFIED | Lines 74 and 85: both handlers registered; newGame clears all 4 tables transactionally |
| `src/shared/ipc-types.ts` | hasSave and newGame in IPCBridge | VERIFIED | Lines 64-65: `hasSave: () => Promise<IPCResponse<boolean>>` and `newGame: () => Promise<IPCResponse<...>>` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `TradePanel.tsx` | `CargoItem.boughtAtPrice` | weighted average comparison with `MarketGood.currentPrice` | VERIFIED | `totalCost = reduce(... c.boughtAtPrice ...)`; `profitPerUnit = good.currentPrice - avgPurchasePrice` — pattern matches `boughtAtPrice` and `currentPrice` in same computation block |
| `Shell.tsx` | `TitleScreen.tsx` | screen state gating | VERIFIED | Line 263: `if (screen === 'title')` gates rendering; `useState<'title' \| 'game'>('title')` initializes to title |
| `TitleScreen.tsx` | `window.api.game.hasSave` | IPC call on mount in Shell | VERIFIED | `Shell.tsx` line 73: `window.api.game.hasSave().then(res => { if (res.success) setHasSave(res.data); })` inside `useEffect([], [])` |
| `save.ts` | `game_state` table | SQL check for existing save | VERIFIED | `db.prepare('SELECT 1 FROM game_state WHERE id = 1').get()` — returns boolean presence |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `TradePanel.tsx` | `profitPerUnit` / `totalPL` | `inventory.cargoItems` (prop from parent) + `good.currentPrice` (prop from parent) | Yes — derived from real CargoItem records and live market price passed as props | FLOWING |
| `TitleScreen.tsx` | `hasSave` | `window.api.game.hasSave()` → `SELECT 1 FROM game_state WHERE id = 1` in save.ts | Yes — real SQL query against database | FLOWING |
| `TradePanel.tsx` | `cargoForGood` / provenance rows | `inventory.cargoItems.filter(c => c.goodId === good.id)` | Yes — live cargo items with `boughtAtPort`, `boughtAtPrice`, `boughtAtTurn` from DB JSON column | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `boughtAtTurn` populated in buyGood | `grep "boughtAtTurn: turn" src/main/db/queries.ts` | Found at line 525 | PASS |
| `boughtAtTurn` populated in salvaged event cargo | `grep "boughtAtTurn: eventTurn" src/main/ipc/game.ts` | Found at line 452 | PASS |
| TypeScript compiles clean | `npx tsc --noEmit` | No output — exit 0 | PASS |
| profitPerUnit computed from boughtAtPrice vs currentPrice | grep on TradePanel.tsx | `profitPerUnit = good.currentPrice - avgPurchasePrice` confirmed | PASS |
| newGame deletes all 4 required tables | grep on save.ts | DELETE FROM game_state, transaction_history, journal_entries, player_inventory all present | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| TRD-01 | Plan 01 | Profit/loss per item shown (green/red) before confirming a sale | SATISFIED | `TradePanel.tsx` lines 254-264: P&L indicator with green `#2b5c4a` / red `#8b2e2e` colors rendered before the Buy/Sell buttons |
| TRD-02 | Plan 01 | Total profit/loss preview for the quantity being sold | SATISFIED | `TradePanel.tsx` line 240 + 263: `totalPL = profitPerUnit * qty` rendered as `(+Xg for N)` — reactive to stepper |
| TRD-03 | Plan 01 | Purchase price history shown for each cargo item (where and when bought) | SATISFIED | `TradePanel.tsx` lines 266-274: per-batch provenance showing port, price, and optional turn number |
| UI-01 | Plan 02 | Entry screen with game description, continue (if save exists), and new game option | SATISFIED | `TitleScreen.tsx` full component; Shell.tsx gates on `screen === 'title'`; Continue conditional on `hasSave`; New Game always visible |

**No orphaned requirements.** All four IDs (TRD-01, TRD-02, TRD-03, UI-01) declared in plan frontmatter map directly to REQUIREMENTS.md entries and traceability table. No Phase 12 requirements appear in REQUIREMENTS.md that are absent from the plans.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

No TODO/FIXME/placeholder comments, no empty implementations, no hardcoded empty arrays/objects flowing to rendered output, no stub handlers in any phase 12 modified file.

---

## Human Verification Required

### 1. P&L Color Rendering in Trade Panel

**Test:** Launch game, play through to a port, buy some goods, then open the trade panel at a second port where the market price differs.
**Expected:** Carried goods show a green indicator (+Xg/unit) when current price exceeds purchase price, red indicator when current price is below purchase price, and the total (Xg for N) updates when you adjust the quantity stepper.
**Why human:** Color correctness and reactive update behavior require visual inspection in the running Electron app.

### 2. Title Screen First Launch

**Test:** Delete any existing save (or run on a fresh profile), then launch the app.
**Expected:** Title screen appears first with "Mare Nostrum" heading, description paragraph, flavor quote, and only a "New Game" button (no Continue button).
**Why human:** Verifying the absence of the Continue button on a clean launch requires the running app.

### 3. Title Screen with Existing Save

**Test:** Start a new game, play one turn, quit the app, and relaunch.
**Expected:** Title screen shows both "New Game" and "Continue" buttons. Clicking Continue resumes the game from the point of exit.
**Why human:** Save detection across launch cycles requires the running app and filesystem state.

### 4. New Game Reset

**Test:** From title screen with an existing save, click "New Game".
**Expected:** All prior progress is wiped — gold, cargo, journal entries, and transaction history are reset to initial state. Tutorial starts from the beginning.
**Why human:** Verifying complete data reset requires confirming database state through gameplay observation.

---

## Gaps Summary

No gaps found. All 9 observable truths pass verification at all four levels (exists, substantive, wired, data-flowing). All four requirement IDs are fully satisfied with concrete implementation evidence. TypeScript compiles cleanly. No anti-patterns detected in phase-modified files.

---

_Verified: 2026-03-31T23:00:00Z_
_Verifier: Claude (gsd-verifier)_

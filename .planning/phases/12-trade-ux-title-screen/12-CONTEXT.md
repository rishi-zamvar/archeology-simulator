# Phase 12: Trade UX & Title Screen - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode — all decisions at Claude's discretion)

<domain>
## Phase Boundary

Two features: (1) Trade profit/loss preview in TradePanel showing per-unit and total P&L before confirming sales, with purchase history visibility; (2) Title screen shown on app launch with game description, new game, and continue (if save exists).

Requirements: TRD-01, TRD-02, TRD-03, UI-01

</domain>

<decisions>
## Implementation Decisions

### Profit/Loss Display
- Show green/red indicator per cargo item in TradePanel for profit (current price > purchase price) or loss
- Display purchase port and turn for each cargo item (from transaction_history or cargo metadata)
- Total P&L preview updates dynamically as quantity slider changes
- Use existing transaction_history table to look up original purchase price per good

### Cargo Purchase History
- Add purchase_price and purchase_port fields to cargo items (either in cargo_json or via transaction_history lookup)
- IPC channel to retrieve purchase details for current cargo

### Title Screen
- New TitleScreen component shown when no game state is loaded or on fresh launch
- Parchment-themed with game title, brief Mediterranean merchant description
- "New Game" button always visible
- "Continue" button visible only if a save exists (check via IPC)
- After clicking Continue, load saved state and transition to normal game view
- After New Game, reset game state and start fresh

### Claude's Discretion
- Title screen layout, typography, and imagery
- Whether to show a historical quote or flavor text
- Animation/transition from title screen to game
- Exact P&L display format (percentage vs absolute vs both)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- TradePanel.tsx: existing trade UI with buy/sell buttons, quantity steppers, curated images
- transaction_history table: stores all trades with turn, port, good, action, qty, price
- useTradeState hook: loads market prices, inventory, transactions
- SplashScreenView in CrateDig project (different project but same developer aesthetic)

### Established Patterns
- Inline React styles with Cinzel/Lora fonts, parchment colors
- IPC wrapHandler for all main process calls
- GameState discriminated union FSM
- Shell.tsx as root layout orchestrator

### Integration Points
- TradePanel.tsx — add P&L indicators to each cargo row
- Shell.tsx — add title screen state before game loads
- game.ts IPC — add hasSave check, newGame reset
- queries.ts — add purchase price lookup function

</code_context>

<specifics>
## Specific Ideas

No specific requirements — autonomous mode.

</specifics>

<deferred>
## Deferred Ideas

None — autonomous mode.

</deferred>

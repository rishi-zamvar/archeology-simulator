# Phase 18: Reputation & Trade Integration - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode)

<domain>
## Phase Boundary

Players build trade reputation that modifies their experience without ever gating required content. Qualitative descriptors ("Stranger" to "Proxenos"), price modifiers, and dialogue condition integration.

Requirements: REP-01, REP-02, REP-03

</domain>

<decisions>
## Implementation Decisions

### Reputation Model
- reputation table already created in Phase 13 with port_id, score, last_updated
- Qualitative tiers: Stranger (0-19), Known Trader (20-49), Trusted Partner (50-79), Proxenos (80+)
- Reputation gained from: successful trades, quest completion, NPC conversations
- Reputation never gates required content — only modifies experience

### Price Modifiers
- Better reputation = better prices (up to -20% at Proxenos level)
- Stranger = standard prices, Known = -5%, Trusted = -10%, Proxenos = -20%
- Prices floored at 1g minimum

### Integration Points
- Trade handlers (buyGood/sellGood) — apply reputation price modifier
- Quest completion — award reputation at relevant ports
- Dialogue conditions — NPCs can check reputation level
- UI — show reputation tier in port info panel

### Claude's Discretion
- Exact reputation gain formulas
- Whether reputation decays over time
- How reputation is displayed in the UI

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- reputation table (Phase 13)
- reputation_change effect in dialogue engine
- GameContext with reputation data
- PortInfoPanel for display

### Integration Points
- queries.ts — reputation query functions
- game.ts IPC — price modifier in buy/sell
- dialogue.ts — reputation conditions
- PortInfoPanel.tsx — reputation display

</code_context>

<specifics>
No specific requirements — autonomous mode.
</specifics>

<deferred>
None.
</deferred>

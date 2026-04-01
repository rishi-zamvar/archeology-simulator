# Phase 19: Progressive Port Unlocking - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode)

<domain>
## Phase Boundary

Players discover the Mediterranean progressively. Start with Piraeus + 2-4 nearby ports. Others unlock through trade reputation, quests, and NPC introductions. Fog-of-knowledge model: sail anywhere, but depth varies by unlock status.

Requirements: UNLOCK-01, UNLOCK-02, UNLOCK-03

</domain>

<decisions>
## Implementation Decisions

### Port Access Tiers
- **Unlocked**: Full access — trade, NPC dialogue, lore visible
- **Discovered**: Visible on map, can sail there, basic trade, limited lore
- **Unknown**: Visible on map as "?" marker, can sail there but no trade/NPCs

### Starting Ports (New Game)
- Piraeus/Athens: Unlocked (starting port)
- Corinth: Unlocked (nearby, easy first trade)
- Miletus: Discovered (NPC hints at it)
- All others: Unknown

### Unlocking Methods
- NPC dialogue (port_unlock effect already implemented in Phase 17)
- Trade reputation reaching "Known Trader" tier at a region
- Quest completion rewards
- Visiting a port upgrades it from Unknown → Discovered automatically

### Map Display
- Unknown ports: grey/faded marker with "?" tooltip
- Discovered: normal marker, port name visible
- Unlocked: gold marker, full name + lore indicator

### Claude's Discretion
- Exact visual styling for each tier
- Whether to show distance to unknown ports
- Transition animations on unlock

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- port_access table (Phase 13) with port_id, access_level, unlocked_at
- port_unlock effect in dialogue IPC (Phase 17)
- PortMarker.tsx for marker rendering
- getReachablePorts in voyage.ts

### Integration Points
- PortMarker.tsx — visual styling per access level
- PortInfoPanel.tsx — gate lore/trade by access level
- Shell.tsx — gate NPC buttons by access level
- getReachablePorts — show all ports but indicate access level

</code_context>

<specifics>
No specific requirements — autonomous mode.
</specifics>

<deferred>
None.
</deferred>

# Phase 17: NPC Characters & Dialogue Content - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode)

<domain>
## Phase Boundary

Create 5 key NPC characters with historically grounded dialogue trees that give quests, share educational lore, and reveal new ports. Each NPC has a portrait, distinct personality, and branching dialogue.

Requirements: NPC-01, NPC-03, NPC-04

</domain>

<decisions>
## Implementation Decisions

### The 5 Key NPCs
1. **Nikias** (Athens/Piraeus) — Athenian merchant prince, quest giver, patron. Already has sample dialogue from Phase 14.
2. **Taharqa** (Alexandria/Memphis) — Egyptian grain trader, teaches about Egyptian civilization and Nile trade
3. **Elissa** (Carthage) — Carthaginian ship captain, Phoenician heritage, reveals western Mediterranean ports
4. **Hanno** (Rome/Ostia) — Roman customs official, teaches about Roman trade networks
5. **Aziru** (Antioch/Tyre) — Syrian spice merchant, teaches about Phoenician culture and eastern trade routes

### Dialogue Content
- 5+ dialogue nodes per NPC minimum
- Branches based on quest state, reputation, visited ports
- Educational content woven into natural conversation
- NPCs reveal unknown ports through dialogue (port_unlock effect)
- All references validated by build-time script

### NPC Portraits
- Placeholder portrait images (colored silhouettes or simple styled avatars)
- Displayed in DialogueModal during conversations
- Can be replaced with generated images later

### Claude's Discretion
- Exact dialogue tree structure per NPC
- Which ports each NPC reveals
- Quest connections between NPCs
- Portrait style (SVG silhouettes vs placeholder images)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Dialogue engine (Phase 14) with condition DSL and effect handlers
- DialogueModal component with NPC name display and choice buttons
- resources/data/dialogue/ directory (athens-nikias.json exists)
- Build-time validation script
- quest_update, reputation_change, journal_entry, port_unlock effects

### Integration Points
- resources/data/dialogue/ — add 4 new NPC dialogue files
- DialogueModal.tsx — add portrait display
- quests.json — add NPC-initiated quests
- validate-dialogue.ts — already validates all files in dialogue/

</code_context>

<specifics>
## Specific Ideas

No specific requirements — autonomous mode.

</specifics>

<deferred>
## Deferred Ideas

None — autonomous mode.

</deferred>

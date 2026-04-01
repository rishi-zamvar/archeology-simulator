# Phase 16: Port Content & World Building - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode — all decisions at Claude's discretion)

<domain>
## Phase Boundary

Players experience historically rich, source-cited port content that teaches ancient Mediterranean culture through trade. Expand from 6 ports to 15+ with deep lore, historically accurate trade goods, and ambient descriptions.

Requirements: PORT-01, PORT-02, PORT-03, PORT-04, POLISH-03

</domain>

<decisions>
## Implementation Decisions

### Port Content Structure
- Each port has a JSON data file with: lore (100-200 words), cultural description, regional trade specializations, ambient description (sights/sounds/smells), historical citations
- Port lore sections teach real history: Phoenician alphabet, Athenian democracy, Egyptian grain trade, Carthaginian maritime empire, etc.
- Temporal framing: circa 540-530 BCE (late Archaic period)
- All historical claims must be citable to real sources

### New Ports to Add (15+ total, up from 6)
Historically important Mediterranean ports circa 540 BCE:
- **Greece**: Corinth, Miletus, Knossos (Crete)
- **Phoenicia**: Sidon, Byblos
- **Egypt**: Memphis (Nile delta trade hub)
- **Italy**: Syracuse (Greek colony), Taras/Tarentum
- **Western Med**: Massalia (Marseille), Gades (Cadiz), Emporion (Ampurias)
- **North Africa**: Cyrene, Leptis Magna
- Already exist: Athens/Piraeus, Alexandria, Carthage, Rome/Ostia, Antioch, Tyre

### Trade Goods per Region
- Greece: olive oil, pottery (Attic black-figure), wine, honey
- Phoenicia: purple dye, glass, cedar wood, incense
- Egypt: grain (emmer wheat), papyrus, linen, gold
- Italy: wine, iron, wool
- Iberia: silver, tin, salt, garum (fish sauce)
- North Africa: ivory, grain, silphium (Cyrene's famous herb)

### Ambient Descriptions
- Each port gets a unique arrival description (what merchant sees/hears/smells)
- Historically grounded sensory details
- Displayed on first arrival and in port info panel

### Claude's Discretion
- Exact port selection (aim for 15-20 total)
- Level of historical detail per port
- How to structure the lore JSON schema
- Which trade goods to add vs defer
- Sea route waypoints for new ports

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- resources/data/ports.json (currently 6 ports with lat/lng/region/description)
- resources/data/dialogue/ directory for per-NPC JSON files
- Port seeding in schema.ts
- sea-routes.ts for maritime waypoints
- PortInfoPanel.tsx, PortScene.tsx for port display

### Established Patterns
- JSON data files validated at build time
- Port data loaded via IPC and cached
- Regional grouping for port markers on map

### Integration Points
- ports.json — add new port entries
- sea-routes.ts — add waypoints for new port-to-port routes
- schema.ts — seed new ports in DB
- Trade goods in goods/economy system
- PortInfoPanel — display lore and ambient text
- PortScene — show port-specific content

</code_context>

<specifics>
## Specific Ideas

No specific requirements — autonomous mode.

</specifics>

<deferred>
## Deferred Ideas

None — autonomous mode.

</deferred>

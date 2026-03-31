# Phase 5: Image Sourcing & Curation - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Source public-domain historical images for all 20 ports and all 8 trade goods. Present 2-3 candidates per item for user approval. Download approved images into the app's asset directory and record in the curated_images table. This replaces the existing SVG port placeholders and live Met API artifact images with offline, curated visuals.

**Scope:** 20 ports (7 regions) + 8 trade goods (wheat, olive oil, wine, textiles, spices, bronze, timber, pottery). The existing Phase 5 plans reference only 5 ports and 3 goods — they must be rewritten to cover the full set.

</domain>

<decisions>
## Implementation Decisions

### Source Selection
- Search broadly: Met Open Access, Wikimedia Commons, British Museum, Europeana, AND targeted web searches for specific ports/goods
- Fresh search for everything — do NOT use the existing Met object IDs already in seed data
- Historical accuracy and relevance to the specific location/good are the top priorities
- Visual quality matters but secondary to accuracy and relevance
- Licensing clarity is not a hard requirement — user accepts any public-domain-ish source

### Port Illustrations (20 ports)
- Must be **drawn/illustrated scenes** — paintings, engravings, sketches, etchings, any medium
- Must depict the **specific port city** — no generic regional stand-ins
- Should show the port **in its ancient prime** — artists' reconstructions of the bustling ancient harbor, not ruins
- Harbor/waterfront views preferred, but city panoramas acceptable if no harbor view exists
- Variety across ports is fine — different illustration styles, eras of artwork, mediums are all OK
- No processing/filtering — display in full original color
- Any resolution accepted — images will be scaled to fit
- 2-3 candidates per port for user review

### Trade Good Images (8 goods × 4-5 images each)
- Must be **ancient art depictions** — mosaics, frescoes, vase paintings, reliefs, any ancient medium
- Must show **the good itself** (wheat sheaves, olive branches, wine, etc.) — not people or scenes
- Must be **historically accurate** — medium doesn't matter as long as the depiction is correct
- Target 4-5 images per good, but accept as few as 1 if quality candidates are scarce
- 2-3 candidates per slot for user review

### Approval Workflow
- Present candidates as a **numbered list with inline image previews**
- Each candidate shows: image preview, source URL, attribution/artist, and a note on why it was chosen
- Review all **20 ports first**, then all **8 trade goods**
- User picks favorites by number — anything not picked is rejected
- If no candidates are acceptable, Claude finds 2-3 more from different sources and presents again

### Fallback Strategy
- If no drawn illustration exists for a specific port: **AI-generate** one in **historical illustration style** (18th-19th century engraving/painting conventions)
- If fewer than target ancient art images exist for a trade good: AI-generate in the same style as fallback
- Any AI generation tool that works is acceptable
- AI-generated images are **not labeled differently** — treated the same as historical art
- Minimum 1 image per trade good before moving on

### Claude's Discretion
- Which AI generation tool to use for fallbacks
- Exact search strategies and query terms per port/good
- Order of review within the ports-first, goods-second structure
- Which ancient art medium looks best per good (mosaic vs fresco vs vase painting, etc.)

</decisions>

<specifics>
## Specific Ideas

- User wants Claude to do **specific web searches** to find the best-fit images, not just API queries
- Ports: 7 regions — Greece (Athens, Corinth, Sparta, Miletos, Ephesos, Byzantion, Rhodes, Knossos), Italy (Syracuse, Massalia, Taras, Ostia), North Africa (Carthage, Utica, Leptis Magna), Egypt (Alexandria, Naukratis, Memphis), Levant (Tyre, Sidon, Byblos, Kition, Salamis), Iberia (Emporion, Gadir)
- Trade goods: wheat, olive oil, wine, textiles, spices, bronze, timber, pottery
- "You will show me the pictures and I will choose the number" — user wants a simple pick-by-number flow

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-image-sourcing-curation*
*Context gathered: 2026-03-31*

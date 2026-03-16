# Requirements: v1.1 Integration & macOS Polish

## v1.1 Requirements

### Image Sourcing (IMG)

- [ ] **IMG-01**: Each of the 5 ports has 1 curated historical drawing/illustration (public domain) replacing the programmatic SVG placeholder
- [ ] **IMG-02**: Each of the 3 trade goods has 4-5 curated archaeological artifact photos (public domain) replacing API-fetched images
- [ ] **IMG-03**: All sourced images are verified real (not AI-generated) and user-approved before inclusion in the app

### Image Infrastructure (INFRA)

- [ ] **INFRA-01**: Curated images table in SQLite stores image metadata (file path, attribution, source URL, good/port reference)
- [ ] **INFRA-02**: Curated images bundled as app assets in resources/ directory (offline-first, no API dependency for curated content)
- [ ] **INFRA-03**: UI displays curated local images from database instead of Met Museum API results or SVG fallbacks

## Scope

**Ports (5):** Alexandria, Carthage, Rome (Ostia), Athens (Piraeus), Antioch
**Goods (3):** Grain, Olive Oil, Wine
**Total images:** ~17-20 (5 port + 12-15 goods)
**Sources:** Wikimedia Commons, Met Museum Open Access, British Museum, Europeana — public domain only

## Future Requirements (v1.2+)

- Additional ports (target 40-60)
- Additional trade goods (target 8+)
- Seasonal sailing system
- Political factions
- Ship progression and crew
- Commodity chains
- Captain's journal
- Font bundling

## Out of Scope

- AI-generated imagery — all visuals must be real public domain art
- New ports or goods beyond existing 5 ports / 3 goods
- Gameplay mechanic changes
- Audio changes

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| IMG-01 | — | Pending |
| IMG-02 | — | Pending |
| IMG-03 | — | Pending |
| INFRA-01 | — | Pending |
| INFRA-02 | — | Pending |
| INFRA-03 | — | Pending |

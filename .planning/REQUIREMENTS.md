# Requirements: v1.3 Gameplay Depth & Polish

## v1.3 Requirements

### Seasonal Weather
- [x] **WX-01**: Season (spring/summer/autumn/winter) derived from turn number using Mediterranean calendar
- [x] **WX-02**: Voyage duration modified by seasonal weather (winter slower, summer faster)
- [x] **WX-03**: Voyage event probabilities adjusted by season (storms more likely in winter)
- [x] **WX-04**: Mare clausum warning shown before departing during dangerous winter months

### Captain's Journal
- [x] **JRN-01**: Journal entries persisted in SQLite (survive restart and save/load)
- [x] **JRN-02**: Trades auto-logged (buy/sell with prices, quantities, port)
- [x] **JRN-03**: Voyage events auto-logged (encounters, decisions, outcomes)
- [x] **JRN-04**: Port arrivals and departures auto-logged with calendar dates
- [x] **JRN-05**: Player can write personal notes/reflections in the journal

### Title Screen
- [ ] **UI-01**: Entry screen with game description, continue (if save exists), and new game option

### Sailing Animation
- [ ] **SAIL-01**: Visible dashed route line on map during sailing
- [ ] **SAIL-02**: Animation duration proportional to route distance
- [ ] **SAIL-03**: Map camera pans to follow ship during animation
- [ ] **SAIL-04**: Sailing overlay showing voyage progress, ETA, and weather
- [ ] **SAIL-05**: Time passes visibly during voyage — each time unit triggers an event (including uneventful sailing)

### Trade UX
- [ ] **TRD-01**: Profit/loss per item shown (green/red) before confirming a sale
- [ ] **TRD-02**: Total profit/loss preview for the quantity being sold
- [ ] **TRD-03**: Purchase price history shown for each cargo item (where and when bought)

## Future Requirements

- Political faction system with reputation
- Ship progression and crew management
- Commodity chains (copper + tin = bronze)
- ~40-60 ports (currently 25)
- Bundle fonts for offline use
- CI/CD pipeline
- Test suite

## Out of Scope

- Multiplayer or online features — single-player educational experience
- Mobile/tablet versions — desktop Electron only
- Real-time gameplay — strictly turn-based
- New ports or trade goods — content expansion is a separate milestone

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| WX-01 | Phase 9 | Complete |
| WX-02 | Phase 9 | Complete |
| WX-03 | Phase 9 | Complete |
| WX-04 | Phase 9 | Complete |
| JRN-01 | Phase 10 | Complete |
| JRN-02 | Phase 10 | Complete |
| JRN-03 | Phase 10 | Complete |
| JRN-04 | Phase 10 | Complete |
| JRN-05 | Phase 10 | Complete |
| UI-01 | Phase 12 | Pending |
| SAIL-01 | Phase 11 | Pending |
| SAIL-02 | Phase 11 | Pending |
| SAIL-03 | Phase 11 | Pending |
| SAIL-04 | Phase 11 | Pending |
| SAIL-05 | Phase 11 | Pending |
| TRD-01 | Phase 12 | Pending |
| TRD-02 | Phase 12 | Pending |
| TRD-03 | Phase 12 | Pending |

# Requirements: v1.2 Coding Hygiene

## v1.2 Requirements

### Error Handling

- [ ] **ERR-01**: All IPC handlers wrap database/external calls in try/catch and return consistent error responses
- [ ] **ERR-02**: Standardized IPC response type `{ success: boolean, data?: T, error?: string }` used across all handlers
- [ ] **ERR-03**: Renderer-side IPC calls handle errors gracefully with user-facing feedback

### Architecture

- [ ] **ARCH-01**: Single `resourcesBase` resolution shared across main process (eliminate 3 duplicate computations)
- [ ] **ARCH-02**: IPC handler registration follows uniform pattern: validate input → execute → return typed response

### Debuggability

- [ ] **DBG-01**: Structured logging utility with consistent format (`[module] level: message`) replaces ad-hoc console calls

### Code Cleanup

- [ ] **CLN-01**: Fix ShipMarker.tsx TypeScript errors (MotionLayer interface mismatch)
- [ ] **CLN-02**: Remove or justify all eslint-disable comments

## Future Requirements

None — this is a focused refactoring milestone.

## Out of Scope

- Performance optimization — not the focus of this milestone
- New features or gameplay changes — refactoring only
- Test coverage — separate milestone concern
- CI/CD pipeline setup — separate milestone concern

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| ERR-01 | — | Pending |
| ERR-02 | — | Pending |
| ERR-03 | — | Pending |
| ARCH-01 | — | Pending |
| ARCH-02 | — | Pending |
| DBG-01 | — | Pending |
| CLN-01 | — | Pending |
| CLN-02 | — | Pending |

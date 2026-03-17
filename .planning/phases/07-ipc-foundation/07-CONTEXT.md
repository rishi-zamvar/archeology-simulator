# Phase 7: IPC Foundation - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Refactor all main-process IPC handlers to use a single, consistent contract: typed response envelope, input validation, shared path resolution, structured logging, and a higher-order wrapper function that enforces the pattern. Also replace all ad-hoc console calls with a structured logger on both main and renderer sides.

This is a production-grade refactor — the standard is code that would pass review at Google, Anthropic, or Epic Games. Beautiful, perfectly built, zero shortcuts.

</domain>

<decisions>
## Implementation Decisions

### IPC Response Contract
- Full typed envelope everywhere, no exceptions — even simple getters like getPorts
- Type shape: `{ success: true, data: T } | { success: false, error: string }`
- Every handler validates all inputs before executing — reject bad data at the IPC boundary
- Input validation returns structured error, not a thrown exception

### Handler Wrapper
- Single `wrapHandler()` higher-order function that enforces the contract automatically
- Impossible to register a handler that doesn't follow the pattern
- Wrapper handles: input validation, try/catch, structured response, error logging
- Optional validator function per handler for input constraints

### Error Strictness
- No silent catches anywhere — every suppressed error logs at warn level minimum
- Non-fatal errors keep the "don't crash" behavior but are always visible in logs
- Global `process.on('uncaughtException')` and `process.on('unhandledRejection')` handlers catch everything, log it, keep the app alive
- Zero `catch(() => {})` blocks remain in the codebase

### Logging Approach
- Custom structured logger utility (no external dependency)
- Log levels: debug, info, warn, error
- Format: `[timestamp] [Module] LEVEL: message {context}`
- Module-scoped logger instances: `const log = createLogger('GameIPC')`
- Both main process AND renderer use the same logger interface
- All existing ad-hoc console.log/warn/error calls replaced

### Migration Strategy
- Big-bang refactor — all 15 handlers migrated in one coherent pass
- No half-migrated state, no backward compatibility shims
- Order: create types + logger → create wrapHandler → migrate all handlers → update all renderer call sites
- Single shared `resourcesBase` resolution replaces 3 duplicate computations

### Claude's Discretion
- Exact logger implementation details (timestamp format, color output in dev)
- Whether to split logger into separate file or inline in a lib/ directory
- Exact validation logic per handler (which fields to check, constraint details)
- How to structure the shared resourcesBase utility

</decisions>

<specifics>
## Specific Ideas

- "This should be beautiful code that is perfectly built"
- Production standard: Google, Anthropic, Epic Games level code quality
- Find anything that would not be allowed in traditional production-grade code and fix it
- The `wrapHandler()` pattern shown in discussion should be the template

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-ipc-foundation*
*Context gathered: 2026-03-17*

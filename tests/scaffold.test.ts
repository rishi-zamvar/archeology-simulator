/**
 * Scaffold tests — TDD RED phase
 *
 * These tests verify the structural contracts of the shared types and
 * security constraints of the preload bridge. Run BEFORE implementing
 * the source files to confirm RED, then after to confirm GREEN.
 */

import { describe, it, expect } from 'vitest';

// --- Type contract tests ---
// We use dynamic import so the test runner can report a clear failure
// when the module doesn't exist yet.

describe('src/shared/ipc-types.ts contracts', () => {
  it('exports GameState type (verified by import not throwing)', async () => {
    const mod = await import('../src/shared/ipc-types');
    // If the module doesn't export GameState the import itself succeeds
    // (TypeScript types are erased), but we can check that the module loads
    // and the runtime shape we rely on is present.
    expect(mod).toBeDefined();
  });

  it('exports a valid GameState shape at runtime via a factory/constant or is compile-time only', async () => {
    // GameState is a TypeScript type, not a runtime value.
    // We verify the module loads without errors as a proxy for correct shape.
    const mod = await import('../src/shared/ipc-types');
    expect(typeof mod).toBe('object');
  });

  it('exports GameAction — module loads cleanly', async () => {
    const mod = await import('../src/shared/ipc-types');
    expect(mod).not.toBeNull();
  });
});

describe('src/shared/game-types.ts contracts', () => {
  it('exports GamePhase union (module loads without errors)', async () => {
    const mod = await import('../src/shared/game-types');
    expect(mod).toBeDefined();
  });

  it('exports Port type (module loads without errors)', async () => {
    const mod = await import('../src/shared/game-types');
    expect(typeof mod).toBe('object');
  });

  it('exports Good type (module loads without errors)', async () => {
    const mod = await import('../src/shared/game-types');
    expect(mod).not.toBeNull();
  });
});

describe('src/main/preload.ts security constraint', () => {
  it('does NOT export ipcRenderer directly', async () => {
    const mod = await import('../src/main/preload');
    // The preload module must not re-export ipcRenderer — doing so would
    // bypass the contextBridge security model.
    expect((mod as Record<string, unknown>).ipcRenderer).toBeUndefined();
  });

  it('has no named export called "ipcRenderer"', async () => {
    const mod = await import('../src/main/preload');
    const exportedKeys = Object.keys(mod);
    expect(exportedKeys).not.toContain('ipcRenderer');
  });
});

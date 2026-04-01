/**
 * Dialogue validation tests — NPC-02
 *
 * Tests the build-time validation logic that catches broken references,
 * orphan nodes, and missing required fields in dialogue JSON files.
 */

import { describe, it, expect } from 'vitest';
import { validateDialogueFile } from '../../scripts/validate-dialogue';

const QUEST_IDS = new Set(['main_quest']);

// ── Helper ───────────────────────────────────────────────────────────────────

function makeValidFile(): Record<string, unknown> {
  return {
    npc_id: 'nikias',
    port_id: 'athens',
    root_node: 'greeting',
    nodes: [
      {
        id: 'greeting',
        speaker: 'Nikias',
        text: 'Hello, captain.',
        choices: [
          { text: 'Tell me more.', next: 'details', effects: [] },
        ],
      },
      {
        id: 'details',
        speaker: 'Nikias',
        text: 'The sea is vast.',
        choices: [],
      },
    ],
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('validateDialogueFile', () => {
  it('test_givenValidFile_whenValidate_thenZeroErrors', () => {
    const result = validateDialogueFile(makeValidFile(), QUEST_IDS, 'test.json');
    expect(result.errors).toHaveLength(0);
  });

  it('test_givenBrokenNextRef_whenValidate_thenErrorMentionsBadRef', () => {
    const file = makeValidFile();
    (file.nodes as Array<Record<string, unknown>>)[0].choices = [
      { text: 'Go nowhere', next: 'nonexistent_node', effects: [] },
    ];
    const result = validateDialogueFile(file, QUEST_IDS, 'test.json');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('nonexistent_node') && e.includes('does not exist'))).toBe(true);
  });

  it('test_givenOrphanNode_whenValidate_thenErrorMentionsUnreachable', () => {
    const file = makeValidFile();
    (file.nodes as Array<Record<string, unknown>>).push({
      id: 'orphan_node',
      speaker: 'Ghost',
      text: 'Nobody can reach me.',
      choices: [],
    });
    const result = validateDialogueFile(file, QUEST_IDS, 'test.json');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('orphan_node') && e.includes('unreachable'))).toBe(true);
  });

  it('test_givenMissingSpeaker_whenValidate_thenErrorMentionsMissing', () => {
    const file = makeValidFile();
    const nodes = file.nodes as Array<Record<string, unknown>>;
    delete nodes[0].speaker;
    const result = validateDialogueFile(file, QUEST_IDS, 'test.json');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('missing "speaker"'))).toBe(true);
  });

  it('test_givenMissingText_whenValidate_thenErrorMentionsMissing', () => {
    const file = makeValidFile();
    const nodes = file.nodes as Array<Record<string, unknown>>;
    delete nodes[1].text;
    const result = validateDialogueFile(file, QUEST_IDS, 'test.json');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('missing "text"'))).toBe(true);
  });

  it('test_givenBadRootNode_whenValidate_thenErrorMentionsRootNotExist', () => {
    const file = makeValidFile();
    file.root_node = 'nonexistent_root';
    const result = validateDialogueFile(file, QUEST_IDS, 'test.json');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('root_node') && e.includes('does not exist'))).toBe(true);
  });

  it('test_givenMissingNpcId_whenValidate_thenErrorMentionsMissing', () => {
    const file = makeValidFile();
    delete file.npc_id;
    const result = validateDialogueFile(file, QUEST_IDS, 'test.json');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('npc_id'))).toBe(true);
  });

  it('test_givenUnknownQuestId_whenValidate_thenErrorMentionsQuest', () => {
    const file = makeValidFile();
    const nodes = file.nodes as Array<Record<string, unknown>>;
    nodes[0].conditions = { type: 'quest', id: 'unknown_quest', status: 'active' };
    const result = validateDialogueFile(file, QUEST_IDS, 'test.json');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('unknown_quest'))).toBe(true);
  });

  it('test_givenTerminalNode_whenValidate_thenWarningNotError', () => {
    const result = validateDialogueFile(makeValidFile(), QUEST_IDS, 'test.json');
    // details node has no choices -- should be a warning, not an error
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.some(w => w.includes('terminal node'))).toBe(true);
  });
});

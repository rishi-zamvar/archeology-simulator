/**
 * Build-time validation script for dialogue JSON files.
 *
 * Validates:
 *   - Required fields: npc_id, port_id, root_node, nodes
 *   - Each node has id, speaker, text
 *   - root_node references an existing node ID
 *   - Every choice.next references an existing node ID
 *   - BFS reachability from root_node (flags orphan/unreachable nodes)
 *   - Quest IDs in conditions match entries in quests.json
 *   - Terminal nodes (no choices) are warned about (not errors)
 *
 * Usage: npx tsx scripts/validate-dialogue.ts
 */

import fs from 'fs';
import path from 'path';

// ── Core Validation (exportable for testing) ─────────────────────────────────

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

/**
 * Validate a single dialogue file's data against structural rules.
 * Returns an array of error strings (empty = valid).
 */
export function validateDialogueFile(
  data: Record<string, unknown>,
  questIds: Set<string>,
  fileName: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check top-level required fields
  if (!data.npc_id) errors.push(`${fileName}: missing required field "npc_id"`);
  if (!data.port_id) errors.push(`${fileName}: missing required field "port_id"`);
  if (!data.root_node) errors.push(`${fileName}: missing required field "root_node"`);
  if (!Array.isArray(data.nodes)) {
    errors.push(`${fileName}: missing or invalid "nodes" array`);
    return { errors, warnings };
  }

  const nodes = data.nodes as Array<Record<string, unknown>>;
  const nodeIds = new Set<string>();

  // Check each node has required fields and collect IDs
  for (const node of nodes) {
    if (!node.id) {
      errors.push(`${fileName}: node missing "id"`);
      continue;
    }
    const nodeId = node.id as string;
    nodeIds.add(nodeId);

    if (!node.speaker) errors.push(`${fileName}: node "${nodeId}" missing "speaker"`);
    if (!node.text) errors.push(`${fileName}: node "${nodeId}" missing "text"`);
  }

  // Check root_node exists
  const rootNode = data.root_node as string;
  if (!nodeIds.has(rootNode)) {
    errors.push(`${fileName}: root_node "${rootNode}" does not exist`);
  }

  // Check all choice.next references resolve
  for (const node of nodes) {
    const nodeId = (node.id as string) ?? '(unknown)';
    const choices = (node.choices as Array<Record<string, unknown>>) ?? [];
    for (const choice of choices) {
      const next = choice.next as string;
      if (next && !nodeIds.has(next)) {
        errors.push(`${fileName}: node "${nodeId}" choice references "${next}" which does not exist`);
      }
    }

    // Check quest IDs in conditions
    collectAndValidateQuestIds(node.conditions as Record<string, unknown> | undefined, questIds, fileName, nodeId, errors);

    // Check choice-level conditions too
    for (const choice of choices) {
      collectAndValidateQuestIds(choice.conditions as Record<string, unknown> | undefined, questIds, fileName, nodeId, errors);
    }
  }

  // BFS reachability from root_node — detect orphan/unreachable nodes
  const reachable = new Set<string>();
  const queue: string[] = rootNode ? [rootNode] : [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachable.has(current)) continue;
    reachable.add(current);
    const node = nodes.find(n => n.id === current);
    if (node) {
      const choices = (node.choices as Array<Record<string, unknown>>) ?? [];
      for (const choice of choices) {
        const next = choice.next as string;
        if (next) queue.push(next);
      }
    }
  }
  for (const node of nodes) {
    const nodeId = node.id as string;
    if (nodeId && !reachable.has(nodeId)) {
      errors.push(`${fileName}: node "${nodeId}" is unreachable from root`);
    }
  }

  // Warn about terminal nodes (no choices)
  for (const node of nodes) {
    const choices = (node.choices as Array<Record<string, unknown>>) ?? [];
    if (choices.length === 0) {
      warnings.push(`${fileName}: node "${node.id}" is a terminal node (no choices)`);
    }
  }

  return { errors, warnings };
}

/**
 * Recursively check quest IDs in conditions against known quest IDs.
 */
function collectAndValidateQuestIds(
  condition: Record<string, unknown> | undefined,
  questIds: Set<string>,
  fileName: string,
  nodeId: string,
  errors: string[]
): void {
  if (!condition) return;

  if ('$and' in condition) {
    for (const sub of condition.$and as Array<Record<string, unknown>>) {
      collectAndValidateQuestIds(sub, questIds, fileName, nodeId, errors);
    }
    return;
  }
  if ('$or' in condition) {
    for (const sub of condition.$or as Array<Record<string, unknown>>) {
      collectAndValidateQuestIds(sub, questIds, fileName, nodeId, errors);
    }
    return;
  }
  if ('$not' in condition) {
    collectAndValidateQuestIds(condition.$not as Record<string, unknown>, questIds, fileName, nodeId, errors);
    return;
  }

  if (condition.type === 'quest' && condition.id) {
    const questId = condition.id as string;
    if (!questIds.has(questId)) {
      errors.push(`${fileName}: node "${nodeId}" references unknown quest "${questId}"`);
    }
  }
}

// ── CLI Execution ────────────────────────────────────────────────────────────

function runCLI(): void {
  const dialogueDir = path.resolve(process.cwd(), 'resources/data/dialogue');
  const questsPath = path.resolve(process.cwd(), 'resources/data/quests.json');

  // Load quest IDs for cross-validation
  const questIds = new Set<string>();
  if (fs.existsSync(questsPath)) {
    const questsData = JSON.parse(fs.readFileSync(questsPath, 'utf-8'));
    for (const quest of questsData.quests ?? []) {
      if (quest.id) questIds.add(quest.id);
    }
  }

  if (!fs.existsSync(dialogueDir)) {
    console.error(`Dialogue directory not found: ${dialogueDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(dialogueDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.error('No dialogue JSON files found');
    process.exit(1);
  }

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const file of files) {
    const filePath = path.join(dialogueDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const result = validateDialogueFile(data, questIds, file);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  if (allWarnings.length > 0) {
    console.log('Dialogue validation warnings:');
    allWarnings.forEach(w => console.log(`  - ${w}`));
  }

  if (allErrors.length > 0) {
    console.error('Dialogue validation failed:');
    allErrors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(`Dialogue validation passed (${files.length} file${files.length === 1 ? '' : 's'})`);
}

// Only run CLI when executed directly (not imported as module)
const isDirectExecution = process.argv[1] &&
  (process.argv[1].endsWith('validate-dialogue.ts') ||
   process.argv[1].endsWith('validate-dialogue.js'));

if (isDirectExecution) {
  runCLI();
}

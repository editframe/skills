#!/usr/bin/env tsx
/**
 * Rules Sync System
 *
 * One-way sync from .rules/ (canonical source) to:
 *   - .cursor/rules/*.mdc  (copy with .mdc extension)
 *   - CLAUDE.md             (concatenate alwaysApply: true rules, strip frontmatter)
 *
 * Usage:
 *   npx tsx scripts/sync-rules.ts              # Sync rules
 *   npx tsx scripts/sync-rules.ts --dry-run    # Preview changes
 *   npx tsx scripts/sync-rules.ts --verbose    # Detailed output
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { parseArgs } from 'node:util';

// ============================================================================
// Types
// ============================================================================

interface RuleFile {
  name: string;
  content: string;
  frontmatter: Record<string, string>;
  body: string;
  alwaysApply: boolean;
}

interface SyncOptions {
  dryRun: boolean;
  verbose: boolean;
}

// ============================================================================
// Parsing
// ============================================================================

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    frontmatter[key] = value;
  }

  return { frontmatter, body: match[2] };
}

function serializeFrontmatter(frontmatter: Record<string, string>): string {
  const lines = Object.entries(frontmatter).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

// ============================================================================
// File Discovery
// ============================================================================

async function discoverRules(rulesDir: string): Promise<RuleFile[]> {
  const rules: RuleFile[] = [];

  if (!fsSync.existsSync(rulesDir)) {
    return rules;
  }

  const entries = await fs.readdir(rulesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const filePath = path.join(rulesDir, entry.name);
    const content = await fs.readFile(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    const alwaysApply = frontmatter.alwaysApply === 'true';

    rules.push({
      name: entry.name.replace(/\.md$/, ''),
      content,
      frontmatter,
      body,
      alwaysApply,
    });
  }

  return rules.sort((a, b) => a.name.localeCompare(b.name));
}

// ============================================================================
// Sync Targets
// ============================================================================

async function syncToCursor(root: string, rules: RuleFile[], options: SyncOptions): Promise<number> {
  const cursorDir = path.join(root, '.cursor/rules');
  let count = 0;

  if (!options.dryRun) {
    await fs.mkdir(cursorDir, { recursive: true });
  }

  // Remove existing .mdc files that no longer have a source
  if (fsSync.existsSync(cursorDir)) {
    const existing = await fs.readdir(cursorDir);
    const ruleNames = new Set(rules.map(r => `${r.name}.mdc`));

    for (const file of existing) {
      if (file.endsWith('.mdc') && !ruleNames.has(file)) {
        if (options.verbose) console.log(`  DELETE .cursor/rules/${file}`);
        if (!options.dryRun) {
          await fs.unlink(path.join(cursorDir, file));
        }
        count++;
      }
    }
  }

  // Write each rule as .mdc
  for (const rule of rules) {
    const targetPath = path.join(cursorDir, `${rule.name}.mdc`);
    if (options.verbose) console.log(`  WRITE  .cursor/rules/${rule.name}.mdc`);
    if (!options.dryRun) {
      await fs.writeFile(targetPath, rule.content);
    }
    count++;
  }

  return count;
}

async function syncToClaudeMd(root: string, rules: RuleFile[], options: SyncOptions): Promise<number> {
  const claudeMdPath = path.join(root, 'CLAUDE.md');
  const alwaysApplyRules = rules.filter(r => r.alwaysApply);

  if (alwaysApplyRules.length === 0) {
    if (fsSync.existsSync(claudeMdPath)) {
      if (options.verbose) console.log('  DELETE CLAUDE.md (no alwaysApply rules)');
      if (!options.dryRun) {
        await fs.unlink(claudeMdPath);
      }
    }
    return 0;
  }

  const sections = alwaysApplyRules.map(rule => rule.body.trim());
  const output = sections.join('\n\n---\n\n') + '\n';

  if (options.verbose) {
    console.log(`  WRITE  CLAUDE.md (${alwaysApplyRules.length} rules: ${alwaysApplyRules.map(r => r.name).join(', ')})`);
  }

  if (!options.dryRun) {
    await fs.writeFile(claudeMdPath, output);
  }

  return alwaysApplyRules.length;
}

// ============================================================================
// Logging
// ============================================================================

function log(message: string, color: 'green' | 'yellow' | 'red' | 'blue' = 'blue'): void {
  const colors: Record<string, string> = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[36m',
    reset: '\x1b[0m',
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
      'verbose': { type: 'boolean', default: false },
    },
  });

  const options: SyncOptions = {
    dryRun: values['dry-run'] as boolean,
    verbose: values['verbose'] as boolean,
  };

  const root = process.cwd();
  const rulesDir = path.join(root, '.rules');

  log('\nRules Sync', 'blue');
  log('═══════════════════════════════════════════════════════════', 'blue');

  if (options.dryRun) {
    log('Mode: DRY RUN (no changes made)', 'yellow');
  }

  const rules = await discoverRules(rulesDir);
  log(`Found ${rules.length} rules in .rules/`, 'green');

  const alwaysApply = rules.filter(r => r.alwaysApply);
  const onDemand = rules.filter(r => !r.alwaysApply);
  log(`  alwaysApply: ${alwaysApply.map(r => r.name).join(', ') || '(none)'}`, 'blue');
  log(`  on-demand:   ${onDemand.map(r => r.name).join(', ') || '(none)'}`, 'blue');

  log('\nSyncing to .cursor/rules/', 'blue');
  const cursorCount = await syncToCursor(root, rules, options);

  log('\nSyncing to CLAUDE.md', 'blue');
  const claudeCount = await syncToClaudeMd(root, rules, options);

  log('\n═══════════════════════════════════════════════════════════', 'blue');
  log(`  .cursor/rules/: ${cursorCount} files`, 'green');
  log(`  CLAUDE.md:      ${claudeCount} rules`, 'green');
  log('═══════════════════════════════════════════════════════════', 'blue');
}

main().catch(err => {
  log(`Fatal error: ${err}`, 'red');
  process.exit(1);
});

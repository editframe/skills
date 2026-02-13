#!/usr/bin/env tsx
/**
 * Skills Sync System
 *
 * Bi-directional sync for skills across multiple agent directories.
 * Single source of truth: .skills/internal/
 *
 * Usage:
 *   npx tsx scripts/sync-skills.ts              # Basic sync
 *   npx tsx scripts/sync-skills.ts --dry-run    # Dry run (no changes)
 *   npx tsx scripts/sync-skills.ts --verbose    # Verbose output
 *   npx tsx scripts/sync-skills.ts --include-external  # Include generated external skills
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parseArgs } from 'node:util';

// ============================================================================
// Type Definitions
// ============================================================================

interface FileState {
  path: string;                              // Relative path from skill directory root
  mtime: number;                             // Unix timestamp (seconds)
  size: number;                              // File size in bytes
  hash: string;                              // MD5 hash of content
  location: '.skills' | '.cursor' | '.claude';
}

interface SkillFileMap {
  [relativePath: string]: {
    skills?: FileState;
    cursor?: FileState;
    claude?: FileState;
  };
}

interface SyncOperation {
  type: 'copy' | 'delete' | 'skip';
  from: '.skills' | '.cursor' | '.claude' | null;
  to: '.skills' | '.cursor' | '.claude';
  path: string;
  reason: string;
}

interface SyncOptions {
  dryRun: boolean;
  verbose: boolean;
  interactive: boolean;
  includeExternal: boolean;
}

interface SyncLog {
  timestamp: string;
  operations: SyncOperation[];
  conflicts: string[];
  errors: string[];
  summary: {
    copied: number;
    deleted: number;
    skipped: number;
    errors: number;
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

function getMonorepoRoot(): string {
  return process.cwd();
}

function hash(content: Buffer): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

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

function logVerbose(message: string, verbose: boolean): void {
  if (verbose) {
    console.log(`  ${message}`);
  }
}

// ============================================================================
// File State Management
// ============================================================================

async function getFileState(filePath: string, location: '.skills' | '.cursor' | '.claude', relativePath: string): Promise<FileState | null> {
  try {
    const stat = await fs.stat(filePath);
    const content = await fs.readFile(filePath);

    return {
      path: relativePath,
      mtime: Math.floor(stat.mtimeMs / 1000),
      size: stat.size,
      hash: hash(content),
      location,
    };
  } catch {
    return null;
  }
}

async function buildFileMap(root: string): Promise<SkillFileMap> {
  const fileMap: SkillFileMap = {};
  const skillDirs: { path: string; location: '.skills' | '.cursor' | '.claude' }[] = [
    { path: path.join(root, '.skills/internal'), location: '.skills' },
    { path: path.join(root, '.cursor/skills'), location: '.cursor' },
    { path: path.join(root, '.claude/skills'), location: '.claude' },
  ];

  for (const { path: skillDir, location } of skillDirs) {
    if (!fsSync.existsSync(skillDir)) {
      continue;
    }

    async function traverse(dir: string, relativePath: string = ''): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue; // Skip hidden files

          const rel = relativePath ? path.join(relativePath, entry.name) : entry.name;
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await traverse(fullPath, rel);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            const state = await getFileState(fullPath, location, rel);
            if (state) {
              if (!fileMap[rel]) {
                fileMap[rel] = {};
              }
              fileMap[rel][location] = state;
            }
          }
        }
      } catch (error) {
        console.error(`Error traversing ${dir}:`, error);
      }
    }

    await traverse(skillDir);
  }

  return fileMap;
}

// ============================================================================
// File Comparison
// ============================================================================

function compareFiles(fileA: FileState, fileB: FileState): 'identical' | 'different' {
  // Fast path: mtime and size match, assume identical
  if (fileA.mtime === fileB.mtime && fileA.size === fileB.size) {
    return 'identical';
  }

  // Medium path: compare content hash
  return fileA.hash === fileB.hash ? 'identical' : 'different';
}

function detectSimultaneousEdits(files: FileState[]): boolean {
  if (files.length < 2) return false;

  const times = files.map(f => f.mtime);
  const maxDiff = Math.max(...times) - Math.min(...times);

  // If all files modified within 60 seconds
  if (maxDiff <= 60) {
    // Check if content differs
    const hashes = new Set(files.map(f => f.hash));
    if (hashes.size > 1) {
      return true; // Simultaneous conflicting edits
    }
  }

  return false;
}

// ============================================================================
// Sync Operation Determination
// ============================================================================

function determineSyncOperations(fileMap: SkillFileMap): SyncOperation[] {
  const operations: SyncOperation[] = [];

  for (const [relativePath, locations] of Object.entries(fileMap)) {
    const skills = locations['.skills'];
    const cursor = locations['.cursor'];
    const claude = locations['.claude'];

    // Collect all present files with their mtimes
    const present: FileState[] = [skills, cursor, claude].filter(Boolean);

    if (present.length === 0) {
      continue; // File doesn't exist anywhere
    }

    if (present.length === 1) {
      // File exists in only one location - copy to all others
      const source = present[0];
      const targets = ['.skills', '.cursor', '.claude'].filter(
        loc => loc !== source.location
      );

      for (const target of targets) {
        operations.push({
          type: 'copy',
          from: source.location,
          to: target as '.skills' | '.cursor' | '.claude',
          path: relativePath,
          reason: `New file in ${source.location}`,
        });
      }
      continue;
    }

    // Multiple locations have the file
    // Find the newest by mtime
    const newest = present.reduce((newest, current) =>
      current.mtime > newest.mtime ? current : newest
    );

    // Check if all files are identical (by hash)
    const allSame = present.every(f => f.hash === newest.hash);

    if (allSame) {
      // All files identical - no sync needed
      operations.push({
        type: 'skip',
        from: null,
        to: newest.location,
        path: relativePath,
        reason: 'All copies identical',
      });
      continue;
    }

    // Files differ - copy newest to other locations
    for (const target of ['.skills', '.cursor', '.claude']) {
      if (target === newest.location) continue;

      const targetFile =
        target === '.skills' ? skills :
        target === '.cursor' ? cursor :
        claude;

      if (!targetFile || targetFile.hash !== newest.hash) {
        operations.push({
          type: 'copy',
          from: newest.location,
          to: target as '.skills' | '.cursor' | '.claude',
          path: relativePath,
          reason: `Update from ${newest.location} (newer: ${new Date(newest.mtime * 1000).toISOString()})`,
        });
      }
    }
  }

  return operations;
}

function handleDeletions(fileMap: SkillFileMap): SyncOperation[] {
  const operations: SyncOperation[] = [];

  for (const [relativePath, locations] of Object.entries(fileMap)) {
    const skills = locations['.skills'];
    const cursor = locations['.cursor'];
    const claude = locations['.claude'];

    // If deleted from .skills/ (canonical source), delete everywhere
    if (!skills && (cursor || claude)) {
      if (cursor) {
        operations.push({
          type: 'delete',
          from: null,
          to: '.cursor',
          path: relativePath,
          reason: 'Deleted from canonical source (.skills/)',
        });
      }
      if (claude) {
        operations.push({
          type: 'delete',
          from: null,
          to: '.claude',
          path: relativePath,
          reason: 'Deleted from canonical source (.skills/)',
        });
      }
    }
  }

  return operations;
}

// ============================================================================
// Operation Execution
// ============================================================================

async function executeOperation(
  root: string,
  op: SyncOperation,
  options: SyncOptions,
  syncLog: SyncLog
): Promise<void> {
  if (op.type === 'skip') {
    syncLog.summary.skipped++;
    logVerbose(`⊘ SKIP  ${op.path} (${op.reason})`, options.verbose);
    return;
  }

  try {
    if (op.type === 'copy') {
      const sourceDir =
        op.from === '.skills' ? '.skills/internal' :
        op.from === '.cursor' ? '.cursor/skills' :
        '.claude/skills';

      const targetDir =
        op.to === '.skills' ? '.skills/internal' :
        op.to === '.cursor' ? '.cursor/skills' :
        '.claude/skills';

      const sourcePath = path.join(root, sourceDir, op.path);
      const targetPath = path.join(root, targetDir, op.path);

      if (!options.dryRun) {
        // Ensure parent directory exists
        const targetParent = path.dirname(targetPath);
        await fs.mkdir(targetParent, { recursive: true });

        // Read source file
        const content = await fs.readFile(sourcePath);

        // Write to target, preserving mtime
        const sourceStat = await fs.stat(sourcePath);
        await fs.writeFile(targetPath, content);
        await fs.utimes(targetPath, sourceStat.atime, sourceStat.mtime);
      }

      syncLog.summary.copied++;
      logVerbose(`→  COPY  ${op.path} (from ${op.from})`, options.verbose);
    } else if (op.type === 'delete') {
      const targetDir =
        op.to === '.skills' ? '.skills/internal' :
        op.to === '.cursor' ? '.cursor/skills' :
        '.claude/skills';

      const targetPath = path.join(root, targetDir, op.path);

      if (!options.dryRun) {
        await fs.unlink(targetPath);

        // Clean up empty directories
        let parentDir = path.dirname(targetPath);
        while (parentDir !== targetDir) {
          try {
            const entries = await fs.readdir(parentDir);
            if (entries.length === 0) {
              await fs.rmdir(parentDir);
              parentDir = path.dirname(parentDir);
            } else {
              break;
            }
          } catch {
            break;
          }
        }
      }

      syncLog.summary.deleted++;
      logVerbose(`✗ DELETE ${op.path}`, options.verbose);
    }
  } catch (error) {
    syncLog.errors.push(`Failed to ${op.type} ${op.path}: ${error}`);
    syncLog.summary.errors++;
    logVerbose(`✗ ERROR  ${op.path}: ${error}`, options.verbose);
  }
}

async function executeSyncOperations(
  root: string,
  operations: SyncOperation[],
  options: SyncOptions
): Promise<SyncLog> {
  const syncLog: SyncLog = {
    timestamp: new Date().toISOString(),
    operations: operations.filter(op => op.type !== 'skip'),
    conflicts: [],
    errors: [],
    summary: {
      copied: 0,
      deleted: 0,
      skipped: 0,
      errors: 0,
    },
  };

  log(`\nExecuting ${operations.length} operations...`, 'blue');

  for (const op of operations) {
    await executeOperation(root, op, options, syncLog);
  }

  return syncLog;
}

// ============================================================================
// External Skills Sync
// ============================================================================

async function syncExternalSkills(root: string, options: SyncOptions, syncLog: SyncLog): Promise<void> {
  const generatedDir = path.join(root, 'skills/skills-generated');
  const externalDir = path.join(root, '.skills/external');

  if (!fsSync.existsSync(generatedDir)) {
    log('\n⚠️  skills-generated not found. Run: npx tsx scripts/generate-skills.ts', 'yellow');
    return;
  }

  log('\n📦 Syncing external skills from skills-generated/', 'blue');

  // Clear external directory and copy generated skills
  if (!options.dryRun) {
    if (fsSync.existsSync(externalDir)) {
      await fs.rm(externalDir, { recursive: true });
    }
    await fs.mkdir(externalDir, { recursive: true });

    async function copyDir(src: string, dest: string): Promise<void> {
      await fs.mkdir(dest, { recursive: true });
      const entries = await fs.readdir(src, { withFileTypes: true });

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          await copyDir(srcPath, destPath);
        } else {
          const stat = await fs.stat(srcPath);
          const content = await fs.readFile(srcPath);
          await fs.writeFile(destPath, content);
          await fs.utimes(destPath, stat.atime, stat.mtime);
        }
      }
    }

    await copyDir(generatedDir, externalDir);
    log('✅ External skills synced', 'green');
  } else {
    log('(dry-run) Would sync external skills', 'yellow');
  }
}

// ============================================================================
// Logging and Reporting
// ============================================================================

async function writeSyncLog(root: string, syncLog: SyncLog, options: SyncOptions): Promise<void> {
  if (!options.dryRun) {
    const logPath = path.join(root, '.skills/.sync-log.json');
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.writeFile(logPath, JSON.stringify(syncLog, null, 2));
  }
}

function printSummary(syncLog: SyncLog, options: SyncOptions): void {
  log('\n═══════════════════════════════════════════════════════════', 'blue');
  log('  Sync Summary', 'blue');
  log('═══════════════════════════════════════════════════════════', 'blue');

  if (options.dryRun) {
    log('  Mode: DRY RUN (no changes made)', 'yellow');
  }

  log(`  Copied:  ${syncLog.summary.copied}`, 'green');
  log(`  Deleted: ${syncLog.summary.deleted}`, 'green');
  log(`  Skipped: ${syncLog.summary.skipped}`, 'green');
  log(`  Errors:  ${syncLog.summary.errors}`, syncLog.summary.errors > 0 ? 'red' : 'green');

  if (syncLog.conflicts.length > 0) {
    log(`\n  ⚠️  Conflicts (${syncLog.conflicts.length}):`, 'yellow');
    syncLog.conflicts.forEach(conflict => log(`     - ${conflict}`, 'yellow'));
  }

  if (syncLog.errors.length > 0) {
    log(`\n  ✗ Errors (${syncLog.errors.length}):`, 'red');
    syncLog.errors.forEach(error => log(`     - ${error}`, 'red'));
  }

  log('═══════════════════════════════════════════════════════════', 'blue');
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    // Parse command-line arguments
    const { values } = parseArgs({
      options: {
        'dry-run': { type: 'boolean', default: false },
        'verbose': { type: 'boolean', default: false },
        'interactive': { type: 'boolean', default: false },
        'include-external': { type: 'boolean', default: false },
      },
    });

    const options: SyncOptions = {
      dryRun: values['dry-run'] as boolean,
      verbose: values['verbose'] as boolean,
      interactive: values['interactive'] as boolean,
      includeExternal: values['include-external'] as boolean,
    };

    const root = getMonorepoRoot();

    log('\n🔄 Skills Sync System', 'blue');
    log('═══════════════════════════════════════════════════════════', 'blue');

    // Build file map from all skill directories
    log('Scanning skill directories...', 'blue');
    const fileMap = await buildFileMap(root);
    const fileCount = Object.keys(fileMap).length;
    log(`Found ${fileCount} files across skill directories`, 'green');


    // Determine sync operations
    const syncOps = determineSyncOperations(fileMap);
    const deleteOps = handleDeletions(fileMap);
    const allOps = [...syncOps, ...deleteOps];


    // Group operations by type
    const copyCount = allOps.filter(op => op.type === 'copy').length;
    const deleteCount = allOps.filter(op => op.type === 'delete').length;
    const skipCount = allOps.filter(op => op.type === 'skip').length;

    log(`\nOperations to perform:`, 'blue');
    log(`  Copy:   ${copyCount}`, copyCount > 0 ? 'green' : 'blue');
    log(`  Delete: ${deleteCount}`, deleteCount > 0 ? 'yellow' : 'blue');
    log(`  Skip:   ${skipCount}`, 'blue');

    // Execute operations
    const syncLog = await executeSyncOperations(root, allOps, options);

    // Sync external skills if requested
    if (options.includeExternal) {
      await syncExternalSkills(root, options, syncLog);
    }

    // Write sync log
    await writeSyncLog(root, syncLog, options);

    // Print summary
    printSummary(syncLog, options);

    if (syncLog.summary.errors > 0) {
      process.exit(1);
    }
  } catch (error) {
    log(`\n✗ Fatal error: ${error}`, 'red');
    process.exit(1);
  }
}

main();

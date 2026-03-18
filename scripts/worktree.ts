#!/usr/bin/env tsx
/**
 * Unified Worktree Management CLI
 *
 * All lifecycle commands are implemented directly here. No external bash scripts
 * are called for core operations. The only subprocess calls are to git, docker,
 * and to package scripts (telecine/elements npm/docker-compose wrappers) that
 * live in their respective worktrees and must be invoked from there.
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { readFile, writeFile } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync, spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const SCRIPTS_DIR = dirname(__filename);
const MONOREPO_ROOT = join(SCRIPTS_DIR, '..');

// ---------------------------------------------------------------------------
// Low-level process helpers
// ---------------------------------------------------------------------------

interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function exec(
  command: string,
  args: string[],
  options: { cwd?: string; stdio?: 'pipe' | 'inherit' | 'ignore'; env?: NodeJS.ProcessEnv } = {},
): ExecResult {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? MONOREPO_ROOT,
    encoding: 'utf-8',
    stdio: options.stdio ?? 'pipe',
    env: options.env ?? process.env,
  });
  return {
    exitCode: result.status ?? (result.error ? 1 : 0),
    stdout: (result.stdout ?? '').toString(),
    stderr: (result.stderr ?? '').toString(),
  };
}

// For interactive or streaming processes
function execInteractive(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd: options.cwd ?? MONOREPO_ROOT,
      stdio: 'inherit',
      env: options.env ?? process.env,
    });
    proc.on('close', (code) => resolve(code ?? 0));
    proc.on('error', () => resolve(1));
  });
}

// For long-running silent subprocesses with spinner
function execSilent(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<ExecResult> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd: options.cwd ?? MONOREPO_ROOT,
      stdio: 'pipe',
      env: options.env ?? process.env,
    });
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d) => (stdout += d.toString()));
    proc.stderr?.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => resolve({ exitCode: code ?? 0, stdout, stderr }));
    proc.on('error', (e) => resolve({ exitCode: 1, stdout, stderr: e.message }));
  });
}

// ---------------------------------------------------------------------------
// Branch/path utilities — must match worktree-config.sh exactly
// ---------------------------------------------------------------------------

function sanitizeBranchName(name: string): string {
  let s = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 63)
    .replace(/-$/, '');
  if (!s || !/^[a-z0-9]/.test(s)) throw new Error(`Invalid branch name: ${name}`);
  return s;
}

// POSIX cksum — matches the output of the bash `cksum` command used in worktree-config.sh.
// Uses the unreflected 0x04C11DB7 polynomial with byte-count appended before CRC.
function posixCksum(str: string): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i << 24;
    for (let j = 0; j < 8; j++) c = (c & 0x80000000) ? ((c << 1) ^ 0x04c11db7) : (c << 1);
    table[i] = c >>> 0;
  }
  const bytes = Buffer.from(str, 'utf-8');
  let len = bytes.length;
  const lenBytes: number[] = [];
  do { lenBytes.push(len & 0xff); len >>>= 8; } while (len > 0);
  const all = Buffer.concat([bytes, Buffer.from(lenBytes)]);
  let crc = 0;
  for (const b of all) crc = ((table[((crc >>> 24) ^ b) & 0xff] ^ (crc << 8)) >>> 0);
  return (crc ^ 0xffffffff) >>> 0;
}

function calculatePortOffset(branchName: string): number {
  const hash = posixCksum(branchName);
  const slot = (hash % 200) + 1;
  return slot * 100;
}

function dockerProjectName(sanitized: string, pkg: 'telecine' | 'elements', isMain: boolean): string {
  if (isMain) return pkg === 'elements' ? 'ef-elements' : 'telecine';
  return pkg === 'elements' ? `ef-elements-${sanitized}` : `telecine-${sanitized}`;
}

// ---------------------------------------------------------------------------
// Worktree data model
// ---------------------------------------------------------------------------

interface WorktreeInfo {
  branch: string;
  path: string; // monorepo worktree path
  sanitized: string;
  domain: string;
  scope?: string;
  isMain: boolean;
  ports: { postgres: number; valkey: number; mailhog: number };
}

function editframeDir(monorepoRoot: string): string {
  // monorepo is at worktrees/<branch>/monorepo — three levels up is editframe dir
  return join(monorepoRoot, '..', '..', '..');
}

function worktreesDir(monorepoRoot: string): string {
  return join(editframeDir(monorepoRoot), 'worktrees');
}

async function getWorktrees(): Promise<WorktreeInfo[]> {
  const { stdout } = exec('git', ['worktree', 'list', '--porcelain']);
  const lines = stdout.split('\n');
  const result: WorktreeInfo[] = [];
  let currentPath = '';

  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      currentPath = line.slice(9).trim();
    } else if (line.startsWith('branch ')) {
      const branch = line.slice(7).replace('refs/heads/', '');
      const isMain = branch === 'main' || branch === 'master';
      const sanitized = isMain ? 'main' : sanitizeBranchName(branch);
      const domain = isMain ? 'main.localhost' : `${sanitized}.localhost`;

      // scope file lives one directory above the monorepo worktree
      const scopeFile = join(currentPath, '..', '.worktree-scope');
      let scope: string | undefined;
      try {
        scope = existsSync(scopeFile) ? readFileSync(scopeFile, 'utf-8').trim() : undefined;
      } catch { /* ignore */ }

      const offset = isMain ? 0 : calculatePortOffset(branch);
      const ports = {
        postgres: 5432 + offset,
        valkey: 6379 + offset,
        mailhog: 1025 + offset,
      };

      result.push({ branch, path: currentPath, sanitized, domain, scope, isMain, ports });
    }
  }
  return result;
}

function requireWorktree(worktrees: WorktreeInfo[], branch: string): WorktreeInfo {
  const wt = worktrees.find((w) => w.branch === branch);
  if (!wt) {
    console.error(chalk.red(`Worktree not found: ${branch}`));
    process.exit(1);
  }
  return wt;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdList() {
  const worktrees = await getWorktrees();
  const branches = worktrees.filter((w) => !w.isMain);
  const main = worktrees.find((w) => w.isMain);

  console.log(chalk.bold('Worktrees\n'));
  if (branches.length === 0) {
    console.log(chalk.dim('  (no branch worktrees)'));
  } else {
    const header = 'BRANCH'.padEnd(28) + 'SCOPE'.padEnd(12) + 'DOMAIN'.padEnd(32) + 'PG PORT';
    console.log(chalk.gray(header));
    console.log(chalk.gray('─'.repeat(header.length)));
    for (const wt of branches) {
      console.log(
        `${wt.branch.padEnd(28)}${(wt.scope ?? '-').padEnd(12)}${wt.domain.padEnd(32)}${wt.ports.postgres}`,
      );
    }
  }

  if (main) {
    console.log(chalk.gray(`\nmain  ${main.path}`));
    console.log(chalk.gray('  Telecine: http://main.localhost:3000  Elements: http://main.localhost:4321'));
  }
}

async function cmdStatus(branch?: string) {
  const worktrees = await getWorktrees();
  const targets = branch ? [requireWorktree(worktrees, branch)] : worktrees.filter((w) => !w.isMain);

  for (const wt of targets) {
    const worktreeContainerDir = join(wt.path, '..');
    console.log(chalk.bold(`${wt.branch}`) + chalk.gray(` (${wt.scope ?? 'unknown'})`));

    // Worktree directories
    const monoOk = existsSync(wt.path);
    const scopeOk = existsSync(join(worktreeContainerDir, '.worktree-scope'));
    const elemEnv = existsSync(join(worktreeContainerDir, 'elements', '.env'));
    const telEnv = existsSync(join(worktreeContainerDir, 'telecine', '.env'));
    console.log(`  ${monoOk ? chalk.green('✓') : chalk.red('✗')} monorepo dir`);
    console.log(`  ${scopeOk ? chalk.green('✓') : chalk.red('✗')} .worktree-scope`);
    console.log(`  ${elemEnv ? chalk.green('✓') : chalk.yellow('○')} elements/.env`);
    console.log(`  ${telEnv ? chalk.green('✓') : chalk.yellow('○')} telecine/.env`);

    // Postgres port (host-accessible)
    if (!wt.isMain) {
      const nc = exec('nc', ['-z', '-w1', 'localhost', String(wt.ports.postgres)], { stdio: 'pipe' });
      console.log(
        `  ${nc.exitCode === 0 ? chalk.green('✓') : chalk.gray('○')} postgres port ${wt.ports.postgres}: ${nc.exitCode === 0 ? 'reachable' : 'not reachable'}`,
      );
    }

    // Docker containers
    const { stdout: psOut } = exec('docker', ['ps', '--format', '{{.Names}}\t{{.Status}}', '--filter', `name=${wt.sanitized}`]);
    const containers = psOut.split('\n').filter(Boolean);
    if (containers.length > 0) {
      for (const c of containers) {
        const [name, status] = c.split('\t');
        const up = status?.startsWith('Up');
        console.log(`  ${up ? chalk.green('✓') : chalk.red('✗')} ${name}: ${status}`);
      }
    } else {
      console.log(`  ${chalk.gray('○')} no containers running`);
    }

    // DB existence for telecine scopes
    if (wt.scope && wt.scope !== 'elements') {
      const dbName = `telecine-${wt.sanitized}`;
      const { stdout: dbOut } = exec('docker', [
        'exec', 'editframe-postgres',
        'psql', '-U', 'postgres', '-tAc',
        `SELECT 1 FROM pg_database WHERE datname='${dbName}'`,
      ], { stdio: 'pipe' });
      const exists = dbOut.trim() === '1';
      console.log(`  ${exists ? chalk.green('✓') : chalk.red('✗')} database ${dbName}`);
    }
    console.log('');
  }
}

async function cmdCreate(branch: string, scope: string = 'web') {
  const validScopes = ['elements', 'web', 'render'];
  if (!validScopes.includes(scope)) {
    console.error(chalk.red(`Invalid scope: ${scope}. Must be: ${validScopes.join(', ')}`));
    process.exit(1);
  }

  const sanitized = sanitizeBranchName(branch);
  const wdir = worktreesDir(MONOREPO_ROOT);
  const worktreeDir = join(wdir, sanitized);
  const monoDir = join(worktreeDir, 'monorepo');
  const telecineDir = join(worktreeDir, 'telecine');
  const elementsDir = join(worktreeDir, 'elements');
  const telecineMain = join(wdir, 'main', 'telecine');
  const elementsMain = join(wdir, 'main', 'elements');

  if (existsSync(worktreeDir)) {
    console.error(chalk.red(`Worktree directory already exists: ${worktreeDir}`));
    process.exit(1);
  }

  const spinner = ora(`Creating worktree: ${branch} (${scope})`).start();

  // 1. Git worktrees
  const currentBranch = exec('git', ['branch', '--show-current']).stdout.trim() || 'main';
  const baseBranch = currentBranch === 'HEAD' ? 'main' : currentBranch;

  const monoHasRef = exec('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]).exitCode === 0;
  exec('git', monoHasRef
    ? ['worktree', 'add', monoDir, branch]
    : ['worktree', 'add', '-b', branch, monoDir, baseBranch]);

  const telResult = exec('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], { cwd: telecineMain });
  exec('git', telResult.exitCode === 0
    ? ['worktree', 'add', telecineDir, branch]
    : ['worktree', 'add', '-b', branch, telecineDir, 'main'],
    { cwd: telecineMain });

  const elemResult = exec('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], { cwd: elementsMain });
  exec('git', elemResult.exitCode === 0
    ? ['worktree', 'add', elementsDir, branch]
    : ['worktree', 'add', '-b', branch, elementsDir, 'main'],
    { cwd: elementsMain });

  // 2. Scope file + opencode.json
  await writeFile(join(worktreeDir, '.worktree-scope'), scope);
  const ocodeSrc = join(MONOREPO_ROOT, 'opencode.json');
  const ocodeDst = join(monoDir, 'opencode.json');
  if (existsSync(ocodeSrc) && !existsSync(ocodeDst)) {
    exec('cp', [ocodeSrc, ocodeDst]);
  }

  // 3. Copy .env files
  const elemEnvSrc = join(elementsMain, '.env');
  if (existsSync(elemEnvSrc)) exec('cp', [elemEnvSrc, join(elementsDir, '.env')]);

  if (scope !== 'elements') {
    const telEnvSrc = join(telecineMain, '.env');
    if (existsSync(telEnvSrc)) exec('cp', [telEnvSrc, join(telecineDir, '.env')]);
  }

  // 4. Copy native build artifacts
  if (scope !== 'elements') {
    const copyNative = join(telecineDir, 'scripts', 'copy-native-build');
    if (existsSync(copyNative)) exec('bash', [copyNative], { cwd: telecineDir, stdio: 'ignore' });
  }

  // 5. Point dev-projects at main's copy
  if (existsSync(join(elementsMain, 'dev-projects'))) {
    const envPath = join(elementsDir, '.env');
    let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';
    envContent = envContent.split('\n').filter((l) => !l.startsWith('DEV_PROJECTS_HOST=')).join('\n');
    envContent += `\nDEV_PROJECTS_HOST="${join(elementsMain, 'dev-projects')}"\n`;
    await writeFile(envPath, envContent);
  }

  // 6. Ensure shared infrastructure running
  const netCheck = exec('docker', ['network', 'inspect', 'editframe-shared'], { stdio: 'ignore' });
  if (netCheck.exitCode !== 0) {
    spinner.text = 'Starting shared infrastructure...';
    await execSilent('docker', ['compose', '--project-name', 'editframe', 'up', '-d'], { cwd: MONOREPO_ROOT });
  }

  // 7. Database setup (web/render scopes)
  let templateExists = false;
  if (scope !== 'elements') {
    const dbName = `telecine-${sanitized}`;
    const tmpl = exec('docker', ['exec', 'editframe-postgres', 'psql', '-U', 'postgres', '-tAc',
      "SELECT 1 FROM pg_database WHERE datname = 'telecine-template'"]);
    templateExists = tmpl.stdout.trim() === '1';

    if (templateExists) {
      spinner.text = 'Cloning database from template...';
      exec('docker', ['exec', 'editframe-postgres', 'psql', '-U', 'postgres',
        '-c', `CREATE DATABASE "${dbName}" TEMPLATE "telecine-template";`], { stdio: 'ignore' });
    }
  }

  // 8. Elements runner + install + dev server
  spinner.text = 'Starting elements runner...';
  await execSilent(join(elementsDir, 'scripts', 'docker-compose'), ['up', '-d', 'runner'], { cwd: elementsDir });

  spinner.text = 'Installing elements dependencies...';
  await execSilent(join(elementsDir, 'scripts', 'npm'), ['install'], { cwd: elementsDir });

  spinner.text = 'Starting elements dev server...';
  await execSilent(join(elementsDir, 'scripts', 'docker-compose'), ['up', '-d', 'dev-projects'], { cwd: elementsDir });

  // 9. Telecine containers (web/render)
  if (scope !== 'elements') {
    const profiles = scope === 'render' ? 'render' : '';

    spinner.text = 'Starting telecine runner...';
    await execSilent(join(telecineDir, 'scripts', 'docker-compose'), ['up', '-d', 'runner'], {
      cwd: telecineDir,
      env: { ...process.env, COMPOSE_PROFILES: profiles },
    });

    spinner.text = 'Installing telecine dependencies...';
    await execSilent(join(telecineDir, 'scripts', 'npm'), ['install'], { cwd: telecineDir });

    spinner.text = 'Starting telecine services...';
    await execSilent(join(telecineDir, 'scripts', 'docker-compose'), ['up', '-d'], {
      cwd: telecineDir,
      env: { ...process.env, COMPOSE_PROFILES: profiles },
    });

    spinner.text = templateExists ? 'Applying delta migrations...' : 'Running full migrations...';
    await execSilent(join(telecineDir, 'scripts', 'migrate-db'), [], { cwd: telecineDir });

    if (!templateExists) {
      await execSilent(join(telecineDir, 'scripts', 'seed'), [], { cwd: telecineDir });
    }

    // Generate EF_TOKEN
    spinner.text = 'Generating EF_TOKEN...';
    const tokenResult = await execSilent(join(telecineDir, 'scripts', 'run'), [
      'node',
      '--import',
      'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./loader.js", pathToFileURL("./"));',
      'scripts/generate-forever-token.ts',
    ], { cwd: telecineDir });

    const token = tokenResult.stdout.trim().split('\n').pop() ?? '';
    if (token && !token.includes('Error')) {
      const envPath = join(elementsDir, '.env');
      let env = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';
      env = env.split('\n')
        .filter((l) => !l.startsWith('EF_TOKEN=') && !l.startsWith('EF_HOST=') && !l.startsWith('VITEST_BROWSER_MODE='))
        .join('\n');
      env += `\nEF_TOKEN="${token}"`;
      env += `\nEF_HOST="http://telecine-${sanitized}-web-1:3000"`;
      env += `\nVITEST_BROWSER_MODE="connect"\n`;
      await writeFile(envPath, env);
    }
  }

  spinner.succeed(chalk.green(`Worktree created: ${branch} (${scope})`));
  console.log(`  Domain:   http://${sanitized}.localhost`);
  if (scope !== 'elements') console.log(`  Telecine: http://${sanitized}.localhost:3000`);
  console.log(`  Elements: http://${sanitized}.localhost:4321`);
}

async function cmdPause(branch: string) {
  const worktrees = await getWorktrees();
  const wt = requireWorktree(worktrees, branch);
  const worktreeDir = join(wt.path, '..');
  const telecineDir = join(worktreeDir, 'telecine');
  const elementsDir = join(worktreeDir, 'elements');
  const spinner = ora(`Pausing: ${branch}`).start();

  if (wt.scope !== 'elements') {
    const dc = join(telecineDir, 'scripts', 'docker-compose');
    if (existsSync(dc)) await execSilent(dc, ['stop'], { cwd: telecineDir });
  }
  const eDc = join(elementsDir, 'scripts', 'docker-compose');
  if (existsSync(eDc)) await execSilent(eDc, ['stop'], { cwd: elementsDir });

  spinner.succeed(chalk.green(`Paused: ${branch}`));
}

async function cmdResume(branch: string) {
  const worktrees = await getWorktrees();
  const wt = requireWorktree(worktrees, branch);
  const worktreeDir = join(wt.path, '..');
  const telecineDir = join(worktreeDir, 'telecine');
  const elementsDir = join(worktreeDir, 'elements');
  const spinner = ora(`Resuming: ${branch}`).start();

  // Ensure shared infra
  const netCheck = exec('docker', ['network', 'inspect', 'editframe-shared'], { stdio: 'ignore' });
  if (netCheck.exitCode !== 0) {
    spinner.text = 'Starting shared infrastructure...';
    await execSilent('docker', ['compose', '--project-name', 'editframe', 'up', '-d'], { cwd: MONOREPO_ROOT });
  }

  if (wt.scope !== 'elements') {
    const profiles = wt.scope === 'render' ? 'render' : '';
    const dc = join(telecineDir, 'scripts', 'docker-compose');
    if (existsSync(dc)) {
      await execSilent(dc, ['start'], {
        cwd: telecineDir,
        env: { ...process.env, COMPOSE_PROFILES: profiles },
      });
    }
  }

  const eDc = join(elementsDir, 'scripts', 'docker-compose');
  if (existsSync(eDc)) await execSilent(eDc, ['start'], { cwd: elementsDir });

  spinner.succeed(chalk.green(`Resumed: ${branch}`));
}

async function cmdRemove(branch: string, force: boolean = false) {
  const worktrees = await getWorktrees();
  const wt = requireWorktree(worktrees, branch);
  const worktreeDir = join(wt.path, '..');
  const telecineDir = join(worktreeDir, 'telecine');
  const elementsDir = join(worktreeDir, 'elements');
  const wdir = worktreesDir(MONOREPO_ROOT);
  const telecineMain = join(wdir, 'main', 'telecine');
  const elementsMain = join(wdir, 'main', 'elements');

  // Merge check
  if (!force) {
    const mainBranch = exec('git', ['show-ref', '--verify', '--quiet', 'refs/heads/main']).exitCode === 0 ? 'main' : 'master';
    const hasRef = exec('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]).exitCode === 0;
    if (hasRef) {
      const isMerged = exec('git', ['merge-base', '--is-ancestor', `refs/heads/${branch}`, `refs/heads/${mainBranch}`]).exitCode === 0;
      if (!isMerged) {
        console.error(chalk.red(`Branch '${branch}' is not merged into ${mainBranch}. Use --force to remove anyway.`));
        process.exit(1);
      }
    }
  }

  const spinner = ora(`Removing: ${branch}${force ? ' (forced)' : ''}`).start();

  // 1. Stop and remove Docker containers
  if (wt.scope !== 'elements' && existsSync(join(telecineDir, 'scripts', 'docker-compose'))) {
    const { stdout: dbName } = exec('bash', ['-c', '. scripts/worktree-config && echo "$WORKTREE_DATABASE"'], { cwd: telecineDir });
    await execSilent(join(telecineDir, 'scripts', 'docker-compose'), ['down', '-v', '--remove-orphans'], { cwd: telecineDir });
    const db = dbName.trim();
    if (db && db !== 'telecine-main') {
      exec('docker', ['exec', 'editframe-postgres', 'psql', '-U', 'postgres',
        '-c', `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${db}' AND pid <> pg_backend_pid();`,
        '-c', `DROP DATABASE IF EXISTS "${db}";`], { stdio: 'ignore' });
    }
  }
  if (existsSync(join(elementsDir, 'scripts', 'docker-compose'))) {
    await execSilent(join(elementsDir, 'scripts', 'docker-compose'), ['down', '-v', '--remove-orphans'], { cwd: elementsDir });
  }

  // 2. Remove git worktrees
  for (const [repoMain, repoWt] of [[telecineMain, telecineDir], [elementsMain, elementsDir]] as [string, string][]) {
    if (!existsSync(repoMain)) continue;
    const listed = exec('git', ['worktree', 'list'], { cwd: repoMain }).stdout;
    if (listed.includes(repoWt)) exec('git', ['worktree', 'remove', '--force', repoWt], { cwd: repoMain, stdio: 'ignore' });
  }
  const monoList = exec('git', ['worktree', 'list']).stdout;
  if (monoList.includes(wt.path)) exec('git', ['worktree', 'remove', '--force', wt.path], { stdio: 'ignore' });

  // Remove directory if still present
  if (existsSync(worktreeDir)) exec('rm', ['-rf', worktreeDir]);

  // 3. Delete branch refs
  for (const [repoDir, label] of [[MONOREPO_ROOT, 'monorepo'], [telecineMain, 'telecine'], [elementsMain, 'elements']] as [string, string][]) {
    if (!existsSync(repoDir)) continue;
    const hasRef = exec('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], { cwd: repoDir }).exitCode === 0;
    if (hasRef) exec('git', ['branch', '-D', branch], { cwd: repoDir, stdio: 'ignore' });
  }

  spinner.succeed(chalk.green(`Removed: ${branch}`));
}

async function cmdUpgrade(branch: string, newScope: string) {
  const validScopes = ['elements', 'web', 'render'];
  if (!validScopes.includes(newScope)) {
    console.error(chalk.red(`Invalid scope: ${newScope}`));
    process.exit(1);
  }

  const worktrees = await getWorktrees();
  const wt = requireWorktree(worktrees, branch);
  const worktreeDir = join(wt.path, '..');
  const telecineDir = join(worktreeDir, 'telecine');
  const elementsDir = join(worktreeDir, 'elements');
  const wdir = worktreesDir(MONOREPO_ROOT);
  const telecineMain = join(wdir, 'main', 'telecine');
  const currentScope = wt.scope ?? 'elements';
  const order = ['elements', 'web', 'render'];

  if (order.indexOf(newScope) <= order.indexOf(currentScope)) {
    console.error(chalk.red(`Already at scope '${currentScope}'. Cannot downgrade to '${newScope}'.`));
    process.exit(1);
  }

  const spinner = ora(`Upgrading ${branch}: ${currentScope} → ${newScope}`).start();

  if (currentScope === 'elements') {
    // Copy telecine .env if missing
    if (!existsSync(join(telecineDir, '.env'))) {
      const src = join(telecineMain, '.env');
      if (existsSync(src)) exec('cp', [src, join(telecineDir, '.env')]);
    }
    // Copy native build
    const copyNative = join(telecineDir, 'scripts', 'copy-native-build');
    if (existsSync(copyNative)) await execSilent('bash', [copyNative], { cwd: telecineDir });

    // Database
    const dbName = `telecine-${wt.sanitized}`;
    const dbExists = exec('docker', ['exec', 'editframe-postgres', 'psql', '-U', 'postgres', '-tAc',
      `SELECT 1 FROM pg_database WHERE datname = '${dbName}'`]).stdout.trim() === '1';
    if (!dbExists) {
      const tmplExists = exec('docker', ['exec', 'editframe-postgres', 'psql', '-U', 'postgres', '-tAc',
        "SELECT 1 FROM pg_database WHERE datname = 'telecine-template'"]).stdout.trim() === '1';
      if (tmplExists) {
        exec('docker', ['exec', 'editframe-postgres', 'psql', '-U', 'postgres',
          '-c', `CREATE DATABASE "${dbName}" TEMPLATE "telecine-template";`], { stdio: 'ignore' });
      }
    }

    const profiles = newScope === 'render' ? 'render' : '';
    spinner.text = 'Starting telecine runner...';
    await execSilent(join(telecineDir, 'scripts', 'docker-compose'), ['up', '-d', 'runner'], {
      cwd: telecineDir, env: { ...process.env, COMPOSE_PROFILES: profiles },
    });
    spinner.text = 'Installing telecine dependencies...';
    await execSilent(join(telecineDir, 'scripts', 'npm'), ['install'], { cwd: telecineDir });
    spinner.text = 'Starting telecine services...';
    await execSilent(join(telecineDir, 'scripts', 'docker-compose'), ['up', '-d'], {
      cwd: telecineDir, env: { ...process.env, COMPOSE_PROFILES: profiles },
    });
    spinner.text = 'Applying migrations...';
    await execSilent(join(telecineDir, 'scripts', 'migrate-db'), [], { cwd: telecineDir });

    // Generate EF_TOKEN
    spinner.text = 'Generating EF_TOKEN...';
    const tokenResult = await execSilent(join(telecineDir, 'scripts', 'run'), [
      'node',
      '--import',
      'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./loader.js", pathToFileURL("./"));',
      'scripts/generate-forever-token.ts',
    ], { cwd: telecineDir });

    const token = tokenResult.stdout.trim().split('\n').pop() ?? '';
    if (token && !token.includes('Error')) {
      const envPath = join(elementsDir, '.env');
      let env = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';
      env = env.split('\n')
        .filter((l) => !l.startsWith('EF_TOKEN=') && !l.startsWith('EF_HOST=') && !l.startsWith('VITEST_BROWSER_MODE='))
        .join('\n');
      env += `\nEF_TOKEN="${token}"`;
      env += `\nEF_HOST="http://telecine-${wt.sanitized}-web-1:3000"`;
      env += `\nVITEST_BROWSER_MODE="connect"\n`;
      await writeFile(envPath, env);
    }

  } else if (currentScope === 'web' && newScope === 'render') {
    spinner.text = 'Starting render pipeline services...';
    await execSilent(join(telecineDir, 'scripts', 'docker-compose'), ['up', '-d'], {
      cwd: telecineDir,
      env: { ...process.env, COMPOSE_PROFILES: 'render' },
    });
  }

  // Write new scope
  await writeFile(join(worktreeDir, '.worktree-scope'), newScope);
  spinner.succeed(chalk.green(`Upgraded: ${branch} → ${newScope}`));
}

async function cmdMerge(branch: string) {
  const worktrees = await getWorktrees();
  requireWorktree(worktrees, branch); // validate exists
  const wdir = worktreesDir(MONOREPO_ROOT);
  const telecineMain = join(wdir, 'main', 'telecine');
  const elementsMain = join(wdir, 'main', 'elements');

  const spinner = ora(`Merging: ${branch}`).start();

  async function mergeIn(repoDir: string, label: string) {
    if (!existsSync(repoDir)) return;
    const hasRef = exec('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], { cwd: repoDir }).exitCode === 0;
    if (!hasRef) return;

    const mainBranch = exec('git', ['show-ref', '--verify', '--quiet', 'refs/heads/main'], { cwd: repoDir }).exitCode === 0 ? 'main' : 'master';
    exec('git', ['checkout', mainBranch], { cwd: repoDir, stdio: 'ignore' });

    const alreadyMerged = exec('git', ['merge-base', '--is-ancestor', `refs/heads/${branch}`, `refs/heads/${mainBranch}`], { cwd: repoDir }).exitCode === 0;
    if (alreadyMerged) {
      console.log(chalk.gray(`  ${label}: already merged`));
      return;
    }

    const dirty = exec('git', ['diff-index', '--quiet', 'HEAD', '--'], { cwd: repoDir }).exitCode !== 0;
    if (dirty) {
      spinner.fail(chalk.red(`${label} has uncommitted changes`));
      process.exit(1);
    }

    const result = exec('git', ['merge', '--no-edit', branch], { cwd: repoDir });
    if (result.exitCode !== 0) {
      spinner.fail(chalk.red(`Merge conflict in ${label}`));
      console.error(result.stderr);
      process.exit(1);
    }
    console.log(chalk.green(`  ${label}: merged`));
  }

  await mergeIn(MONOREPO_ROOT, 'monorepo');
  await mergeIn(telecineMain, 'telecine');
  await mergeIn(elementsMain, 'elements');

  spinner.succeed(chalk.green(`Merged: ${branch}`));
  console.log(chalk.dim(`  Next: worktree remove ${branch}`));
}

async function cmdSmoke(branch: string) {
  const worktrees = await getWorktrees();
  const wt = requireWorktree(worktrees, branch);
  const worktreeDir = join(wt.path, '..');
  const telecineDir = join(worktreeDir, 'telecine');
  const elementsDir = join(worktreeDir, 'elements');

  if (!wt.scope || wt.scope === 'elements') {
    console.error(chalk.red(`Smoke test requires web or render scope (current: ${wt.scope ?? 'unknown'})`));
    console.error(chalk.dim(`  worktree upgrade ${branch} web`));
    process.exit(1);
  }

  // Build scheduler-go image if missing
  const imgCheck = exec('docker', ['image', 'inspect', 'scheduler-go'], { stdio: 'ignore' });
  if (imgCheck.exitCode !== 0) {
    const spinner = ora('Building scheduler-go image...').start();
    const schedulerDockerfile = join(MONOREPO_ROOT, 'telecine', 'services', 'scheduler-go', 'Dockerfile.dev');
    const schedulerCtx = join(MONOREPO_ROOT, 'telecine', 'services', 'scheduler-go');
    await execSilent('docker', ['build', '-f', schedulerDockerfile, '-t', 'scheduler-go', schedulerCtx]);
    spinner.succeed('scheduler-go image built');
  }

  // Get EF_TOKEN
  const envPath = join(elementsDir, '.env');
  let efToken = '';
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^EF_TOKEN="?([^"\n]+)"?/m);
    if (match) efToken = match[1];
  }
  if (!efToken) {
    console.error(chalk.red(`EF_TOKEN not found in ${envPath}`));
    process.exit(1);
  }

  let startedRender = false;

  // Start render services if at web scope
  if (wt.scope === 'web') {
    const spinner = ora('Starting render services...').start();
    await execSilent(join(telecineDir, 'scripts', 'docker-compose'), ['up', '-d'], {
      cwd: telecineDir,
      env: { ...process.env, COMPOSE_PROFILES: 'render' },
    });
    startedRender = true;
    spinner.succeed('Render services started');
  }

  console.log(chalk.bold(`\nSmoke test: ${branch}\n`));

  const exitCode = await execInteractive(join(telecineDir, 'scripts', 'docker-compose'), [
    'exec', '-T',
    '-e', `EF_TOKEN=${efToken}`,
    '-e', 'EF_HOST=http://web:3000',
    'runner',
    'node',
    '--import',
    'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("./loader.js", pathToFileURL("./"));',
    'scripts/smoke-test.ts',
  ], { cwd: telecineDir, env: { ...process.env, COMPOSE_PROFILES: wt.scope === 'render' ? 'render' : '' } });

  console.log('');
  if (exitCode === 0) console.log(chalk.green('All tests passed'));
  else console.log(chalk.red('Some tests failed'));

  console.log(chalk.dim(`\nDashboard: http://${wt.domain}:3000`));

  if (startedRender) {
    console.log(chalk.dim('\nPress enter to stop render services...'));
    await new Promise<void>((resolve) => {
      process.stdin.setRawMode?.(false);
      process.stdin.once('data', () => resolve());
      process.stdin.resume();
    });
    await execSilent(join(telecineDir, 'scripts', 'docker-compose'), ['stop'], {
      cwd: telecineDir,
      env: { ...process.env, COMPOSE_PROFILES: 'render' },
    });
  }

  process.exit(exitCode);
}

async function cmdLogs(branch?: string, service?: string, tail: number = 100, since = '5m') {
  const worktrees = await getWorktrees();
  let wt = branch ? requireWorktree(worktrees, branch) : (worktrees.find((w) => !w.isMain) ?? worktrees[0]);
  if (!wt) { console.error(chalk.red('No worktrees found')); process.exit(1); }

  const svc = service ?? (wt.scope === 'elements' ? 'dev-projects' : 'web');
  // Determine pkg from service name: if service contains 'elements' hints or scope is elements
  const pkg = wt.scope === 'elements' ? 'elements' : 'telecine';
  const project = dockerProjectName(wt.sanitized, pkg, wt.isMain);
  const container = `${project}-${svc}-1`;

  console.log(chalk.dim(`Container: ${container}  tail:${tail}  since:${since}\n`));
  const code = await execInteractive('docker', ['logs', container, '--tail', String(tail), '--since', since]);
  process.exit(code);
}

async function cmdShell(branch: string, service?: string) {
  const worktrees = await getWorktrees();
  const wt = requireWorktree(worktrees, branch);

  const svc = service ?? (wt.scope === 'elements' ? 'runner' : 'runner');
  const pkg = wt.scope === 'elements' ? 'elements' : 'telecine';
  const project = dockerProjectName(wt.sanitized, pkg, wt.isMain);
  const container = `${project}-${svc}-1`;

  console.log(chalk.dim(`Shell in: ${container}`));
  const code = await execInteractive('docker', ['exec', '-it', container, '/bin/bash']);
  process.exit(code);
}

async function cmdPorts() {
  const worktrees = await getWorktrees();
  console.log(chalk.bold('Port Allocation\n'));
  console.log('BRANCH'.padEnd(28) + 'POSTGRES'.padEnd(10) + 'VALKEY'.padEnd(10) + 'MAILHOG');
  console.log('─'.repeat(58));
  for (const wt of worktrees) {
    if (wt.isMain) {
      console.log('main'.padEnd(28) + '5432'.padEnd(10) + '6379'.padEnd(10) + '1025');
    } else {
      console.log(
        `${wt.branch.padEnd(28)}${wt.ports.postgres.toString().padEnd(10)}${wt.ports.valkey.toString().padEnd(10)}${wt.ports.mailhog}`,
      );
    }
  }
}

async function cmdInfra(action: string = 'status') {
  const composeFile = join(MONOREPO_ROOT, 'docker-compose.yaml');
  const baseArgs = ['compose', '-f', composeFile, '-p', 'editframe'];

  switch (action) {
    case 'start':
    case 'up': {
      const spinner = ora('Starting shared infrastructure...').start();
      await execSilent('docker', [...baseArgs, 'up', '-d']);
      spinner.succeed(chalk.green('Shared infrastructure started'));
      break;
    }
    case 'stop': {
      const spinner = ora('Stopping shared infrastructure...').start();
      await execSilent('docker', [...baseArgs, 'down']);
      spinner.succeed(chalk.green('Shared infrastructure stopped'));
      break;
    }
    case 'restart': {
      const spinner = ora('Restarting shared infrastructure...').start();
      await execSilent('docker', [...baseArgs, 'restart']);
      spinner.succeed(chalk.green('Shared infrastructure restarted'));
      break;
    }
    case 'status':
    default: {
      const { stdout } = exec('docker', ['ps', '--format', '{{.Names}}\t{{.Status}}', '--filter', 'name=editframe']);
      const lines = stdout.split('\n').filter(Boolean);
      if (lines.length === 0) {
        console.log(chalk.yellow('No shared infrastructure containers running'));
      } else {
        console.log(chalk.bold('Shared Infrastructure:\n'));
        for (const line of lines) {
          const [name, status] = line.split('\t');
          console.log(`  ${status?.startsWith('Up') ? chalk.green('✓') : chalk.red('✗')} ${name}: ${status}`);
        }
      }
    }
  }
}

async function cmdDoctor(branch?: string, showSkills: boolean = false) {
  const worktrees = await getWorktrees();
  const targets = branch ? [requireWorktree(worktrees, branch)] : worktrees.filter((w) => !w.isMain);

  console.log(chalk.bold('Worktree Diagnostics\n'));

  for (const wt of targets) {
    const worktreeDir = join(wt.path, '..');
    console.log(chalk.bold(wt.branch));
    const issues: { msg: string; skill?: string; section?: string }[] = [];

    // Port conflict
    const nc = exec('nc', ['-z', '-w1', 'localhost', String(wt.ports.postgres)]);
    if (nc.exitCode === 0) {
      // port open — is it actually our container?
      const filter = exec('docker', ['ps', '--format', '{{.Names}}', '--filter', `name=${wt.sanitized}`]);
      const containers = filter.stdout.split('\n').filter(Boolean);
      if (containers.length === 0) {
        issues.push({ msg: `Port ${wt.ports.postgres} is in use but no matching container found — likely a port conflict`, skill: 'monorepo-setup-worktrees', section: 'Troubleshooting' });
      }
    }

    // Orphaned containers (exists on disk but containers stopped)
    if (existsSync(worktreeDir)) {
      const running = exec('docker', ['ps', '--format', '{{.Names}}', '--filter', `name=${wt.sanitized}`]).stdout.split('\n').filter(Boolean);
      if (running.length === 0) {
        issues.push({ msg: 'Worktree directory exists but no containers running (paused or failed startup)', skill: 'monorepo-setup-worktrees', section: 'Worktree lifecycle' });
      }
    }

    // Missing database
    if (wt.scope && wt.scope !== 'elements') {
      const dbName = `telecine-${wt.sanitized}`;
      const exists = exec('docker', ['exec', 'editframe-postgres', 'psql', '-U', 'postgres', '-tAc',
        `SELECT 1 FROM pg_database WHERE datname='${dbName}'`]).stdout.trim() === '1';
      if (!exists) {
        issues.push({ msg: `Database '${dbName}' not found`, skill: 'monorepo-setup-worktrees', section: 'Database template' });
      }
    }

    // Missing template DB
    const tmpl = exec('docker', ['exec', 'editframe-postgres', 'psql', '-U', 'postgres', '-tAc',
      "SELECT 1 FROM pg_database WHERE datname='telecine-template'"]).stdout.trim();
    if (tmpl !== '1' && wt.scope !== 'elements') {
      issues.push({ msg: "Template database 'telecine-template' missing — run: scripts/update-template-db", skill: 'monorepo-setup-worktrees', section: 'Stale template' });
    }

    if (issues.length === 0) {
      console.log(chalk.green('  ✓ No issues\n'));
    } else {
      for (const issue of issues) {
        console.log(chalk.yellow(`  ⚠ ${issue.msg}`));
        if (showSkills && issue.skill) {
          console.log(chalk.dim(`    → .skills/internal/${issue.skill}/SKILL.md  (#${issue.section})`));
        }
      }
      console.log('');
    }
  }
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`
${chalk.bold('worktree')} — Unified worktree management

${chalk.bold('Usage:')} worktree <command> [options]

${chalk.bold('Lifecycle:')}
  ${chalk.cyan('create')} <branch> [scope]      Create worktree (scope: elements|web|render, default: web)
  ${chalk.cyan('pause')} <branch>               Stop containers (preserves state)
  ${chalk.cyan('resume')} <branch>              Restart stopped containers
  ${chalk.cyan('remove')} <branch> [--force]    Stop containers, delete worktree + branches
  ${chalk.cyan('upgrade')} <branch> <scope>     Escalate scope (elements→web→render)
  ${chalk.cyan('merge')} <branch>               Merge branch into main across all repos
  ${chalk.cyan('smoke')} <branch>               Run smoke test against render pipeline

${chalk.bold('Inspect:')}
  ${chalk.cyan('list')}                         List all worktrees
  ${chalk.cyan('status')} [branch]              Health check (dirs, containers, db, ports)
  ${chalk.cyan('ports')}                        Port allocation table
  ${chalk.cyan('logs')} [branch] [--service=<name>] [--tail=<N>] [--since=<time>]
  ${chalk.cyan('shell')} <branch> [service]     Open shell in container (default: runner)
  ${chalk.cyan('infra')} [start|stop|restart|status]  Manage shared Traefik/Postgres
  ${chalk.cyan('doctor')} [branch] [--skills]   Diagnose issues
  ${chalk.cyan('deps')} [--workspace=elements|telecine|all] [--format=text|json|mermaid]
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(0);
  }

  const [command, ...rest] = args;

  try {
    switch (command) {
      case 'list':
      case 'ls':
        await cmdList();
        break;

      case 'status':
        await cmdStatus(rest[0]);
        break;

      case 'create':
        await cmdCreate(rest[0], rest[1] ?? 'web');
        break;

      case 'pause':
        await cmdPause(rest[0]);
        break;

      case 'resume':
        await cmdResume(rest[0]);
        break;

      case 'remove': {
        const force = rest.includes('--force');
        const branch = rest.find((a) => !a.startsWith('-'))!;
        await cmdRemove(branch, force);
        break;
      }

      case 'upgrade':
        await cmdUpgrade(rest[0], rest[1]);
        break;

      case 'merge':
        await cmdMerge(rest[0]);
        break;

      case 'smoke':
        await cmdSmoke(rest[0]);
        break;

      case 'logs': {
        const tailArg = rest.find((a) => a.startsWith('--tail='));
        const sinceArg = rest.find((a) => a.startsWith('--since='));
        const svcArg = rest.find((a) => a.startsWith('--service='));
        const branch = rest.find((a) => !a.startsWith('-'));
        await cmdLogs(
          branch,
          svcArg?.split('=')[1],
          tailArg ? parseInt(tailArg.split('=')[1]) : 100,
          sinceArg?.split('=')[1] ?? '5m',
        );
        break;
      }

      case 'shell':
        await cmdShell(rest[0], rest[1]);
        break;

      case 'ports':
        await cmdPorts();
        break;

      case 'infra':
        await cmdInfra(rest[0] ?? 'status');
        break;

      case 'doctor': {
        const showSkills = rest.includes('--skills');
        const branch = rest.find((a) => !a.startsWith('-'));
        await cmdDoctor(branch, showSkills);
        break;
      }

      case 'deps':
        // Delegate to standalone deps script
        await execInteractive(join(SCRIPTS_DIR, 'deps'), rest);
        break;

      default:
        console.error(chalk.red(`Unknown command: ${command}`));
        printHelp();
        process.exit(1);
    }
  } catch (err: any) {
    console.error(chalk.red('Error:'), err.message);
    if (process.env.WORKTREE_DEBUG) console.error(err);
    process.exit(1);
  }
}

main();

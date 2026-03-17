#!/usr/bin/env tsx
/**
 * Unified Worktree Management CLI
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { readFile } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn, spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Utility: run bash script
async function runScript(scriptPath: string, args: string[] = [], options: { silent?: boolean; spinner?: Ora } = {}): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const { silent = false, spinner } = options;
  try {
    if (!silent && spinner) {
      spinner.text = `Running: ${scriptPath} ${args.join(' ')}`;
    }
    return new Promise((resolve, reject) => {
      const proc = spawn('bash', [scriptPath, ...args], {
        cwd: __dirname,
        stdio: silent ? 'pipe' : 'inherit',
      });
      
      let stdout = '';
      let stderr = '';
      
      if (silent) {
        proc.stdout?.on('data', (data) => (stdout += data.toString()));
        proc.stderr?.on('data', (data) => (stderr += data.toString()));
      }
      
      proc.on('close', (code) => {
        resolve({ exitCode: code ?? 0, stdout, stderr });
      });
      proc.on('error', reject);
    });
  } catch (error: any) {
    return { exitCode: error.code || 1, stdout: error.stdout || '', stderr: error.stderr || error.message };
  }
}

// Utility: simple command execution with capture
function execCommand(command: string, args: string[], options: { stdio?: 'pipe' | 'inherit' | 'ignore' } = {}): { exitCode: number; stdout: string; stderr: string } {
  try {
    const result = spawnSync(command, args, {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: options.stdio || 'pipe',
    });
    return {
      exitCode: result.status ?? 0,
      stdout: result.stdout?.toString() || '',
      stderr: result.stderr?.toString() || '',
    };
  } catch (error: any) {
    return { exitCode: error.code || 1, stdout: '', stderr: error.message };
  }
}

// Types
interface WorktreeInfo {
  branch: string;
  path: string;
  sanitized: string;
  domain: string;
  scope?: string;
  isMain: boolean;
  ports: { postgres: number; valkey: number; mailhog: number } | null;
}

// Get all worktrees
async function getWorktrees(): Promise<WorktreeInfo[]> {
  const result = execCommand('git', ['worktree', 'list', '--porcelain']);
  const lines = result.stdout.split('\n');
  const worktrees: WorktreeInfo[] = [];
  let currentPath = '';
  
  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      currentPath = line.substring(8).trim();
    } else if (line.startsWith('branch ')) {
      const branch = line.substring(7).replace('refs/heads/', '');
      const isMain = branch === 'main' || branch === 'master';
      const sanitized = isMain ? 'main' : sanitizeBranchName(branch);
      const domain = isMain ? 'main.localhost' : `${sanitized}.localhost`;
      
      let scope: string | undefined;
      try {
        scope = await readFile(join(currentPath, '.worktree-scope'), 'utf-8').then(c => c.trim()).catch(() => undefined);
      } catch { /* ignore */ }
      
      const offset = isMain ? 0 : calculatePortOffset(branch);
      const ports = !isMain ? {
        postgres: 5432 + offset,
        valkey: 6379 + offset,
        mailhog: 1025 + offset,
      } : { postgres: 5432, valkey: 6379, mailhog: 1025 };
      
      worktrees.push({ branch, path: currentPath, sanitized, domain, scope, isMain, ports });
    }
  }
  return worktrees;
}

function sanitizeBranchName(name: string): string {
  let sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-').slice(0, 63).replace(/-$/, '');
  if (!sanitized || !/^[a-z0-9]/.test(sanitized)) {
    throw new Error(`Invalid branch name after sanitization: ${name} -> ${sanitized}`);
  }
  return sanitized;
}

function calculatePortOffset(branchName: string): number {
  const hash = simpleHash(branchName);
  const slot = (hash % 200) + 1;
  return slot * 100;
}

function simpleHash(str: string): number {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i);
  }
  return sum;
}

// Command: list
async function cmdList() {
  const worktrees = await getWorktrees();
  console.log(chalk.bold('📋 Git Worktrees\n'));
  console.log(chalk.gray('BRANCH'.padEnd(20) + 'PATH'.padEnd(50) + 'SCOPE'.padEnd(15) + 'DOMAIN'.padEnd(30) + 'PORTS'));
  console.log(chalk.gray('─'.repeat(120)));
  
  for (const wt of worktrees) {
    if (wt.isMain) continue;
    const pathDisplay = wt.path.length > 47 ? '...' + wt.path.slice(-44) : wt.path;
    const scope = wt.scope || '-';
    const ports = wt.ports ? `pg:${wt.ports.postgres}` : 'pg:5432';
    console.log(`${wt.branch.padEnd(20)} ${pathDisplay.padEnd(50)} ${scope.padEnd(15)} ${wt.domain.padEnd(30)} ${ports}`);
  }
  
  console.log('\n' + chalk.bold('Main worktree:'));
  const main = worktrees.find(w => w.isMain);
  if (main) {
    console.log(`  ${chalk.green('main')} @ ${main.path}`);
    console.log(`    Domain: http://main.localhost`);
    console.log(`    Services: Telecine:3000, Elements:4321, Postgres:5432`);
  }
  
  console.log(chalk.dim('\n💡 Use: worktree status <branch> for health checks'));
}

// Command: status
async function cmdStatus(branch?: string) {
  const worktrees = await getWorktrees();
  const target = branch ? worktrees.find(w => w.branch === branch) : null;
  if (branch && !target) {
    console.error(chalk.red(`Worktree not found: ${branch}`));
    process.exit(1);
  }
  const checkWts = target ? [target] : worktrees.filter(w => !w.isMain);
  
  for (const wt of checkWts) {
    console.log(chalk.bold(`\n🔍 ${wt.branch} (${wt.scope || 'unknown'} scope)`));
    
    const filesOk = existsSync(wt.path) && existsSync(join(wt.path, '.worktree-scope'));
    console.log(`  ${filesOk ? chalk.green('✓') : chalk.red('✗')} Worktree directory: ${wt.path}`);
    
    if (wt.ports) {
      try {
        const result = execCommand('nc', ['-z', 'localhost', String(wt.ports.postgres)], { stdio: 'ignore' });
        console.log(`  ${result.exitCode === 0 ? chalk.green('✓') : chalk.red('✗')} Postgres port ${wt.ports.postgres}: ${result.exitCode === 0 ? 'listening' : 'closed'}`);
      } catch {
        console.log(`  ○ Postgres port ${wt.ports.postgres}: check failed`);
      }
    }
    
    if (wt.scope && wt.scope !== 'elements') {
      try {
        const result = execCommand('docker', ['exec', '-e', 'PGPASSWORD=postgrespassword', 'editframe-postgres', 'psql', '-U', 'postgres', '-lqt'], { stdio: 'ignore' });
        console.log(`  ${result.exitCode === 0 ? chalk.green('✓') : chalk.red('✗')} Database connectivity`);
      } catch {
        console.log(`  ○ Database: check failed (shared infra?)`);
      }
    }
    
    const elementsEnv = join(wt.path, 'elements', '.env');
    const telecineEnv = join(wt.path, 'telecine', '.env');
    console.log(`  ${existsSync(elementsEnv) ? chalk.green('✓') : chalk.yellow('○')} elements/.env`);
    console.log(`  ${existsSync(telecineEnv) ? chalk.green('✓') : chalk.yellow('○')} telecine/.env`);
  }
}

// Command: create
async function cmdCreate(branch: string, scope: string = 'web') {
  const validScopes = ['elements', 'web', 'render'];
  if (!validScopes.includes(scope)) {
    console.error(chalk.red(`Invalid scope: ${scope}. Must be one of: ${validScopes.join(', ')}`));
    process.exit(1);
  }
  
  const spinner = ora(`Creating worktree: ${branch} (${scope})`).start();
  try {
    const result = await runScript('create-worktree', [branch, scope], { spinner, silent: true });
    if (result.exitCode !== 0) {
      spinner.fail(chalk.red(`Failed to create worktree`));
      console.error(result.stderr);
      process.exit(result.exitCode);
    }
    spinner.succeed(chalk.green(`Worktree created: ${branch}`));
    console.log(`  Domain: http://${sanitizeBranchName(branch)}.localhost`);
    console.log(`  Scope: ${scope}`);
  } catch (error) {
    spinner.fail(chalk.red('Error'));
    console.error(error);
    process.exit(1);
  }
}

// Command: pause
async function cmdPause(branch: string) {
  const spinner = ora(`Pausing worktree: ${branch}`).start();
  const script = join(__dirname, 'pause-worktree');
  const result = await runScript(script, [branch], { spinner, silent: true });
  if (result.exitCode === 0) spinner.succeed(chalk.green(`Paused: ${branch}`));
  else { spinner.fail(chalk.red(`Failed: ${branch}`)); process.exit(result.exitCode); }
}

// Command: resume
async function cmdResume(branch: string) {
  const spinner = ora(`Resuming worktree: ${branch}`).start();
  const script = join(__dirname, 'resume-worktree');
  const result = await runScript(script, [branch], { spinner, silent: true });
  if (result.exitCode === 0) spinner.succeed(chalk.green(`Resumed: ${branch}`));
  else { spinner.fail(chalk.red(`Failed: ${branch}`)); process.exit(result.exitCode); }
}

// Command: remove
async function cmdRemove(branch: string, force: boolean = false) {
  const args = force ? ['--force', branch] : [branch];
  const spinner = ora(`Removing worktree: ${branch}${force ? ' (forced)' : ''}`).start();
  const script = join(__dirname, 'remove-worktree');
  const result = await runScript(script, args, { spinner, silent: true });
  if (result.exitCode === 0) spinner.succeed(chalk.green(`Removed: ${branch}`));
  else { spinner.fail(chalk.red(`Failed: ${branch}`)); process.exit(result.exitCode); }
}

// Command: upgrade
async function cmdUpgrade(branch: string, newScope: string) {
  const spinner = ora(`Upgrading ${branch} to ${newScope}`).start();
  const script = join(__dirname, 'upgrade-worktree');
  const result = await runScript(script, [branch, newScope], { spinner, silent: true });
  if (result.exitCode === 0) spinner.succeed(chalk.green(`Upgraded: ${branch} -> ${newScope}`));
  else { spinner.fail(chalk.red(`Failed to upgrade`)); process.exit(result.exitCode); }
}

// Command: logs
async function cmdLogs(branch?: string, service?: string, tail: number = 100, since = '5m') {
  const worktrees = await getWorktrees();
  let targetWt = branch ? worktrees.find(w => w.branch === branch) : null;
  if (branch && !targetWt) {
    console.error(chalk.red(`Worktree not found: ${branch}`));
    process.exit(1);
  }
  if (!targetWt && worktrees.length > 0) {
    targetWt = worktrees.find(w => !w.isMain) || worktrees.find(w => w.isMain)!;
  }
  if (!targetWt) {
    console.error(chalk.red('No worktrees found'));
    process.exit(1);
  }
  
  const svc = service || (targetWt.scope === 'elements' ? 'dev-projects' : 'web');
  const project = targetWt.isMain ? (targetWt.scope === 'elements' ? 'ef-elements' : 'telecine') : targetWt.sanitized;
  const container = `${project}_${svc}_1`;
  
  const args = ['logs', container, '--tail', String(tail), '--since', since];
  const { exitCode } = execCommand('docker', args, { stdio: 'inherit' });
  if (exitCode !== 0) process.exit(exitCode);
}

// Command: shell
async function cmdShell(branch: string, service?: string) {
  const worktrees = await getWorktrees();
  const wt = worktrees.find(w => w.branch === branch);
  if (!wt) {
    console.error(chalk.red(`Worktree not found: ${branch}`));
    process.exit(1);
  }
  
  const svc = service || (wt.scope === 'elements' ? 'dev-projects' : 'web');
  const project = wt.isMain ? (wt.scope === 'elements' ? 'ef-elements' : 'telecine') : wt.sanitized;
  const container = `${project}_${svc}_1`;
  
  console.log(chalk.dim(`Opening shell in: ${container}`));
  const { exitCode } = execCommand('docker', ['exec', '-it', container, '/bin/bash'], { stdio: 'inherit' });
  if (exitCode !== 0) process.exit(exitCode);
}

// Command: ports
async function cmdPorts() {
  const worktrees = await getWorktrees();
  console.log(chalk.bold('🔌 Port Allocation\n'));
  console.log(`${chalk.bold('Branch').padEnd(20)} ${chalk.bold('Postgres').padEnd(10)} ${chalk.bold('Valkey').padEnd(10)} ${chalk.bold('Mailhog')}`);
  console.log('─'.repeat(50));
  for (const wt of worktrees) {
    if (wt.isMain) continue;
    if (wt.ports) {
      console.log(`${wt.branch.padEnd(20)} ${wt.ports.postgres.toString().padEnd(10)} ${wt.ports.valkey.toString().padEnd(10)} ${wt.ports.mailhog}`);
    }
  }
  console.log(chalk.dim('\nMain worktree uses standard ports: 5432, 6379, 1025'));
}

// Command: infra
async function cmdInfra(action: string = 'status') {
  const spinner = ora(`Infrastructure: ${action}`).start();
  try {
    switch (action) {
      case 'start':
      case 'up':
        execCommand('docker', ['compose', '-f', 'docker-compose.yaml', '-p', 'editframe', 'up', '-d'], { stdio: 'ignore' });
        spinner.succeed(chalk.green('Shared infrastructure started'));
        break;
      case 'stop':
        execCommand('docker', ['compose', '-f', 'docker-compose.yaml', '-p', 'editframe', 'down'], { stdio: 'ignore' });
        spinner.succeed(chalk.green('Shared infrastructure stopped'));
        break;
      case 'restart':
        execCommand('docker', ['compose', '-f', 'docker-compose.yaml', '-p', 'editframe', 'restart'], { stdio: 'ignore' });
        spinner.succeed(chalk.green('Shared infrastructure restarted'));
        break;
      case 'status':
      default:
        const { stdout } = execCommand('docker', ['ps', '--format', '{{.Names}}\t{{.Status}}', '--filter', 'name=editframe']);
        const lines = stdout.split('\n').filter(Boolean);
        if (lines.length === 0) {
          console.log(chalk.yellow('No shared infrastructure containers running'));
        } else {
          console.log(chalk.bold('Shared Infrastructure:\n'));
          for (const line of lines) {
            const [name, status] = line.split('\t');
            const icon = status.includes('Up') ? chalk.green('✓') : chalk.red('✗');
            console.log(`  ${icon} ${name}: ${status}`);
          }
        }
        spinner.stop();
        break;
    }
  } catch (error: any) {
    spinner.fail(chalk.red(`Infrastructure ${action} failed`));
    process.exit(1);
  }
}

// Command: doctor
async function cmdDoctor(branch?: string, skills: boolean = false) {
  const worktrees = await getWorktrees();
  const target = branch ? worktrees.find(w => w.branch === branch) : null;
  if (branch && !target) {
    console.error(chalk.red(`Worktree not found: ${branch}`));
    process.exit(1);
  }
  const checkWts = target ? [target] : worktrees.filter(w => !w.isMain);
  
  console.log(chalk.bold('🔬 Worktree Health Check\n'));
  
  for (const wt of checkWts) {
    console.log(chalk.bold(wt.branch));
    
    const issues: string[] = [];
    
    // Port conflicts
    if (wt.ports) {
      try {
        execCommand('nc', ['-z', 'localhost', String(wt.ports.postgres)], { stdio: 'ignore' });
      } catch {
        issues.push(`Postgres port ${wt.ports.postgres} is already in use (port conflict)`);
      }
    }
    
    // Orphaned containers
    if (wt.sanitized) {
      const { stdout } = execCommand('docker', ['ps', '-a', '--format', '{{.Names}}', '--filter', `name=${wt.sanitized}`]);
      const running = stdout.split('\n').filter(n => n && n.includes('_') && !n.includes('_pause'));
      if (existsSync(wt.path) && running.length === 0) {
        issues.push('Worktree directory exists but no containers found (possibly stopped)');
      }
    }
    
    // Database existence
    if (wt.scope && wt.scope !== 'elements') {
      try {
        const { stdout } = execCommand('docker', ['exec', '-e', 'PGPASSWORD=postgrespassword', 'editframe-postgres', 'psql', '-U', 'postgres', '-tAc', `SELECT 1 FROM pg_database WHERE datname='${wt.sanitized}'`]);
        if (!stdout.trim()) {
          issues.push(`Database telecine-${wt.sanitized} does not exist`);
        }
      } catch { /* ignore */ }
    }
    
    if (issues.length === 0) {
      console.log(chalk.green('  ✓ No issues detected'));
    } else {
      for (const issue of issues) {
        console.log(chalk.yellow('  ⚠'), issue);
      }
      
      if (skills) {
        console.log(chalk.cyan('\n  📚 Relevant skills:'));
        if (issues.some(i => i.includes('port conflict'))) {
          console.log(chalk.dim('    monorepo-setup-worktrees → Troubleshooting'));
        }
        if (issues.some(i => i.includes('Database') && i.includes('does not exist'))) {
          console.log(chalk.dim('    monorepo-setup-worktrees → Database template'));
          console.log(chalk.dim('    debug-production-renders → Database issues'));
        }
        if (issues.some(i => i.includes('containers'))) {
          console.log(chalk.dim('    monorepo-setup-worktrees → Orphaned containers'));
          console.log(chalk.dim('    debug-production-renders → Service failures'));
        }
        console.log(chalk.dim('    Run: cat .skills/internal/<skill>/SKILL.md'));
      }
    }
  }
}

// Commands: smoke, merge
async function cmdSmoke(branch?: string) {
  const script = join(__dirname, 'smoke-test');
  if (branch) {
    await runScript(script, [branch]);
  } else {
    await runScript(script, []);
  }
}

async function cmdMerge(branch: string) {
  const spinner = ora(`Merging worktree: ${branch}`).start();
  const script = join(__dirname, 'merge-worktree');
  const result = await runScript(script, [branch], { spinner, silent: true });
  if (result.exitCode === 0) spinner.succeed(chalk.green(`Merged: ${branch}`));
  else { spinner.fail(chalk.red(`Failed to merge`)); process.exit(result.exitCode); }
}

// Help
function printHelp() {
  console.log(`
${chalk.bold('Worktree Management CLI')}

Usage: worktree <command> [args]

Commands:
  ${chalk.cyan('list')} / ${chalk.cyan('ls')}                    List all worktrees
  ${chalk.cyan('status')} [branch]              Show health details
  ${chalk.cyan('create')} <branch> [scope]      Create new worktree (scope: elements|web|render)
  ${chalk.cyan('pause')} <branch>                Pause worktree services
  ${chalk.cyan('resume')} <branch>               Resume worktree services
  ${chalk.cyan('remove')} <branch> [--force]     Remove worktree
  ${chalk.cyan('upgrade')} <branch> <scope>      Upgrade worktree scope
  ${chalk.cyan('logs')} [branch] [--service=<name>] [--tail=<N>] [--since=<time>]
                                               View service logs
  ${chalk.cyan('shell')} <branch> [service]      Open shell in container
  ${chalk.cyan('ports')}                         Show port allocation
  ${chalk.cyan('infra')} [start|stop|restart|status]  Manage shared Traefik/Postgres
  ${chalk.cyan('doctor')} [branch] [--skills]    Diagnose issues
  ${chalk.cyan('smoke')} [branch]                Run smoke test
  ${chalk.cyan('merge')} <branch>                Merge worktree back to main
  ${chalk.cyan('deps')} [--workspace=...] [--format=text|json|mermaid]
                                               Show dependency graph
`);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }
  
  const command = args[0];
  const commandArgs = args.slice(1);
  
  try {
    switch (command) {
      case 'list':
      case 'ls':
        await cmdList();
        break;
      case 'status':
        await cmdStatus(commandArgs[0]);
        break;
      case 'create':
        await cmdCreate(commandArgs[0], commandArgs[1] || 'web');
        break;
      case 'pause':
        await cmdPause(commandArgs[0]);
        break;
      case 'resume':
        await cmdResume(commandArgs[0]);
        break;
      case 'remove':
        const forceIdx = commandArgs.indexOf('--force');
        const branch = forceIdx > 0 ? commandArgs[forceIdx + 1] || commandArgs[0] : commandArgs[0];
        const force = commandArgs.includes('--force');
        await cmdRemove(branch, force);
        break;
      case 'upgrade':
        await cmdUpgrade(commandArgs[0], commandArgs[1]);
        break;
      case 'logs':
        const tailArg = commandArgs.find(a => a.startsWith('--tail='));
        const sinceArg = commandArgs.find(a => a.startsWith('--since='));
        const serviceArg = commandArgs.find(a => a.startsWith('--service='));
        const tail = tailArg ? parseInt(tailArg.split('=')[1]) : 100;
        const since = sinceArg?.split('=')[1];
        const service = serviceArg?.split('=')[1];
        const logBranch = commandArgs.find(a => !a.startsWith('--'));
        await cmdLogs(logBranch, service, tail, since);
        break;
      case 'shell':
        await cmdShell(commandArgs[0], commandArgs[1]);
        break;
      case 'ports':
        await cmdPorts();
        break;
      case 'infra':
        await cmdInfra(commandArgs[0] || 'status');
        break;
      case 'doctor':
        const skillsFlag = commandArgs.includes('--skills');
        const doctorBranch = commandArgs.find(a => !a.startsWith('--'));
        await cmdDoctor(doctorBranch, skillsFlag);
        break;
      case 'smoke':
        await cmdSmoke(commandArgs[0]);
        break;
      case 'merge':
        await cmdMerge(commandArgs[0]);
        break;
       case 'deps':
         await runScript('deps', commandArgs);
         break;
      default:
        console.error(chalk.red(`Unknown command: ${command}`));
        printHelp();
        process.exit(1);
    }
  } catch (error: any) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

main();

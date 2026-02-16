#!/usr/bin/env npx tsx
/**
 * Parallel Agent Runner
 * 
 * Run cursor-agent on multiple files in parallel.
 * Files come from stdin (piped) or --glob/--files.
 * Prompt from --prompt or --prompt-file.
 * 
 * Examples:
 *   grep -rl "pattern" src | ./parallel-agents.ts -P prompt.md -x
 *   ./parallel-agents.ts -g "src/*.ts" -p "Review {file}" -x
 */

import { spawn, execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, basename } from "node:path";
import { glob } from "glob";
import chalk from "chalk";
import * as readline from "node:readline";

// ============================================================================
// Types
// ============================================================================

export interface AgentConfig {
  maxAgents: number;
  workspace: string;
  model: string;
  dryRun: boolean;
  cursorCommand?: string;
}

export interface FileSelector {
  // Glob pattern to find files
  glob?: string;
  // Regex to filter file contents (only include files matching)
  grep?: RegExp | string;
  // Explicit file list
  files?: string[];
  // Custom filter function
  filter?: (filePath: string, content: string) => boolean;
  // Base directory for glob (defaults to workspace)
  baseDir?: string;
}

export interface PromptTemplate {
  // Template string with {file} placeholder
  template: string;
  // Optional preamble for sub-agent behavior
  preamble?: string;
}

export interface WorkerResult {
  workerId: number;
  filePath: string;
  success: boolean;
  output: string[];
  durationMs: number;
}

export interface RunResult {
  total: number;
  succeeded: number;
  failed: number;
  results: WorkerResult[];
}

// ============================================================================
// Default sub-agent preamble
// ============================================================================

const DEFAULT_PREAMBLE = `You are a sub-agent in an orchestrated workflow. Follow these rules:
- Do NOT suggest next steps or ask what to do next
- Do NOT open with greetings or explanations of your approach
- Do NOT close with summaries or offers to help further
- If the work is already complete, just say "No changes needed" and terminate
- Be concise and direct - just make the changes

## Testing Instructions

**You are not done until all tests pass.**

After making changes, run the relevant test suite to verify everything still works.
Fix any failures before considering the task complete.

`;

// ============================================================================
// File Discovery
// ============================================================================

/** Read file list from stdin (one path per line) */
export async function readFilesFromStdin(): Promise<string[]> {
  return new Promise((resolve) => {
    const files: string[] = [];
    const rl = readline.createInterface({
      input: process.stdin,
      terminal: false,
    });
    
    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        files.push(trimmed);
      }
    });
    
    rl.on("close", () => resolve(files));
    
    // Handle case where stdin is empty/TTY
    if (process.stdin.isTTY) {
      resolve([]);
    }
  });
}

/** Check if stdin has data (is being piped to) */
export function hasStdin(): boolean {
  return !process.stdin.isTTY;
}

export async function findFiles(
  selector: FileSelector,
  workspace: string
): Promise<string[]> {
  let files: string[] = [];
  const baseDir = selector.baseDir || workspace;

  // Start with explicit files if provided
  if (selector.files && selector.files.length > 0) {
    files = selector.files.map(f => 
      f.startsWith("/") ? f : join(workspace, f)
    );
  }
  // Or use glob pattern
  else if (selector.glob) {
    const pattern = selector.glob.startsWith("/") 
      ? selector.glob 
      : join(baseDir, selector.glob);
    files = await glob(pattern, { nodir: true });
  }

  // Apply grep filter
  if (selector.grep) {
    const regex = typeof selector.grep === "string" 
      ? new RegExp(selector.grep) 
      : selector.grep;
    
    files = files.filter(file => {
      try {
        const content = readFileSync(file, "utf-8");
        return regex.test(content);
      } catch {
        return false;
      }
    });
  }

  // Apply custom filter
  if (selector.filter) {
    files = files.filter(file => {
      try {
        const content = readFileSync(file, "utf-8");
        return selector.filter!(file, content);
      } catch {
        return false;
      }
    });
  }

  // Convert to relative paths
  return files.map(f => relative(workspace, f));
}

// ============================================================================
// Prompt Generation
// ============================================================================

export function buildPrompt(template: PromptTemplate, filePath: string): string {
  const preamble = template.preamble ?? DEFAULT_PREAMBLE;
  const body = template.template.replace(/\{file\}/g, filePath);
  return preamble + body;
}

// ============================================================================
// Cursor Command Detection
// ============================================================================

export function detectCursorCommand(): string {
  try {
    execSync("which cursor", { stdio: "ignore" });
    return "cursor";
  } catch {
    try {
      execSync("which cursor-agent", { stdio: "ignore" });
      return "cursor-agent";
    } catch {
      throw new Error("Neither 'cursor' nor 'cursor-agent' found in PATH");
    }
  }
}

// ============================================================================
// Agent Execution
// ============================================================================

async function runAgent(
  filePath: string,
  prompt: string,
  workerId: number,
  config: AgentConfig,
  onProgress: (workerId: number, status: string) => void
): Promise<WorkerResult> {
  const output: string[] = [];
  const startTime = Date.now();

  const cursorCmd = config.cursorCommand || "cursor";
  const args = [
    "agent",
    "--print",
    "--workspace",
    config.workspace,
    "--model",
    config.model,
    "--force",
    "--output-format",
    "stream-json",
    "--stream-partial-output",
    prompt,
  ];

  const proc = spawn(cursorCmd, args, {
    cwd: config.workspace,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let hasError = false;

  proc.stdout?.on("data", (data) => {
    const lines = data.toString().split("\n").filter((l: string) => l.trim());
    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        
        if (json.type === "thinking" && json.subtype === "delta") {
          onProgress(workerId, "thinking");
        }
        
        if (json.type === "assistant" && json.message?.content) {
          for (const item of json.message.content) {
            if (item.type === "text" && item.text) {
              output.push(item.text);
            }
          }
        }
        
        if (json.type === "tool_call") {
          onProgress(workerId, `tool: ${json.name || "unknown"}`);
          output.push(chalk.cyan(`  → ${json.name || "tool"}`));
        }
        
        if (json.type === "result" && json.is_error) {
          hasError = true;
          output.push(chalk.red(`Error: ${json.result || "Unknown error"}`));
        }
      } catch {
        if (line.trim()) {
          output.push(chalk.gray(line));
        }
      }
    }
  });

  proc.stderr?.on("data", (data) => {
    const text = data.toString().trim();
    if (text) {
      hasError = true;
      output.push(chalk.red(`stderr: ${text}`));
    }
  });

  const exitCode = await new Promise<number>((resolve) => {
    proc.on("exit", (code) => resolve(code || 0));
    proc.on("error", (err) => {
      output.push(chalk.red(`Process error: ${err.message}`));
      resolve(1);
    });
  });

  return {
    workerId,
    filePath,
    success: exitCode === 0 && !hasError,
    output,
    durationMs: Date.now() - startTime,
  };
}

// ============================================================================
// Worker Pool
// ============================================================================

async function worker(
  workerId: number,
  queue: string[],
  promptTemplate: PromptTemplate,
  config: AgentConfig,
  results: WorkerResult[],
  onProgress: (workerId: number, status: string) => void,
  onComplete: (result: WorkerResult) => void
): Promise<void> {
  while (true) {
    const filePath = queue.shift();
    if (!filePath) break;
    
    onProgress(workerId, `starting: ${basename(filePath)}`);
    const prompt = buildPrompt(promptTemplate, filePath);
    const result = await runAgent(filePath, prompt, workerId, config, onProgress);
    results.push(result);
    onComplete(result);
  }
}

// ============================================================================
// Progress Display
// ============================================================================

function updateProgressLine(
  workerStatus: Map<number, string>,
  completed: number,
  total: number,
  failed: number
): void {
  const statusParts: string[] = [];
  for (const [id, status] of workerStatus) {
    statusParts.push(chalk.cyan(`W${id}:`) + chalk.gray(status.substring(0, 20)));
  }
  
  const progress = `${completed}/${total}`;
  const failedStr = failed > 0 ? chalk.red(` ✗${failed}`) : "";
  
  process.stdout.write(
    `\r${chalk.yellow("⏳")} ${progress}${failedStr} | ${statusParts.join(" | ")}`.padEnd(120) + "\r"
  );
}

function printResult(result: WorkerResult): void {
  process.stdout.write("\r" + " ".repeat(120) + "\r");
  
  const status = result.success ? chalk.green("✓") : chalk.red("✗");
  const duration = (result.durationMs / 1000).toFixed(1);
  const fileName = basename(result.filePath);
  
  console.log(`${status} ${chalk.blue(`W${result.workerId}`)} ${fileName} ${chalk.gray(`(${duration}s)`)}`);
  
  // Show unique output lines
  const seen = new Set<string>();
  for (const line of result.output) {
    if (line.trim() && !seen.has(line)) {
      console.log(chalk.gray(`  ${line}`));
      seen.add(line);
    }
  }
}

// ============================================================================
// Main Runner
// ============================================================================

export async function runParallelAgents(
  files: string[],
  promptTemplate: PromptTemplate,
  config: AgentConfig
): Promise<RunResult> {
  const results: WorkerResult[] = [];
  
  if (config.dryRun) {
    console.log(chalk.yellow("DRY RUN - Would process:"));
    for (const file of files) {
      console.log(chalk.gray(`  ${file}`));
    }
    return { total: files.length, succeeded: 0, failed: 0, results: [] };
  }

  // Detect cursor command
  if (!config.cursorCommand) {
    config.cursorCommand = detectCursorCommand();
  }

  console.log(chalk.yellow(`Starting ${config.maxAgents} worker(s)...\n`));
  
  const queue = [...files];
  const workerStatus = new Map<number, string>();
  let completedCount = 0;
  let failedCount = 0;
  
  const onProgress = (workerId: number, status: string) => {
    workerStatus.set(workerId, status);
    updateProgressLine(workerStatus, completedCount, files.length, failedCount);
  };
  
  const onComplete = (result: WorkerResult) => {
    completedCount++;
    if (!result.success) failedCount++;
    workerStatus.delete(result.workerId);
    printResult(result);
  };
  
  // Start workers
  const workerPromises: Promise<void>[] = [];
  for (let i = 0; i < config.maxAgents; i++) {
    workerStatus.set(i, "starting");
    workerPromises.push(
      worker(i, queue, promptTemplate, config, results, onProgress, onComplete)
    );
  }
  
  await Promise.all(workerPromises);
  
  // Clear progress line
  process.stdout.write("\r" + " ".repeat(120) + "\r");

  return {
    total: files.length,
    succeeded: completedCount - failedCount,
    failed: failedCount,
    results,
  };
}

// ============================================================================
// CLI Interface
// ============================================================================

interface CLIOptions {
  glob?: string;
  grep?: string;
  files?: string[];
  prompt?: string;
  promptFile?: string;
  agents: number;
  workspace: string;
  model: string;
  execute: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    agents: 4,
    workspace: process.cwd(),
    model: "auto",
    execute: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--glob":
      case "-g":
        options.glob = args[++i];
        break;
      case "--grep":
        options.grep = args[++i];
        break;
      case "--files":
      case "-f":
        options.files = [];
        while (i + 1 < args.length && !args[i + 1].startsWith("-")) {
          options.files.push(args[++i]);
        }
        break;
      case "--prompt":
      case "-p":
        options.prompt = args[++i];
        break;
      case "--prompt-file":
      case "-P":
        options.promptFile = args[++i];
        break;
      case "--agents":
      case "-j":
        options.agents = parseInt(args[++i], 10) || options.agents;
        break;
      case "--workspace":
      case "-w":
        options.workspace = args[++i] || options.workspace;
        break;
      case "--model":
      case "-m":
        options.model = args[++i] || options.model;
        break;
      case "--execute":
      case "--run":
      case "-x":
        options.execute = true;
        break;
      case "--help":
      case "-h":
        console.log(`
Parallel Agent Runner - Run cursor-agent on multiple files

Usage: 
  <file-finder> | ${basename(process.argv[1])} --prompt-file <prompt.md> [options]
  ${basename(process.argv[1])} --glob <pattern> --prompt <text> [options]

File Selection (pick one):
  <stdin>                 Pipe file list (one per line) from any command
  --glob, -g <pattern>    Glob pattern to find files
  --grep <pattern>        Filter files by content (regex)
  --files, -f <file...>   Explicit list of files

Prompt (required):
  --prompt, -p <text>     Prompt template (use {file} for file path)
  --prompt-file, -P <path>  Read prompt from file

Execution:
  --execute, -x           Actually run agents (default: dry run)
  --agents, -j <n>        Number of parallel workers (default: 4)
  --workspace, -w <path>  Workspace directory (default: cwd)
  --model, -m <model>     Model to use (default: auto)

Examples:
  # Pipe files from grep
  grep -rl "ctx.wait" src/**/*.ts | ${basename(process.argv[1])} -P prompts/fix-waits.md -x

  # Use built-in glob + grep
  ${basename(process.argv[1])} -g "**/*.ts" --grep "TODO" -p "Fix TODOs in {file}" -x

  # Explicit file list
  ${basename(process.argv[1])} -f src/a.ts src/b.ts -p "Review {file}" -x
  
  # Dry run (default) - see what would happen
  grep -rl "pattern" . | ${basename(process.argv[1])} -p "Fix {file}"
`);
        process.exit(0);
    }
  }

  return options;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main() {
  const options = parseArgs();
  
  // Check for stdin
  const stdinAvailable = hasStdin();

  // Validate options
  if (!stdinAvailable && !options.glob && !options.files?.length) {
    console.error(chalk.red("Error: Must pipe files or specify --glob or --files"));
    console.error(chalk.gray("Run with --help for usage"));
    process.exit(1);
  }

  if (!options.prompt && !options.promptFile) {
    console.error(chalk.red("Error: Must specify --prompt or --prompt-file"));
    console.error(chalk.gray("Run with --help for usage"));
    process.exit(1);
  }

  // Load prompt
  let promptText = options.prompt || "";
  if (options.promptFile) {
    if (!existsSync(options.promptFile)) {
      console.error(chalk.red(`Error: Prompt file not found: ${options.promptFile}`));
      process.exit(1);
    }
    promptText = readFileSync(options.promptFile, "utf-8").trim();
  }

  // Find files
  let files: string[];
  
  if (stdinAvailable) {
    // Read from stdin
    console.error(chalk.cyan("Reading files from stdin..."));
    files = await readFilesFromStdin();
    // Normalize paths relative to workspace
    files = files.map(f => f.startsWith("/") ? relative(options.workspace, f) : f);
  } else {
    console.error(chalk.cyan("Finding files..."));
    files = await findFiles(
      {
        glob: options.glob,
        grep: options.grep,
        files: options.files,
      },
      options.workspace
    );
  }

  if (files.length === 0) {
    console.error(chalk.yellow("No files found"));
    process.exit(0);
  }

  console.error(chalk.green(`Found ${files.length} file(s)`));
  console.error("");

  // Run agents
  const result = await runParallelAgents(
    files,
    { template: promptText },
    {
      maxAgents: options.agents,
      workspace: options.workspace,
      model: options.model,
      dryRun: !options.execute,
    }
  );

  // Summary
  console.error("");
  console.error(chalk.cyan("━".repeat(60)));
  console.error(options.execute ? chalk.green("✓ Complete") : chalk.green("✓ Dry run complete"));
  console.error(chalk.cyan("━".repeat(60)));
  console.error(`  Total: ${result.total}`);
  if (options.execute) {
    console.error(`  Succeeded: ${result.succeeded}`);
    if (result.failed > 0) {
      console.error(chalk.red(`  Failed: ${result.failed}`));
    }
  }
  
  if (!options.execute) {
    console.error("");
    console.error(chalk.yellow("Add -x to execute"));
  }

  process.exit(result.failed > 0 ? 1 : 0);
}

// Run if executed directly
if (process.argv[1].includes("parallel-agents")) {
  main().catch((err) => {
    console.error(chalk.red("Error:"), err);
    process.exit(1);
  });
}

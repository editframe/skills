#!/usr/bin/env npx tsx
/**
 * Element Sandbox CLI Tool
 * 
 * Usage:
 *   elements/scripts/ef list                    # List all sandboxes
 *   elements/scripts/ef open <name>             # Open sandbox in browser
 *   elements/scripts/ef run [name] [options]    # Run scenarios as tests
 *   elements/scripts/ef profile <name> [options] # Profile a scenario
 *   elements/scripts/ef info <subcommand> [options] # Query test session data
 * 
 * Run options:
 *   --verbose, -v    Show all test names (default: only failures shown)
 *   --scenario <pat> Filter scenarios by pattern
 *   --watch          Re-run on file changes
 *   --concurrency <n>, -j <n>  Number of parallel workers
 */

import { SCRIPT_NAME } from "./ef-utils/paths.js";
import { listSandboxes, showCategories } from "./ef-list.js";
import { searchSandboxes } from "./ef-search.js";
import { showRelated } from "./ef-related.js";
import { openSandbox, browserInstance as openBrowserInstance, contextInstance as openContextInstance } from "./ef-open.js";
import { runScenarios, browserInstance as runBrowserInstance, contextInstance as runContextInstance } from "./ef-run.js";
import { profileScenario } from "./ef-profile.js";
import { screenshotSandbox } from "./ef-screenshot.js";
import { handleInfoCommand } from "./ef-info/index.js";
import type { RunOptions, ScreenshotOptions } from "./ef-utils/types.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  
  // Handle help flag
  if (command === "--help" || command === "-h" || command === "help") {
    console.log(`
Element Sandbox CLI Tool

Usage:
  ${SCRIPT_NAME} <command> [options]

Commands:
  categories                    Show all categories and subcategories
  list [name] [options]        List sandboxes (grouped by category, or scenarios for specific sandbox)
  search <query>               Search sandboxes by keyword (matches name, description, category)
  related [name]                Show sandbox relationships (uses/usedBy)
  open [name]                   Open scenario viewer in browser (optionally with specific sandbox)
  run [name] [options]          Run scenarios as tests
  profile <name> [options]      Profile a scenario
  screenshot <name> [options]    Capture screenshot of sandbox/scenario (chrome-free)
  info <subcommand> [options]   Query test session data (progressive discovery)
  
Info Subcommands:
  summary                       Show session summary
  errors [type]                 Show error analysis (optionally filtered by type)
  test <name>                   Show individual test details
  search <query>                Search tests and errors

List Options:
  --category <name>              Filter by category (elements, gui, demos) or category/subcategory
  --json                         Output JSON for machine parsing

Search Options:
  --json                         Output JSON for machine parsing

Run Options:
  --scenario <pattern>          Run scenarios matching pattern (supports * wildcard)
  --concurrency, -j <n>         Number of parallel workers (default: CPU count)
  --watch                       Watch mode - re-run on file changes (disables profiling by default)
  --profile                     Enable CPU profiling and show hotspots (default: enabled unless --watch)
  --no-profile                  Disable CPU profiling
  --output <dir>                Save profiles to directory (creates .cpuprofile files)
  --baseline <dir>              Compare profiles against baseline directory
  --baseline-threshold <config> Fail on regressions exceeding thresholds
                                  Format: "maxDurationIncreaseMs=100,maxHotspotIncreaseMs=10"
                                  Options: maxDurationIncreaseMs, maxDurationIncreasePercent,
                                           maxHotspotIncreaseMs, maxHotspotIncreasePercent

Screenshot Options:
  --scenario <name>             Run specific scenario before capturing screenshot
  --output <path>               Output file path (default: .ef-screenshots/<sandbox>[-<scenario>]-<timestamp>.png)
  --width <px>                  Viewport width (default: auto)
  --height <px>                 Viewport height (default: auto)

Examples:
  ${SCRIPT_NAME} categories                      # Show all categories and subcategories
  ${SCRIPT_NAME} list                            # List all sandboxes grouped by category
  ${SCRIPT_NAME} list --category elements        # List sandboxes in elements category
  ${SCRIPT_NAME} list --category gui/timeline    # List sandboxes in gui/timeline subcategory
  ${SCRIPT_NAME} list EFDial                     # Show scenarios for EFDial sandbox
  ${SCRIPT_NAME} search "video track"            # Search for sandboxes matching keywords
  ${SCRIPT_NAME} search waveform --json          # Search with JSON output
  ${SCRIPT_NAME} open                            # Open scenario viewer with all sandboxes
  ${SCRIPT_NAME} open EFDial                     # Open scenario viewer with EFDial sandbox selected
  ${SCRIPT_NAME} run EFDial
  ${SCRIPT_NAME} run EFDial --scenario "normalizes*"
  ${SCRIPT_NAME} run EFDial --profile                      # Run with profiling
  ${SCRIPT_NAME} run --profile                             # Profile all sandboxes (CI mode)
  ${SCRIPT_NAME} run -j 4                                  # Run with 4 parallel workers
  ${SCRIPT_NAME} profile EFDial --scenario "rotates through full circle"
  ${SCRIPT_NAME} screenshot CompactnessScene               # Screenshot default template
  ${SCRIPT_NAME} screenshot CompactnessScene --scenario "renders with timegroup"  # Screenshot after scenario
  ${SCRIPT_NAME} screenshot CompactnessScene --output ./screenshot.png --width 800 --height 600
  
Info Command (Progressive Discovery):
  ${SCRIPT_NAME} info summary --session <id>              # Session overview
  ${SCRIPT_NAME} info errors --session <id>               # Error analysis
  ${SCRIPT_NAME} info errors <type> --session <id>        # Specific error details
  ${SCRIPT_NAME} info errors --unexpected --session <id>  # Only unexpected errors
  ${SCRIPT_NAME} info test "<scenario-name>" --session <id>              # Test details (scenario name only)
  ${SCRIPT_NAME} info test "SandboxName:<scenario-name>" --session <id>  # Test details (with sandbox prefix)
  ${SCRIPT_NAME} info test "<scenario-name>" --logs --session <id>       # Test logs
  ${SCRIPT_NAME} info test "<scenario-name>" --profile --session <id>   # Performance profile
  ${SCRIPT_NAME} info search "<query>" --session <id>     # Search tests/errors
  
  Add --json to any info command for machine-readable output
`);
    process.exit(0);
  }
  
  if (command === "categories") {
    await showCategories();
    process.exit(0);
  }
  
  if (command === "search") {
    const query = args.slice(1).filter(a => !a.startsWith("--")).join(" ");
    const json = args.includes("--json");
    if (!query) {
      console.error("\n❌ Usage: ef search <query> [--json]\n");
      console.error("Examples:");
      console.error("  ef search video track");
      console.error("  ef search waveform");
      console.error("  ef search timeline controls\n");
      process.exit(1);
    }
    await searchSandboxes(query, json);
    process.exit(0);
  }
  
  if (command === "list" || !command) {
    // Parse list command options
    let categoryFilter: string | undefined;
    let sandboxName: string | undefined;
    let json = false;
    
    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--category" && args[i + 1]) {
        categoryFilter = args[i + 1];
        i++;
      } else if (args[i] === "--json") {
        json = true;
      } else if (!args[i].startsWith("--")) {
        // First non-flag argument is sandbox name
        sandboxName = args[i];
      }
    }
    
    await listSandboxes(categoryFilter, sandboxName, json);
    process.exit(0);
  }
  
  if (command === "related") {
    const sandboxName = args[1];
    await showRelated(sandboxName);
    process.exit(0);
  }
  
  if (command === "open") {
    const sandboxName = args[1];
    await openSandbox(sandboxName);
    // Keep process alive - wait for page to close or user interrupt
    console.log("Press Ctrl+C to exit.\n");
    await new Promise(() => {}); // Never resolves, keeps process alive
  }
  
  if (command === "run") {
    const options: RunOptions = {};
    let i = 1;
    while (i < args.length) {
      if (args[i] === "--scenario" && args[i + 1]) {
        options.scenarioPattern = args[i + 1];
        i += 2;
      } else if (args[i] === "--watch") {
        options.watch = true;
        i++;
      } else if (args[i] === "--profile") {
        options.profile = true;
        i++;
      } else if (args[i] === "--no-profile") {
        options.profile = false;
        i++;
      } else if (args[i] === "--output" && args[i + 1]) {
        options.output = args[i + 1];
        i += 2;
      } else if (args[i] === "--baseline" && args[i + 1]) {
        options.baseline = args[i + 1];
        i += 2;
      } else if (args[i] === "--baseline-threshold" && args[i + 1]) {
        // Parse threshold config: "maxDurationIncreaseMs=100,maxHotspotIncreaseMs=10"
        const thresholdStr = args[i + 1];
        options.baselineThreshold = {};
        for (const part of thresholdStr.split(",")) {
          const [key, value] = part.split("=");
          const numValue = parseFloat(value);
          if (key === "maxDurationIncreaseMs") {
            options.baselineThreshold.maxDurationIncreaseMs = numValue;
          } else if (key === "maxDurationIncreasePercent") {
            options.baselineThreshold.maxDurationIncreasePercent = numValue;
          } else if (key === "maxHotspotIncreaseMs") {
            options.baselineThreshold.maxHotspotIncreaseMs = numValue;
          } else if (key === "maxHotspotIncreasePercent") {
            options.baselineThreshold.maxHotspotIncreasePercent = numValue;
          }
        }
        i += 2;
      } else if ((args[i] === "--concurrency" || args[i] === "-j") && args[i + 1]) {
        options.concurrency = parseInt(args[i + 1], 10);
        i += 2;
      } else if (args[i] === "--verbose" || args[i] === "-v") {
        options.verbose = true;
        i++;
      } else if (!options.sandboxName && !args[i].startsWith("--")) {
        options.sandboxName = args[i];
        i++;
      } else {
        i++;
      }
    }
    
    // Default: enable profiling unless in watch mode (watch mode is typically interactive)
    if (options.profile === undefined) {
      options.profile = !options.watch;
    }
    
    const exitCode = await runScenarios(options);
    process.exit(exitCode);
  }
  
  if (command === "profile") {
    const sandboxName = args[1];
    const scenarioName = args.find((a) => a.startsWith("--scenario"))?.split("=")[1] || args[3];
    const outputPath =
      args.find((a) => a.startsWith("--output"))?.split("=")[1] || "./profile.cpuprofile";
    
    if (!sandboxName || !scenarioName) {
      console.error(`Usage: ${SCRIPT_NAME} profile <sandbox-name> --scenario <scenario-name> [--output <path>]`);
      process.exit(1);
    }
    
    await profileScenario(sandboxName, scenarioName, outputPath);
    process.exit(0);
  }
  
  if (command === "info") {
    await handleInfoCommand(args);
    process.exit(0);
  }
  
  if (command === "screenshot") {
    const screenshotOptions: ScreenshotOptions = {
      sandboxName: "",
    };
    
    let i = 1;
    while (i < args.length) {
      if (args[i] === "--scenario" && args[i + 1]) {
        screenshotOptions.scenarioName = args[i + 1];
        i += 2;
      } else if (args[i] === "--output" && args[i + 1]) {
        screenshotOptions.outputPath = args[i + 1];
        i += 2;
      } else if (args[i] === "--width" && args[i + 1]) {
        screenshotOptions.width = parseInt(args[i + 1], 10);
        i += 2;
      } else if (args[i] === "--height" && args[i + 1]) {
        screenshotOptions.height = parseInt(args[i + 1], 10);
        i += 2;
      } else if (!screenshotOptions.sandboxName && !args[i].startsWith("--")) {
        screenshotOptions.sandboxName = args[i];
        i++;
      } else {
        i++;
      }
    }
    
    if (!screenshotOptions.sandboxName) {
      console.error(`Error: sandbox name is required`);
      console.error(`Usage: ${SCRIPT_NAME} screenshot <sandbox-name> [--scenario <name>] [--output <path>] [--width <px>] [--height <px>]`);
      process.exit(1);
    }
    
    await screenshotSandbox(screenshotOptions);
    process.exit(0);
  }
  
  console.error(`Unknown command: ${command}`);
  console.error(`Usage: ${SCRIPT_NAME} [list|open|run|profile|info|screenshot]`);
  process.exit(1);
}

// Set up signal handlers to ensure cleanup on interrupt
let cleanupInProgress = false;

const cleanup = async () => {
  if (cleanupInProgress) return;
  cleanupInProgress = true;
  try {
    // Cleanup browser instances from both open and run commands
    if (openContextInstance) {
      await openContextInstance.close().catch(() => {});
    }
    if (openBrowserInstance) {
      await openBrowserInstance.close().catch(() => {});
    }
    if (runContextInstance) {
      await runContextInstance.close().catch(() => {});
    }
    if (runBrowserInstance) {
      await runBrowserInstance.close().catch(() => {});
    }
  } catch {
    // Ignore cleanup errors
  }
  process.exit(1);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

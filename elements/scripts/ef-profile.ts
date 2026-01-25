#!/usr/bin/env npx ts-node
/**
 * CLI command for profiling scenarios
 * 
 * Usage:
 *   ef profile <sandbox> <scenario> [options]
 * 
 * Options:
 *   --json                Output as JSON instead of text
 *   --baseline <file>     Compare against baseline profile
 *   --save <file>         Save profile to file
 *   --output <file>       Alias for --save
 *   --top <n>             Show top N hotspots (default: 20)
 *   --verbose             Show detailed analysis
 * 
 * Examples:
 *   ef profile EFCanvas basic
 *   ef profile EFCanvas basic --json
 *   ef profile EFCanvas basic --baseline .profiles/baseline.cpuprofile
 *   ef profile EFCanvas basic --save .profiles/$(date +%Y%m%d-%H%M%S).cpuprofile
 */

import { chromium, type Browser, type Page, type BrowserContext } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import {
  analyzeProfile,
  formatProfileAnalysis,
  formatProfileAnalysisJSON,
  compareProfiles,
  formatProfileComparison,
  formatProfileComparisonJSON,
  hasRegression,
} from "../packages/elements/src/profiling/index.js";
import type { CPUProfile, BaselineThreshold } from "../packages/elements/src/profiling/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CliOptions {
  sandbox: string;
  scenario: string;
  json: boolean;
  baseline?: string;
  save?: string;
  topN: number;
  verbose: boolean;
}

function parseArgs(): CliOptions | null {
  const args = process.argv.slice(2);
  
  if (args.length < 2 || args[0] === "--help" || args[0] === "-h") {
    printHelp();
    return null;
  }

  const sandbox = args[0];
  const scenario = args[1];
  
  let json = false;
  let baseline: string | undefined;
  let save: string | undefined;
  let topN = 20;
  let verbose = false;

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--json":
        json = true;
        break;
      case "--baseline":
        baseline = args[++i];
        break;
      case "--save":
      case "--output":
        save = args[++i];
        break;
      case "--top":
        topN = parseInt(args[++i], 10);
        break;
      case "--verbose":
        verbose = true;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        return null;
    }
  }

  return { sandbox, scenario, json, baseline, save, topN, verbose };
}

function printHelp() {
  console.log(`
🔬 Profile Scenarios

Usage:
  ef profile <sandbox> <scenario> [options]

Options:
  --json                Output as JSON instead of text
  --baseline <file>     Compare against baseline profile
  --save <file>         Save profile to file
  --output <file>       Alias for --save
  --top <n>             Show top N hotspots (default: 20)
  --verbose             Show detailed analysis

Examples:
  ef profile EFCanvas basic
  ef profile EFCanvas basic --json
  ef profile EFCanvas basic --baseline .profiles/baseline.cpuprofile
  ef profile EFCanvas basic --save .profiles/\$(date +%Y%m%d-%H%M%S).cpuprofile
  `);
}

function findMonorepoRoot(): string | null {
  let currentDir = __dirname;
  while (currentDir !== path.dirname(currentDir)) {
    if (
      fs.existsSync(path.join(currentDir, "elements")) &&
      fs.existsSync(path.join(currentDir, "telecine"))
    ) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}

async function profileScenario(
  sandbox: string,
  scenario: string,
  options: CliOptions
): Promise<void> {
  const monorepoRoot = findMonorepoRoot();
  if (!monorepoRoot) {
    console.error("Could not find monorepo root");
    process.exit(1);
  }

  const wsEndpointPath = path.join(monorepoRoot, ".wsEndpoint.json");
  if (!fs.existsSync(wsEndpointPath)) {
    console.error("Browser server not running. Start with: ./scripts/start-host-chrome");
    process.exit(1);
  }

  const { wsEndpoint } = JSON.parse(fs.readFileSync(wsEndpointPath, "utf-8"));
  
  if (!options.json) {
    console.log(`\n🔬 Profiling ${sandbox}::${scenario}`);
    console.log(`📡 Connecting to browser: ${wsEndpoint}\n`);
  }

  const browser = await chromium.connect(wsEndpoint);
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  try {
    // Navigate to sandbox with scenario
    const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";
    const url = `http://${worktreeDomain}:4321/sandbox/${encodeURIComponent(sandbox)}/${encodeURIComponent(scenario)}?controlled=true&profile=true`;
    
    if (!options.json) {
      console.log(`📄 Loading ${url}...`);
    }
    
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

    // Wait for profiling functions to be exposed
    await page.waitForFunction(() => typeof window.__startProfiling === "function", { timeout: 10000 });

    // Start profiling
    await page.evaluate(async () => {
      if (window.__startProfiling) {
        await window.__startProfiling(JSON.stringify({ samplingInterval: 100 }));
      }
    });

    // Click the "Run" button to execute the scenario
    if (!options.json) {
      console.log(`⏳ Running scenario...`);
    }
    
    await page.click('button:has-text("Run")');

    // Wait for scenario to complete (look for status indicators)
    await page.waitForFunction(
      () => {
        const button = document.querySelector('button:has-text("Run")');
        return button && !button.textContent?.includes("Running");
      },
      { timeout: 60000 }
    );

    // Stop profiling
    const profileJson = await page.evaluate(async () => {
      if (window.__stopProfiling) {
        return await window.__stopProfiling();
      }
      return null;
    });

    if (!profileJson) {
      console.error("Failed to get profile data");
      process.exit(1);
    }

    const profile: CPUProfile = JSON.parse(profileJson);

    // Save raw profile if requested
    if (options.save) {
      const savePath = path.resolve(path.join(monorepoRoot, "elements"), options.save);
      const saveDir = path.dirname(savePath);
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }
      fs.writeFileSync(savePath, JSON.stringify(profile, null, 2));
      if (!options.json) {
        console.log(`\n💾 Profile saved to: ${savePath}`);
      }
    }

    // Analyze profile
    const analysis = analyzeProfile(profile, {
      filterNodeModules: true,
      filterInternals: true,
      topN: options.topN,
    });

    // Compare with baseline if provided
    if (options.baseline) {
      const baselinePath = path.resolve(path.join(monorepoRoot, "elements"), options.baseline);
      if (!fs.existsSync(baselinePath)) {
        console.error(`Baseline file not found: ${baselinePath}`);
        process.exit(1);
      }

      const baselineProfile: CPUProfile = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));
      const baselineAnalysis = analyzeProfile(baselineProfile, {
        filterNodeModules: true,
        filterInternals: true,
        topN: options.topN,
      });

      const threshold: BaselineThreshold = {
        maxDurationIncreaseMs: 10,
        maxDurationIncreasePercent: 10,
        maxHotspotIncreaseMs: 5,
        maxHotspotIncreasePercent: 20,
      };

      const comparison = compareProfiles(analysis, baselineAnalysis, threshold);

      if (options.json) {
        console.log(formatProfileComparisonJSON(comparison));
      } else {
        console.log("\n" + formatProfileComparison(comparison));
        
        if (hasRegression(comparison)) {
          console.log("\n⚠️  Performance regression detected!");
          process.exit(1);
        } else {
          console.log("\n✅ No performance regression");
        }
      }
    } else {
      // Just show analysis
      if (options.json) {
        console.log(formatProfileAnalysisJSON(analysis, { sandbox, scenario }, { topN: options.topN }));
      } else {
        console.log("\n" + formatProfileAnalysis(analysis, { sandbox, scenario }, { topN: options.topN, verbose: options.verbose }));
      }
    }

  } finally {
    await page.close();
    await context.close();
  }
}

async function main() {
  const options = parseArgs();
  if (!options) {
    process.exit(1);
  }

  try {
    await profileScenario(options.sandbox, options.scenario, options);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();

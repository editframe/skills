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
 */

import { chromium, type Browser, type Page, type CDPSession } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { discoverSandboxes, loadSandbox, buildSandboxGraph } from "../sandbox-server/discover.js";
import type { Sandbox, ScenarioResult } from "../packages/elements/src/sandbox/index.js";
// Note: SandboxContext is no longer directly imported - we use ScenarioRunner instead
import { render as litRender } from "lit";
import * as http from "node:http";
import * as os from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine script path for help text
// Script is at elements/scripts/ef.ts, so it's run as elements/scripts/ef
const SCRIPT_NAME = "elements/scripts/ef";

function findMonorepoRoot(): string | null {
  // First check if we're in Docker with root-level mounts
  if (fs.existsSync("/elements") && fs.existsSync("/telecine")) {
    return "/";
  }
  
  let currentDir = __dirname;
  
  // In Docker, we might be in /packages (elements root) or /packages/scripts
  // Check if we're already in elements directory
  if (fs.existsSync(path.join(currentDir, "packages", "elements", "src"))) {
    // We're in elements root (/packages)
    // In Docker, monorepo root is / (one level up)
    // But .wsEndpoint.json is at the host monorepo root, which is mounted
    // Try / first, then traverse up
    if (fs.existsSync("/elements") && fs.existsSync("/telecine")) {
      return "/";
    }
    // Otherwise, go up from elements root
    return path.dirname(currentDir);
  }
  
  // Normal traversal
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

function findElementsRoot(): string {
  // In Docker, we might already be in /packages (elements root)
  if (fs.existsSync(path.join(__dirname, "..", "packages", "elements", "src"))) {
    return path.resolve(__dirname, "..");
  }
  
  const monorepoRoot = findMonorepoRoot();
  if (!monorepoRoot) {
    throw new Error(`Could not find monorepo root. Started from: ${__dirname}`);
  }
  return path.join(monorepoRoot, "elements");
}

// ============================================================================
// Session Storage System for Progressive Discovery
// ============================================================================

interface BrowserLogEntry {
  timestamp: number;
  type: "log" | "error" | "warning" | "info" | "debug";
  text: string;
  testName?: string;
}

interface BrowserError {
  type: string; // Error type/key (e.g., "scrubVideoInitSegmentFetchTask")
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  testNames: Set<string>;
  stackTrace?: string;
  expected: boolean; // Whether this is an expected error in test environment
}

interface BrowserWarning {
  type: string; // Warning type/key (e.g., "Canvas2D_multiple_readback")
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  testNames: Set<string>;
  stackTrace?: string;
}

interface BrowserLogPrefix {
  prefix: string; // Log prefix (e.g., "log", "captureFromClone", "renderToImage")
  count: number;
  firstSeen: number;
  lastSeen: number;
  testNames: Set<string>;
  sampleMessage: string; // Example message with this prefix
}

interface TestSessionMetadata {
  sessionId: string;
  sandboxName: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: "passed" | "failed" | "error";
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalErrors: number;
  totalWarnings: number;
}

interface TestSessionData {
  metadata: TestSessionMetadata;
  tests: ScenarioResult[];
  errors: Map<string, BrowserError>;
  warnings: Map<string, BrowserWarning>;
  logPrefixes: Map<string, BrowserLogPrefix>;
  logs: BrowserLogEntry[];
  profiles: Map<string, any>; // testName -> CPUProfile
}

function getSessionStorageDir(): string {
  // Store sessions in elements directory so they're accessible from both Docker and host
  // The elements directory is always mounted/accessible in both environments
  const elementsRoot = findElementsRoot();
  const sessionDir = path.join(elementsRoot, ".ef-sessions");
  
  try {
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
  } catch (err) {
    console.error(`Failed to create session directory ${sessionDir}: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
  
  return sessionDir;
}

function generateSessionId(sandboxName: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const random = Math.random().toString(36).substr(2, 9);
  return `ef-${timestamp}-${random}`;
}

function getSessionDir(sessionId: string): string {
  return path.join(getSessionStorageDir(), sessionId);
}

function saveSessionData(sessionId: string, data: TestSessionData): void {
  const sessionDir = getSessionDir(sessionId);
  
  try {
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    // Save metadata
    const metadataPath = path.join(sessionDir, "metadata.json");
    fs.writeFileSync(
      metadataPath,
      JSON.stringify(data.metadata, null, 2)
    );
    
    // Save tests (one JSON object per line - NDJSON format)
    // Use writeFileSync instead of streams to ensure data is written before process exits
    const testsPath = path.join(sessionDir, "tests.ndjson");
    const testsContent = data.tests.map(test => JSON.stringify(test)).join("\n") + (data.tests.length > 0 ? "\n" : "");
    fs.writeFileSync(testsPath, testsContent);
    
    // Save errors (deduplicated)
    const errorsPath = path.join(sessionDir, "errors.json");
    const errorsArray = Array.from(data.errors.values()).map(err => ({
      ...err,
      testNames: Array.from(err.testNames),
    }));
    fs.writeFileSync(
      errorsPath,
      JSON.stringify(errorsArray, null, 2)
    );
    
    // Save warnings (deduplicated)
    const warningsPath = path.join(sessionDir, "warnings.json");
    const warningsArray = Array.from(data.warnings.values()).map(warn => ({
      ...warn,
      testNames: Array.from(warn.testNames),
    }));
    fs.writeFileSync(
      warningsPath,
      JSON.stringify(warningsArray, null, 2)
    );
    
    // Save log prefixes (deduplicated)
    const logPrefixesPath = path.join(sessionDir, "logPrefixes.json");
    const logPrefixesArray = Array.from(data.logPrefixes.values()).map(prefix => ({
      ...prefix,
      testNames: Array.from(prefix.testNames),
    }));
    fs.writeFileSync(
      logPrefixesPath,
      JSON.stringify(logPrefixesArray, null, 2)
    );
    
    // Save logs (NDJSON format)
    const logsPath = path.join(sessionDir, "logs.ndjson");
    const logsContent = data.logs.map(log => JSON.stringify(log)).join("\n") + (data.logs.length > 0 ? "\n" : "");
    fs.writeFileSync(logsPath, logsContent);
    
    // Save profiles
    if (data.profiles.size > 0) {
      const profilesDir = path.join(sessionDir, "profiles");
      if (!fs.existsSync(profilesDir)) {
        fs.mkdirSync(profilesDir, { recursive: true });
      }
      for (const [testName, profile] of data.profiles.entries()) {
        const safeName = testName.replace(/[^a-zA-Z0-9]/g, "_");
        fs.writeFileSync(
          path.join(profilesDir, `${safeName}.cpuprofile`),
          JSON.stringify(profile, null, 2)
        );
      }
    }
    
    // Verify files were written
    if (!fs.existsSync(metadataPath)) {
      throw new Error(`Metadata file was not created: ${metadataPath}`);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    console.error(`\n⚠️  Failed to save session data: ${errorMsg}`);
    console.error(`Session ID: ${sessionId}`);
    console.error(`Session directory: ${sessionDir}`);
    if (errorStack) {
      console.error(`Stack trace:\n${errorStack}`);
    }
    // Re-throw so caller knows save failed
    throw err;
  }
}

function loadSessionData(sessionId: string): TestSessionData | null {
  const sessionDir = getSessionDir(sessionId);
  if (!fs.existsSync(sessionDir)) {
    return null;
  }
  
  try {
    const metadata = JSON.parse(
      fs.readFileSync(path.join(sessionDir, "metadata.json"), "utf-8")
    ) as TestSessionMetadata;
    
    const tests: ScenarioResult[] = [];
    const testsPath = path.join(sessionDir, "tests.ndjson");
    if (fs.existsSync(testsPath)) {
      const testsContent = fs.readFileSync(testsPath, "utf-8");
      for (const line of testsContent.trim().split("\n")) {
        if (line.trim()) {
          tests.push(JSON.parse(line));
        }
      }
    }
    
    const errors = new Map<string, BrowserError>();
    const errorsPath = path.join(sessionDir, "errors.json");
    if (fs.existsSync(errorsPath)) {
      const errorsArray = JSON.parse(fs.readFileSync(errorsPath, "utf-8")) as any[];
      for (const err of errorsArray) {
        errors.set(err.type, {
          ...err,
          testNames: new Set(err.testNames || []),
        });
      }
    }
    
    // Load warnings (backward compatible - old sessions won't have this)
    const warnings = new Map<string, BrowserWarning>();
    const warningsPath = path.join(sessionDir, "warnings.json");
    if (fs.existsSync(warningsPath)) {
      const warningsArray = JSON.parse(fs.readFileSync(warningsPath, "utf-8")) as any[];
      for (const warn of warningsArray) {
        warnings.set(warn.type, {
          ...warn,
          testNames: new Set(warn.testNames || []),
        });
      }
    }
    
    // Load log prefixes (backward compatible - old sessions won't have this)
    const logPrefixes = new Map<string, BrowserLogPrefix>();
    const logPrefixesPath = path.join(sessionDir, "logPrefixes.json");
    if (fs.existsSync(logPrefixesPath)) {
      const logPrefixesArray = JSON.parse(fs.readFileSync(logPrefixesPath, "utf-8")) as any[];
      for (const prefix of logPrefixesArray) {
        logPrefixes.set(prefix.prefix, {
          ...prefix,
          testNames: new Set(prefix.testNames || []),
        });
      }
    }
    
    const logs: BrowserLogEntry[] = [];
    const logsPath = path.join(sessionDir, "logs.ndjson");
    if (fs.existsSync(logsPath)) {
      const logsContent = fs.readFileSync(logsPath, "utf-8");
      for (const line of logsContent.trim().split("\n")) {
        if (line.trim()) {
          logs.push(JSON.parse(line));
        }
      }
    }
    
    const profiles = new Map<string, any>();
    const profilesDir = path.join(sessionDir, "profiles");
    if (fs.existsSync(profilesDir)) {
      const profileFiles = fs.readdirSync(profilesDir);
      for (const file of profileFiles) {
        if (file.endsWith(".cpuprofile")) {
          const testName = file.replace(".cpuprofile", "").replace(/_/g, " ");
          const profile = JSON.parse(
            fs.readFileSync(path.join(profilesDir, file), "utf-8")
          );
          profiles.set(testName, profile);
        }
      }
    }
    
    return { metadata, tests, errors, warnings, logPrefixes, logs, profiles };
  } catch (err) {
    console.error(`Failed to load session ${sessionId}:`, err);
    return null;
  }
}

function cleanupOldSessions(maxAgeDays: number = 7): void {
  const sessionDir = getSessionStorageDir();
  if (!fs.existsSync(sessionDir)) {
    return;
  }
  
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  const entries = fs.readdirSync(sessionDir);
  for (const entry of entries) {
    const entryPath = path.join(sessionDir, entry);
    const stats = fs.statSync(entryPath);
    const age = now - stats.mtimeMs;
    
    if (age > maxAge) {
      fs.rmSync(entryPath, { recursive: true, force: true });
    }
  }
}

function extractErrorType(message: string): string {
  // Extract error type from common patterns
  // Examples: "scrubVideoInitSegmentFetchTask error", "No scrub rendition available"
  const match = message.match(/(\w+)\s*(?:error|Error|failed|Failed)/i);
  if (match) {
    return match[1];
  }
  
  // Try to extract from common error messages
  if (message.includes("scrubVideoInitSegmentFetchTask")) {
    return "scrubVideoInitSegmentFetchTask";
  }
  if (message.includes("unifiedVideoSeekTask")) {
    return "unifiedVideoSeekTask";
  }
  if (message.includes("frameTask")) {
    return "frameTask";
  }
  if (message.includes("scrubVideoSegmentFetchTask")) {
    return "scrubVideoSegmentFetchTask";
  }
  
  // Fallback: use message as type, sanitize but preserve full length
  // Replace non-alphanumeric with underscores, but keep full message for LLM context
  return message.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 200); // Increased limit to 200 chars
}

function extractLogPrefix(text: string): string | null {
  // Extract prefix from logs in [prefix] ... format
  // Examples: "[log] [captureFromClone] build=0ms", "[log] [renderToImage] FO path: 320x180"
  const match = text.match(/\[log\]\s*\[([^\]]+)\]/);
  if (match) {
    return match[1];
  }
  
  // Also check for other log formats like [warning] [prefix] or [error] [prefix]
  const otherMatch = text.match(/\[(?:warning|error|info|debug)\]\s*\[([^\]]+)\]/);
  if (otherMatch) {
    return otherMatch[1];
  }
  
  return null;
}

function extractWarningType(message: string): string {
  // Extract warning type from common patterns
  // Examples: "Canvas2D: Multiple readback", "JitMediaEngine: No video rendition"
  const match = message.match(/(\w+):\s*(.+?)(?:\s+at\s|$)/i);
  if (match) {
    // Use source and first part of message
    const source = match[1];
    const msgPart = match[2].slice(0, 50).replace(/[^a-zA-Z0-9]/g, "_");
    return `${source}_${msgPart}`;
  }
  
  // Try to extract from common warning patterns
  if (message.includes("Canvas2D")) {
    const canvasMatch = message.match(/Canvas2D[^:]*:\s*(.+?)(?:\s+at\s|$)/i);
    if (canvasMatch) {
      return `Canvas2D_${canvasMatch[1].slice(0, 50).replace(/[^a-zA-Z0-9]/g, "_")}`;
    }
    return "Canvas2D_warning";
  }
  if (message.includes("JitMediaEngine")) {
    return "JitMediaEngine_warning";
  }
  if (message.includes("Time domain analysis")) {
    return "Time_domain_analysis_skipped";
  }
  if (message.includes("Frequency analysis")) {
    return "Frequency_analysis_skipped";
  }
  
  // Fallback: use message as type, sanitize but preserve full length
  return message.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 200);
}

function isExpectedError(errorType: string, message: string): boolean {
  // Known expected errors in test environment
  const expectedPatterns = [
    /scrubVideoInitSegmentFetchTask/i,
    /unifiedVideoSeekTask/i,
    /frameTask/i,
    /scrubVideoSegmentFetchTask/i,
    /No scrub rendition available/i,
    /Video rendition unavailable/i,
    /Failed to load resource.*401/i,
    /Failed to load resource.*404/i,
  ];
  
  return expectedPatterns.some(pattern => 
    pattern.test(errorType) || pattern.test(message)
  );
}

interface Hotspot {
  functionName: string;
  url: string;
  line: number;
  selfTime: number;
  totalTime: number;
  percentage: number;
}

function extractHotspots(profile: any, topN: number = 10): Hotspot[] {
  if (!profile || !profile.nodes || !profile.samples) {
    return [];
  }
  
  // Calculate self time for each node
  const selfTime = new Map<number, number>();
  const totalTime = new Map<number, number>();
  
  // Build node map
  const nodeMap = new Map();
  for (const node of profile.nodes) {
    nodeMap.set(node.id, node);
    selfTime.set(node.id, 0);
    totalTime.set(node.id, 0);
  }
  
  // Calculate time from samples
  let currentTime = profile.startTime;
  for (let i = 0; i < profile.samples.length; i++) {
    const sampleId = profile.samples[i];
    const delta = profile.timeDeltas[i] || 0;
    currentTime += delta;
    
    if (nodeMap.has(sampleId)) {
      totalTime.set(sampleId, (totalTime.get(sampleId) || 0) + delta);
    }
  }
  
  // Calculate self time (total - children)
  for (const node of profile.nodes) {
    let childrenTime = 0;
    if (node.children) {
      for (const childId of node.children) {
        childrenTime += totalTime.get(childId) || 0;
      }
    }
    const nodeTotal = totalTime.get(node.id) || 0;
    selfTime.set(node.id, Math.max(0, nodeTotal - childrenTime));
  }
  
  // Extract hotspots
  const duration = profile.endTime - profile.startTime;
  const hotspots: Hotspot[] = [];
  
  for (const node of profile.nodes) {
    const self = selfTime.get(node.id) || 0;
    const total = totalTime.get(node.id) || 0;
    
    if (self > 0) {
      const percentage = duration > 0 ? (self / duration) * 100 : 0;
      const functionName = node.callFrame.functionName || "(anonymous)";
      const url = node.callFrame.url || "";
      const line = node.callFrame.lineNumber || 0;
      
      // Filter out internal functions and node_modules
      const isInternal = functionName.startsWith("(") && functionName.endsWith(")");
      const isNodeModules = url.includes("node_modules") || url.includes("chunk-");
      
      if (!isInternal && !isNodeModules && url) {
        hotspots.push({
          functionName,
          url,
          line,
          selfTime: self / 1000, // Convert to ms
          totalTime: total / 1000,
          percentage,
        });
      }
    }
  }
  
  // Sort by self time and take top N
  hotspots.sort((a, b) => b.selfTime - a.selfTime);
  return hotspots.slice(0, topN);
}

function printHotspots(scenarioName: string, hotspots: Hotspot[], topN: number = 10): void {
  if (hotspots.length === 0) {
    console.log(`    No user code hotspots found`);
    return;
  }
  
  const displayHotspots = hotspots.slice(0, topN);
  console.log(`    Top ${displayHotspots.length} hotspots:`);
  for (let i = 0; i < displayHotspots.length; i++) {
    const hotspot = displayHotspots[i];
    const fileName = hotspot.url.split("/").pop() || hotspot.url;
    const location = `${fileName}:${hotspot.line + 1}`;
    const rank = (i + 1).toString().padStart(2);
    console.log(`      ${rank}. ${hotspot.selfTime.toFixed(2)}ms (${hotspot.percentage.toFixed(1)}%) - ${hotspot.functionName} @ ${location}`);
  }
  
  if (hotspots.length > topN) {
    console.log(`    ... and ${hotspots.length - topN} more`);
  }
}

function findHotspot(hotspots: Hotspot[], functionName?: string, fileName?: string): Hotspot | null {
  if (!functionName && !fileName) return null;
  
  return hotspots.find((h) => {
    const hFileName = h.url.split("/").pop() || h.url;
    const nameMatch = !functionName || h.functionName === functionName;
    const fileMatch = !fileName || hFileName === fileName || h.url.includes(fileName);
    return nameMatch && fileMatch;
  }) || null;
}

function checkProfileAssertions(
  hotspots: Hotspot[],
  assertions: ProfileAssertion[],
): ProfileAssertionResult[] {
  const results: ProfileAssertionResult[] = [];
  
  for (const assertion of assertions) {
    let passed = false;
    let message = "";
    let actual: ProfileAssertionResult["actual"] = {};
    
    const hotspot = findHotspot(hotspots, assertion.functionName, assertion.fileName);
    
    switch (assertion.type) {
      case "topHotspot": {
        if (!assertion.functionName && !assertion.fileName) {
          message = "topHotspot assertion requires functionName or fileName";
          break;
        }
        if (!hotspot) {
          passed = false;
          message = `Function ${assertion.functionName || assertion.fileName} not found in profile`;
          break;
        }
        const position = hotspots.indexOf(hotspot);
        actual.position = position;
        if (assertion.position !== undefined) {
          passed = position === assertion.position;
          message = passed
            ? `Function is at position ${position} as expected`
            : `Expected position ${assertion.position}, but found at position ${position}`;
        } else {
          // Default: check if it's in top 5
          passed = position < 5;
          message = passed
            ? `Function is in top 5 (position ${position})`
            : `Function is not in top 5 (position ${position})`;
        }
        break;
      }
      
      case "notInTopN": {
        if (!assertion.functionName && !assertion.fileName) {
          message = "notInTopN assertion requires functionName or fileName";
          break;
        }
        const maxN = assertion.maxN ?? 5;
        if (!hotspot) {
          passed = true;
          message = `Function ${assertion.functionName || assertion.fileName} not found in profile (pass)`;
          break;
        }
        const position = hotspots.indexOf(hotspot);
        actual.position = position;
        passed = position >= maxN;
        message = passed
          ? `Function is not in top ${maxN} (position ${position})`
          : `Function is in top ${maxN} (position ${position})`;
        break;
      }
      
      case "maxPercentage": {
        if (!assertion.functionName && !assertion.fileName) {
          message = "maxPercentage assertion requires functionName or fileName";
          break;
        }
        if (!hotspot) {
          passed = true;
          message = `Function ${assertion.functionName || assertion.fileName} not found in profile (pass)`;
          break;
        }
        actual.percentage = hotspot.percentage;
        if (assertion.maxPercentage === undefined) {
          message = "maxPercentage assertion requires maxPercentage value";
          break;
        }
        passed = hotspot.percentage <= assertion.maxPercentage;
        message = passed
          ? `Percentage ${hotspot.percentage.toFixed(1)}% is within limit ${assertion.maxPercentage}%`
          : `Percentage ${hotspot.percentage.toFixed(1)}% exceeds limit ${assertion.maxPercentage}%`;
        break;
      }
      
      case "maxSelfTime": {
        if (!assertion.functionName && !assertion.fileName) {
          message = "maxSelfTime assertion requires functionName or fileName";
          break;
        }
        if (!hotspot) {
          passed = true;
          message = `Function ${assertion.functionName || assertion.fileName} not found in profile (pass)`;
          break;
        }
        actual.selfTimeMs = hotspot.selfTime;
        if (assertion.maxSelfTimeMs === undefined) {
          message = "maxSelfTime assertion requires maxSelfTimeMs value";
          break;
        }
        passed = hotspot.selfTime <= assertion.maxSelfTimeMs;
        message = passed
          ? `Self time ${hotspot.selfTime.toFixed(2)}ms is within limit ${assertion.maxSelfTimeMs}ms`
          : `Self time ${hotspot.selfTime.toFixed(2)}ms exceeds limit ${assertion.maxSelfTimeMs}ms`;
        break;
      }
    }
    
    results.push({ assertion, passed, message, actual });
  }
  
  return results;
}

interface RunOptions {
  sandboxName?: string;
  scenarioPattern?: string;
  watch?: boolean;
  profile?: boolean; // true = enable, false = disable, undefined = default (enabled unless watch mode)
  output?: string;
  baseline?: string;
  baselineThreshold?: {
    maxDurationIncreaseMs?: number; // Fail if duration increased by more than this
    maxDurationIncreasePercent?: number; // Fail if duration increased by more than this %
    maxHotspotIncreaseMs?: number; // Fail if any hotspot increased by more than this
    maxHotspotIncreasePercent?: number; // Fail if any hotspot increased by more than this %
  };
}

interface ProfileAssertion {
  type: "topHotspot" | "notInTopN" | "maxPercentage" | "maxSelfTime";
  functionName?: string;
  fileName?: string;
  position?: number; // For topHotspot: expected position (0-indexed)
  maxN?: number; // For notInTopN: ensure function is not in top N
  maxPercentage?: number; // For maxPercentage: maximum allowed percentage
  maxSelfTimeMs?: number; // For maxSelfTime: maximum allowed self time in ms
}

interface ProfileAssertionResult {
  assertion: ProfileAssertion;
  passed: boolean;
  message: string;
  actual?: {
    position?: number;
    percentage?: number;
    selfTimeMs?: number;
  };
}

// Category descriptions for LLM discovery
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  media: "Media Elements - Playback, display, and representation of video, audio, images, and timegroups",
  timeline: "Timeline Components - Editing, trimming, sequencing, and temporal arrangement",
  controls: "Controls - User input widgets like sliders, dials, and interactive controls",
  panels: "Panels - UI containers and organizers for grouping interface elements",
  visualization: "Visualization - Visual data representation like thumbnails, waveforms, and rulers",
  layout: "Layout - Structure, organization, and spatial arrangement of content",
  styling: "Styling - Appearance customization, CSS variables, and theming",
};

// Map category keys to display labels
const CATEGORY_LABELS: Record<string, string> = {
  media: "Media Elements",
  timeline: "Timeline Components",
  controls: "Controls",
  panels: "Panels",
  visualization: "Visualization",
  layout: "Layout",
  styling: "Styling",
};

async function showCategories(): Promise<void> {
  console.log("\n📂 Affordance Categories:\n");
  
  const categoryOrder = ["media", "timeline", "controls", "panels", "visualization", "layout", "styling"];
  
  for (const category of categoryOrder) {
    const label = CATEGORY_LABELS[category] || category.charAt(0).toUpperCase() + category.slice(1);
    const description = CATEGORY_DESCRIPTIONS[category] || "No description available";
    // Extract just the description part (after the dash)
    const descriptionText = description.includes(" - ") ? description.split(" - ")[1] : description;
    console.log(`  ${label}`);
    console.log(`    ${SCRIPT_NAME} list --category ${category}`);
    console.log(`    ${descriptionText}`);
    console.log();
  }
  
  console.log(`💡 Use '${SCRIPT_NAME} list <sandbox-name>' to see scenarios for a specific sandbox\n`);
}

async function listSandboxes(categoryFilter?: string, sandboxName?: string, json: boolean = false): Promise<void> {
  const elementsRoot = findElementsRoot();
  const sandboxes = discoverSandboxes(elementsRoot);

  // If specific sandbox requested, show its scenarios
  if (sandboxName) {
    const sandbox = sandboxes.find(s => s.elementName === sandboxName);
    if (!sandbox) {
      console.error(`\n❌ Sandbox "${sandboxName}" not found\n`);
      console.log("Available sandboxes:");
      for (const s of sandboxes) {
        console.log(`  • ${s.elementName}`);
      }
      console.log();
      process.exit(1);
    }

    // Load sandbox config to get scenarios
    try {
      const config = await loadSandbox(sandbox.filePath) as Sandbox;
      const scenarioNames = Object.keys(config.scenarios || {});
      
      if (json) {
        console.log(JSON.stringify({
          sandbox: sandboxName,
          category: sandbox.category,
          description: config.description,
          scenarios: scenarioNames,
        }, null, 2));
        return;
      }

      console.log(`\n📦 ${sandboxName}`);
      if (sandbox.category) {
        const categoryLabel = CATEGORY_LABELS[sandbox.category] || sandbox.category.charAt(0).toUpperCase() + sandbox.category.slice(1);
        console.log(`   Category: ${categoryLabel}`);
      }
      if (config.description) {
        console.log(`   ${config.description}`);
      }
      console.log(`\n   Scenarios (${scenarioNames.length}):\n`);
      
      for (const scenarioName of scenarioNames) {
        const scenario = config.scenarios[scenarioName];
        if (typeof scenario === "object" && scenario.description) {
          console.log(`   • ${scenarioName}`);
          console.log(`     ${scenario.description}`);
        } else {
          console.log(`   • ${scenarioName}`);
        }
      }
      console.log();
    } catch (err) {
      console.error(`\n❌ Failed to load sandbox "${sandboxName}":`, err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    return;
  }

  // Group by category
  const sandboxesByCategory = new Map<string, typeof sandboxes>();
  for (const sandbox of sandboxes) {
    const category = sandbox.category || "uncategorized";
    if (categoryFilter && category !== categoryFilter) {
      continue;
    }
    if (!sandboxesByCategory.has(category)) {
      sandboxesByCategory.set(category, []);
    }
    sandboxesByCategory.get(category)!.push(sandbox);
  }

  if (sandboxesByCategory.size === 0) {
    if (categoryFilter) {
      console.log(`\n❌ No sandboxes found in category "${categoryFilter}"\n`);
      console.log("Available categories:");
      await showCategories();
    } else {
      console.log("\n  No sandboxes found\n");
    }
    return;
  }

  if (json) {
    const output: Record<string, Array<{ name: string; elementTag: string | null }>> = {};
    for (const [category, categorySandboxes] of sandboxesByCategory.entries()) {
      output[category] = categorySandboxes.map(s => ({
        name: s.elementName,
        elementTag: s.elementTag,
      }));
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Sort categories by priority
  const categoryOrder: Record<string, number> = {
    media: 1,
    timeline: 2,
    controls: 3,
    panels: 4,
    visualization: 5,
    layout: 6,
    styling: 7,
    uncategorized: 999,
  };

  const sortedCategories = Array.from(sandboxesByCategory.entries()).sort((a, b) => {
    const aOrder = categoryOrder[a[0]] || 999;
    const bOrder = categoryOrder[b[0]] || 999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a[0].localeCompare(b[0]);
  });

  if (categoryFilter) {
    console.log(`\n📦 Sandboxes in "${categoryFilter}" category:\n`);
  } else {
    console.log("\n📦 Element Sandboxes by Category:\n");
  }

  for (const [category, categorySandboxes] of sortedCategories) {
    const categoryLabel = CATEGORY_LABELS[category] || category.charAt(0).toUpperCase() + category.slice(1);
    const description = CATEGORY_DESCRIPTIONS[category];
    
    console.log(`  ${categoryLabel}${description ? ` - ${description.split(" - ")[1]}` : ""}`);
    console.log(`  ${"=".repeat(60)}`);
    
    for (const sandbox of categorySandboxes.sort((a, b) => a.elementName.localeCompare(b.elementName))) {
      console.log(`    • ${sandbox.elementName}`);
      if (sandbox.elementTag) {
        console.log(`      <${sandbox.elementTag}>`);
      }
    }
    console.log();
  }

  if (!categoryFilter) {
    console.log(`💡 Use '${SCRIPT_NAME} list --category <name>' to filter by category`);
    console.log(`💡 Use '${SCRIPT_NAME} list <sandbox-name>' to see scenarios\n`);
  }
}

async function showRelated(sandboxName?: string): Promise<void> {
  const elementsRoot = findElementsRoot();
  const { sandboxes, relationships } = buildSandboxGraph(elementsRoot);
  
  if (!sandboxName) {
    // Show all relationships
    console.log("\n📊 Sandbox Relationships:\n");
    
    for (const sandbox of sandboxes) {
      const rel = relationships[sandbox.elementName];
      if (!rel) continue;
      
      const hasRelations = rel.uses.length > 0 || rel.usedBy.length > 0;
      if (!hasRelations) continue;
      
      console.log(`${sandbox.elementName}`);
      if (rel.elementTag) {
        console.log(`  tag: ${rel.elementTag}`);
      }
      if (rel.uses.length > 0) {
        console.log(`  uses: ${rel.uses.join(", ")}`);
      }
      if (rel.usedBy.length > 0) {
        console.log(`  used by: ${rel.usedBy.join(", ")}`);
      }
      console.log();
    }
    return;
  }
  
  // Show specific sandbox relationships
  const rel = relationships[sandboxName];
  if (!rel) {
    console.error(`\n❌ Sandbox "${sandboxName}" not found\n`);
    console.log("Available sandboxes:");
    for (const sandbox of sandboxes) {
      console.log(`  • ${sandbox.elementName}`);
    }
    process.exit(1);
  }
  
  console.log(`\n${sandboxName}`);
  if (rel.elementTag) {
    console.log(`  tag: ${rel.elementTag}`);
  }
  console.log();
  
  if (rel.uses.length > 0) {
    console.log("Uses:");
    for (const name of rel.uses) {
      console.log(`  • ${name}`);
    }
  } else {
    console.log("Uses: (none)");
  }
  console.log();
  
  if (rel.usedBy.length > 0) {
    console.log("Used by:");
    for (const name of rel.usedBy) {
      console.log(`  • ${name}`);
    }
  } else {
    console.log("Used by: (none)");
  }
  console.log();
}

async function openSandbox(sandboxName?: string): Promise<void> {
  const elementsRoot = findElementsRoot();
  const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";
  
  // Generate a unique session ID for this browser session
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Open scenario viewer with full navigation - if sandboxName provided, include it, otherwise show all sandboxes
  // Include sessionId so the page can identify itself for profiling
  // Include profile=true to enable profiling by default when opened with ef open
  const url = sandboxName 
    ? `http://${worktreeDomain}:4321/scenario-viewer.html?controlled=true&profile=true&sessionId=${encodeURIComponent(sessionId)}&sandbox=${encodeURIComponent(sandboxName)}`
    : `http://${worktreeDomain}:4321/scenario-viewer.html?controlled=true&profile=true&sessionId=${encodeURIComponent(sessionId)}`;
  
  console.log(`\n🌐 Opening scenario viewer in Playwright-controlled browser...\n`);
  console.log(`📋 Session ID: ${sessionId}\n`);
  
  // Connect to browser via .wsEndpoint.json (same pattern as runScenarios)
  let browser: Browser;
  let shouldCloseBrowser = false;
  
  const wsEndpoint = process.env.WS_ENDPOINT;
  if (wsEndpoint) {
    try {
      console.log(`📡 Connecting to browser server: ${wsEndpoint}`);
      browser = await chromium.connect(wsEndpoint);
    } catch (err) {
      console.warn(`Failed to connect to browser server: ${err instanceof Error ? err.message : String(err)}`);
      console.log("🚀 Launching new browser...");
      browser = await chromium.launch({
        headless: false,
        channel: "chrome",
      });
      shouldCloseBrowser = true;
    }
  } else {
    // Try to find .wsEndpoint.json file
    const monorepoRoot = findMonorepoRoot();
    const possiblePaths = [
      monorepoRoot ? path.join(monorepoRoot, ".wsEndpoint.json") : null,
      path.join(elementsRoot, ".wsEndpoint.json"),
      "/.wsEndpoint.json", // Docker root mount
    ].filter((p): p is string => p !== null);
    
    let wsEndpointPath: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        wsEndpointPath = possiblePath;
        break;
      }
    }
    
    if (wsEndpointPath) {
      try {
        const { wsEndpoint: endpoint } = JSON.parse(fs.readFileSync(wsEndpointPath, "utf-8"));
        console.log(`📡 Connecting to browser server: ${endpoint}`);
        console.log(`[ef open] 📍 WebSocket endpoint from file: ${endpoint}`);
        browser = await chromium.connect(endpoint);
        console.log(`[ef open] ✅ Connected to browser, contexts: ${browser.contexts().length}`);
      } catch (err) {
        console.warn(`Failed to connect to browser server: ${err instanceof Error ? err.message : String(err)}`);
        console.log("🚀 Launching new browser...");
        browser = await chromium.launch({
          headless: false,
          channel: "chrome",
        });
        shouldCloseBrowser = true;
      }
    } else {
      console.log("🚀 Launching new browser (no .wsEndpoint.json found)...");
      browser = await chromium.launch({
        headless: false,
        channel: "chrome",
      });
      shouldCloseBrowser = true;
    }
  }
  
  // viewport: null allows the page to resize with the browser window
  // Without this, Playwright sets a fixed 1280x720 viewport that doesn't respond to resizing
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  
  // Create CDP session for profiling
  const cdp = await context.newCDPSession(page);
  console.log(`📊 CDP session created for profiling`);
  
  // Track profiling state to prevent concurrent profiling sessions
  let profilingActive = false;
  let profilingQueue: Array<() => void> = [];
  const MAX_QUEUE_SIZE = 5; // Prevent unbounded queue growth
  
  // Expose profiling functions to the page
  await page.exposeFunction("__startProfiling", async (optionsJson?: string) => {
    const options = optionsJson ? JSON.parse(optionsJson) : {};
    
    // If profiling is already active, queue this request (with limit)
    if (profilingActive) {
      if (profilingQueue.length >= MAX_QUEUE_SIZE) {
        console.warn(`[CDP] ⚠️ Profiling queue full (${profilingQueue.length} pending), rejecting request. Run scenarios sequentially when profiling.`);
        return JSON.stringify({ error: "Profiling queue full. Too many concurrent profiling requests. Run scenarios one at a time when profiling is enabled." });
      }
      console.log(`[CDP] ⏳ Profiling already active, queuing request (queue size: ${profilingQueue.length + 1})...`);
      await new Promise<void>((resolve) => {
        profilingQueue.push(resolve);
      });
    }
    
    profilingActive = true;
    console.log(`[CDP] Starting profiling with options:`, options);
    
    try {
      await cdp.send("Profiler.enable");
      await cdp.send("Profiler.setSamplingInterval", { interval: options.samplingInterval || 100 });
      await cdp.send("Profiler.start");
      return JSON.stringify({ started: true, timestamp: Date.now() });
    } catch (err) {
      console.error(`[CDP] ❌ Error starting profiling:`, err);
      profilingActive = false;
      // Process next in queue
      const next = profilingQueue.shift();
      if (next) next();
      return JSON.stringify({ error: `Failed to start profiling: ${err instanceof Error ? err.message : String(err)}` });
    }
  });
  
  await page.exposeFunction("__stopProfiling", async () => {
    try {
      console.log(`[CDP] Stopping profiling (queue size: ${profilingQueue.length})...`);
      const { profile } = await cdp.send("Profiler.stop");
      await cdp.send("Profiler.disable");
      console.log(`[CDP] Profile collected:`, {
        nodes: profile.nodes?.length || 0,
        samples: profile.samples?.length || 0,
        startTime: profile.startTime,
        endTime: profile.endTime,
      });
      
      // Mark profiling as inactive and process queue
      profilingActive = false;
      const next = profilingQueue.shift();
      if (next) {
        console.log(`[CDP] Processing next queued profiling request (${profilingQueue.length} remaining)...`);
        next();
      }
      
      if (!profile || !profile.nodes || profile.nodes.length === 0) {
        console.warn(`[CDP] ⚠️ Profile data is empty or invalid`);
        return JSON.stringify({ error: "Profile data is empty. Make sure profiling was started and the scenario ran long enough to collect samples." });
      }
      
      return JSON.stringify(profile); // Returns CPUProfile object
    } catch (err) {
      console.error(`[CDP] ❌ Error stopping profiling:`, err);
      await cdp.send("Profiler.disable").catch(() => {}); // Try to disable even on error
      
      // Mark profiling as inactive and process queue
      profilingActive = false;
      const next = profilingQueue.shift();
      if (next) {
        console.log(`[CDP] Processing next queued profiling request after error (${profilingQueue.length} remaining)...`);
        next();
      }
      
      return JSON.stringify({ error: `Failed to stop profiling: ${err instanceof Error ? err.message : String(err)}` });
    }
  });
  
  // Expose a function to reset profiling state if it gets stuck
  await page.exposeFunction("__resetProfiling", async () => {
    console.log(`[CDP] 🔄 Resetting profiling state. Was active: ${profilingActive}, queue size: ${profilingQueue.length}`);
    
    // Try to stop any active profiling
    if (profilingActive) {
      try {
        await cdp.send("Profiler.stop").catch(() => {});
        await cdp.send("Profiler.disable").catch(() => {});
      } catch {
        // Ignore errors during reset
      }
    }
    
    // Clear state
    profilingActive = false;
    const queueSize = profilingQueue.length;
    profilingQueue = [];
    
    return JSON.stringify({ reset: true, clearedQueueSize: queueSize });
  });
  
  console.log(`✅ Profiling functions exposed: __startProfiling, __stopProfiling, __resetProfiling`);
  
  // Navigate after exposing functions
  console.log(`Opening: ${url}`);
  await page.goto(url, { waitUntil: "load" });
  
  console.log("\n✅ Browser opened. Close browser window to exit.\n");
  
  // Keep browser open - don't close automatically
  // User will close the browser window manually
  // Store references so cleanup handlers can close if needed
  browserInstance = browser;
  contextInstance = context;
}

async function runScenarios(options: RunOptions): Promise<number> {
  const elementsRoot = findElementsRoot();
  const sandboxes = discoverSandboxes(elementsRoot);
  
  let sandboxesToRun = sandboxes;
  const sandboxName = options.sandboxName;
  if (sandboxName) {
    sandboxesToRun = sandboxes.filter((s) => s.elementName === sandboxName);
    if (sandboxesToRun.length === 0) {
      console.error(`\n❌ Sandbox "${sandboxName}" not found\n`);
      return 1;
    }
  }
  
  // Generate session ID for this test run
  const sessionId = generateSessionId(sandboxName || "all");
  const startTime = Date.now();
  
  // Initialize session data collectors
  const sessionData: TestSessionData = {
    metadata: {
      sessionId,
      sandboxName: sandboxName || "all",
      startTime,
      endTime: 0,
      duration: 0,
      status: "passed",
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalErrors: 0,
      totalWarnings: 0,
    },
    tests: [],
    errors: new Map(),
    warnings: new Map(),
    logPrefixes: new Map(),
    logs: [],
    profiles: new Map(),
  };
  
  // Cleanup old sessions on start
  cleanupOldSessions(7);
  
  // Try to get wsEndpoint from environment variable first (set by scripts/run)
  // This is how browsertest script handles Docker - it reads the file on host and passes via env
  let browser: Browser;
  let shouldCloseBrowser = false;
  
  const wsEndpoint = process.env.WS_ENDPOINT;
  if (wsEndpoint) {
    try {
      console.log(`📡 Connecting to browser server: ${wsEndpoint}`);
      browser = await chromium.connect(wsEndpoint);
    } catch (err) {
      console.warn(`Failed to connect to browser server: ${err instanceof Error ? err.message : String(err)}`);
      console.log("🚀 Launching new browser...");
      browser = await chromium.launch({
        headless: true,
        channel: "chrome",
      });
      shouldCloseBrowser = true;
    }
  } else {
    // Try to find .wsEndpoint.json file
    const monorepoRoot = findMonorepoRoot();
    const possiblePaths = [
      monorepoRoot ? path.join(monorepoRoot, ".wsEndpoint.json") : null,
      path.join(elementsRoot, ".wsEndpoint.json"),
      "/.wsEndpoint.json", // Docker root mount
    ].filter((p): p is string => p !== null);
    
    let wsEndpointPath: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        wsEndpointPath = possiblePath;
        break;
      }
    }
    
    if (wsEndpointPath) {
      try {
        const { wsEndpoint: endpoint } = JSON.parse(fs.readFileSync(wsEndpointPath, "utf-8"));
        console.log(`📡 Connecting to browser server: ${endpoint}`);
        browser = await chromium.connect(endpoint);
      } catch (err) {
        console.warn(`Failed to connect to browser server: ${err instanceof Error ? err.message : String(err)}`);
        console.log("🚀 Launching new browser...");
        browser = await chromium.launch({
          headless: true,
          channel: "chrome",
        });
        shouldCloseBrowser = true;
      }
    } else {
      console.log("🚀 Launching new browser (no .wsEndpoint.json found)...");
      browser = await chromium.launch({
        headless: true,
        channel: "chrome",
      });
      shouldCloseBrowser = true;
    }
  }
  
  let exitCode = 0;
  const context = await browser.newContext();
  contextInstance = context;
  browserInstance = browser;
  
  // Track overall statistics
  let totalSandboxes = 0;
  let failedSandboxes = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  
  // Create a single page that will be reused for all sandboxes
  const page = await context.newPage();
  
  try {
    for (const sandboxInfo of sandboxesToRun) {
      totalSandboxes++;
      let results: ScenarioResult[];
      
      try {
        results = await runSandboxScenarios(
          page,
          sandboxInfo,
          options,
          elementsRoot,
          sessionData, // Pass session data collector
        );
      } catch (err) {
        // Sandbox-level error (e.g., failed to load sandbox module)
        const error = err instanceof Error ? err : new Error(String(err));
        console.log(`\n${sandboxInfo.elementName}`);
        console.log(`  \x1b[31m✗\x1b[0m Failed to load sandbox`);
        console.log(`    Error: ${error.message}`);
        if (error.stack) {
          const stackLines = error.stack.split("\n").slice(0, 3);
          for (const line of stackLines) {
            console.log(`    ${line}`);
          }
        }
        console.log(`\n0 passed, 1 failed`);
        failedSandboxes++;
        totalFailed++;
        exitCode = 1;
        continue; // Continue to next sandbox
      }
      
      // Print minimal results (just pass/fail with duration)
      console.log(`\n${sandboxInfo.elementName}`);
      let passed = 0;
      let failed = 0;
      
      for (const result of results) {
        const icon = result.status === "passed" ? "✓" : "✗";
        const statusColor = result.status === "passed" ? "\x1b[32m" : "\x1b[31m";
        const resetColor = "\x1b[0m";
        console.log(
          `  ${statusColor}${icon}${resetColor} ${result.name} (${result.durationMs}ms)`,
        );
        
        if (result.status === "failed" || result.status === "error") {
          failed++;
        } else {
          passed++;
        }
      }
      
      console.log(`\n${passed} passed, ${failed} failed`);
      
      totalPassed += passed;
      totalFailed += failed;
      
      if (failed > 0) {
        failedSandboxes++;
        exitCode = 1;
      }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Update session metadata
    sessionData.metadata.endTime = endTime;
    sessionData.metadata.duration = duration;
    sessionData.metadata.totalTests = totalPassed + totalFailed;
    sessionData.metadata.passedTests = totalPassed;
    sessionData.metadata.failedTests = totalFailed;
    sessionData.metadata.status = totalFailed > 0 ? "failed" : "passed";
    sessionData.metadata.totalErrors = sessionData.errors.size;
    sessionData.metadata.totalWarnings = sessionData.warnings.size;
    
    // Save session data
    try {
      saveSessionData(sessionId, sessionData);
    } catch (err) {
      console.error(`\n❌ Failed to save session data: ${err instanceof Error ? err.message : String(err)}`);
      if (err instanceof Error && err.stack) {
        console.error(err.stack);
      }
    }
    
    // Print minimal summary with session ID
    const sandboxDisplayName = sandboxName || "all sandboxes";
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Session: ${sessionId}`);
    console.log(`Sandbox: ${sandboxDisplayName}`);
    console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`Tests: ${totalPassed} passed, ${totalFailed} failed`);
    
    const totalBrowserErrors = Array.from(sessionData.errors.values()).reduce((sum, err) => sum + err.count, 0);
    if (totalBrowserErrors > 0) {
      console.log(`Warnings: ${totalBrowserErrors} browser errors logged`);
    }
    
    console.log(`\n💡 Query this session (progressive discovery):`);
    console.log(`  ${SCRIPT_NAME} info summary --session ${sessionId}              # Session overview`);
    console.log(`  ${SCRIPT_NAME} info errors --session ${sessionId}              # Error analysis`);
    console.log(`  ${SCRIPT_NAME} info errors <type> --session ${sessionId}       # Specific error details`);
    console.log(`  ${SCRIPT_NAME} info errors --unexpected --session ${sessionId} # Only unexpected errors`);
    console.log(`  ${SCRIPT_NAME} info warnings --session ${sessionId}            # Warning analysis`);
    console.log(`  ${SCRIPT_NAME} info warnings <type> --session ${sessionId}      # Specific warning details`);
    console.log(`  ${SCRIPT_NAME} info logs --session ${sessionId}                # Log prefix analysis`);
    console.log(`  ${SCRIPT_NAME} info logs <prefix> --session ${sessionId}        # Specific log prefix details`);
    console.log(`  ${SCRIPT_NAME} info test "<name>" --session ${sessionId}       # Test details`);
    console.log(`  ${SCRIPT_NAME} info test "<name>" --logs --session ${sessionId} # Test logs`);
    console.log(`  ${SCRIPT_NAME} info test "<name>" --profile --session ${sessionId} # Performance profile`);
    console.log(`  ${SCRIPT_NAME} info search "<query>" --session ${sessionId}    # Search tests/errors`);
    console.log(`\n  Add --json to any query for machine-readable output`);
    console.log(`${"=".repeat(60)}\n`);
    
    if (exitCode === 0) {
      console.log(`✅ All tests passed!\n`);
    } else {
      console.log(`❌ Some tests failed\n`);
    }
  } finally {
    // Close the page and context
    try {
      await page.close();
    } catch {
      // Ignore close errors
    }
    await context.close();
    if (shouldCloseBrowser) {
      await browser.close();
    }
  }
  
  return exitCode;
}

function loadBaselineProfile(
  baselineDir: string,
  sandboxName: string,
  scenarioName: string,
): any | null {
  const safeSandboxName = sandboxName.replace(/[^a-zA-Z0-9]/g, "_");
  const safeScenarioName = scenarioName.replace(/[^a-zA-Z0-9]/g, "_");
  const baselinePath = path.join(baselineDir, `${safeSandboxName}_${safeScenarioName}.cpuprofile`);
  
  if (!fs.existsSync(baselinePath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(baselinePath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.warn(`    ⚠️  Failed to load baseline profile from ${baselinePath}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

interface ProfileComparison {
  diff: Hotspot[];
  summary: string;
  durationDiffMs: number;
  durationDiffPercent: number;
  regressions: {
    duration?: boolean;
    hotspots: Array<{ hotspot: Hotspot; reason: string }>;
  };
}

function compareProfiles(
  current: any,
  baseline: any,
  threshold?: RunOptions["baselineThreshold"],
): ProfileComparison {
  const currentHotspots = extractHotspots(current, 20);
  const baselineHotspots = extractHotspots(baseline, 20);
  
  // Create maps for quick lookup
  const baselineMap = new Map<string, Hotspot>();
  for (const h of baselineHotspots) {
    const key = `${h.functionName}@${h.url}:${h.line}`;
    baselineMap.set(key, h);
  }
  
  const diff: Hotspot[] = [];
  const regressions: ProfileComparison["regressions"] = {
    hotspots: [],
  };
  
  for (const currentHotspot of currentHotspots) {
    const key = `${currentHotspot.functionName}@${currentHotspot.url}:${currentHotspot.line}`;
    const baselineHotspot = baselineMap.get(key);
    
    if (baselineHotspot) {
      // Compare - show if significantly different
      const timeDiff = currentHotspot.selfTime - baselineHotspot.selfTime;
      const pctDiff = currentHotspot.percentage - baselineHotspot.percentage;
      
      if (Math.abs(timeDiff) > 1 || Math.abs(pctDiff) > 0.5) {
        const diffHotspot: Hotspot = {
          ...currentHotspot,
          selfTime: timeDiff,
          totalTime: currentHotspot.totalTime - baselineHotspot.totalTime,
          percentage: pctDiff,
        };
        diff.push(diffHotspot);
        
        // Check for regressions
        if (threshold && timeDiff > 0) {
          const exceededTime = threshold.maxHotspotIncreaseMs && timeDiff > threshold.maxHotspotIncreaseMs;
          const exceededPct = threshold.maxHotspotIncreasePercent && 
            baselineHotspot.selfTime > 0 &&
            ((timeDiff / baselineHotspot.selfTime) * 100) > threshold.maxHotspotIncreasePercent;
          
          if (exceededTime || exceededPct) {
            const reasons: string[] = [];
            if (exceededTime) {
              reasons.push(`+${timeDiff.toFixed(2)}ms exceeds threshold of +${threshold.maxHotspotIncreaseMs}ms`);
            }
            if (exceededPct) {
              reasons.push(`+${((timeDiff / baselineHotspot.selfTime) * 100).toFixed(1)}% exceeds threshold of +${threshold.maxHotspotIncreasePercent}%`);
            }
            regressions.hotspots.push({
              hotspot: diffHotspot,
              reason: reasons.join(", "),
            });
          }
        }
      }
    } else {
      // New hotspot not in baseline
      diff.push({
        ...currentHotspot,
        selfTime: currentHotspot.selfTime,
        totalTime: currentHotspot.totalTime,
        percentage: currentHotspot.percentage,
      });
    }
  }
  
  // Check for removed hotspots (in baseline but not in current)
  const currentMap = new Map<string, Hotspot>();
  for (const h of currentHotspots) {
    const key = `${h.functionName}@${h.url}:${h.line}`;
    currentMap.set(key, h);
  }
  
  for (const baselineHotspot of baselineHotspots) {
    const key = `${baselineHotspot.functionName}@${baselineHotspot.url}:${baselineHotspot.line}`;
    if (!currentMap.has(key)) {
      // Hotspot removed - show as negative diff
      diff.push({
        ...baselineHotspot,
        selfTime: -baselineHotspot.selfTime,
        totalTime: -baselineHotspot.totalTime,
        percentage: -baselineHotspot.percentage,
      });
    }
  }
  
  const currentDuration = current.endTime - current.startTime;
  const baselineDuration = baseline.endTime - baseline.startTime;
  const durationDiffMs = (currentDuration - baselineDuration) / 1000;
  const durationDiffPercent = baselineDuration > 0 
    ? ((durationDiffMs / (baselineDuration / 1000)) * 100) 
    : 0;
  
  // Check duration regression
  if (threshold && durationDiffMs > 0) {
    const exceededTime = threshold.maxDurationIncreaseMs && durationDiffMs > threshold.maxDurationIncreaseMs;
    const exceededPct = threshold.maxDurationIncreasePercent && durationDiffPercent > threshold.maxDurationIncreasePercent;
    
    if (exceededTime || exceededPct) {
      regressions.duration = true;
    }
  }
  
  const summary = `Duration: ${durationDiffMs > 0 ? "+" : ""}${durationDiffMs.toFixed(2)}ms (${durationDiffPercent > 0 ? "+" : ""}${durationDiffPercent.toFixed(1)}%)`;
  
  return { diff, summary, durationDiffMs, durationDiffPercent, regressions };
}

async function runSandboxScenarios(
  page: Page,
  sandboxInfo: { filePath: string; elementName: string },
  options: RunOptions,
  elementsRoot: string,
  sessionData: TestSessionData,
): Promise<ScenarioResult[]> {
  // Check if page is still valid
  if (page.isClosed()) {
    throw new Error("Page is closed");
  }
  
  const results: ScenarioResult[] = [];
  let currentTestName: string | null = null;
  
  // Set up profiling if requested
  let cdp: CDPSession | null = null;
  let profilingActive = false;
  
  if (options.profile) {
    cdp = await page.context().newCDPSession(page);
  }
  
  try {
    // Capture browser console logs and errors for session data
    page.on("console", (msg) => {
      const text = msg.text();
      const msgType = msg.type() as BrowserLogEntry["type"];
      const timestamp = Date.now();
      
      // Always log to session data (but don't print to console - available via ef info)
      const logEntry: BrowserLogEntry = {
        timestamp,
        type: msgType,
        text,
        testName: currentTestName || undefined,
      };
      sessionData.logs.push(logEntry);
      
      // Extract and group logs by prefix
      const prefix = extractLogPrefix(text);
      if (prefix) {
        const existingPrefix = sessionData.logPrefixes.get(prefix);
        if (existingPrefix) {
          existingPrefix.count++;
          existingPrefix.lastSeen = timestamp;
          if (currentTestName) {
            existingPrefix.testNames.add(currentTestName);
          }
        } else {
          sessionData.logPrefixes.set(prefix, {
            prefix,
            count: 1,
            firstSeen: timestamp,
            lastSeen: timestamp,
            testNames: currentTestName ? new Set([currentTestName]) : new Set(),
            sampleMessage: text,
          });
        }
      }
      
      // Don't print browser logs/errors to console - they pollute LLM context
      // Use 'ef info errors' or 'ef info test <name> --logs' to view them
      
      // Deduplicate errors
      if (msgType === "error") {
        const errorType = extractErrorType(text);
        const existingError = sessionData.errors.get(errorType);
        const expected = isExpectedError(errorType, text);
        
        // Try to extract stack trace from console error message
        // Console errors may include stack traces in the text
        let stackTrace: string | undefined;
        const stackMatch = text.match(/\n\s+at\s+/);
        if (stackMatch) {
          // Stack trace is included in the message text
          stackTrace = text;
        }
        
        if (existingError) {
          existingError.count++;
          existingError.lastSeen = timestamp;
          if (currentTestName) {
            existingError.testNames.add(currentTestName);
          }
          // Update stack trace if we don't have one yet
          if (!existingError.stackTrace && stackTrace) {
            existingError.stackTrace = stackTrace;
          }
        } else {
          sessionData.errors.set(errorType, {
            type: errorType,
            message: text,
            count: 1,
            firstSeen: timestamp,
            lastSeen: timestamp,
            testNames: currentTestName ? new Set([currentTestName]) : new Set(),
            stackTrace,
            expected,
          });
        }
      }
      
      // Deduplicate warnings
      if (msgType === "warning") {
        const warningType = extractWarningType(text);
        const existingWarning = sessionData.warnings.get(warningType);
        
        // Try to extract stack trace from console warning message
        let stackTrace: string | undefined;
        const stackMatch = text.match(/\n\s+at\s+/);
        if (stackMatch) {
          stackTrace = text;
        }
        
        if (existingWarning) {
          existingWarning.count++;
          existingWarning.lastSeen = timestamp;
          if (currentTestName) {
            existingWarning.testNames.add(currentTestName);
          }
          // Update stack trace if we don't have one yet
          if (!existingWarning.stackTrace && stackTrace) {
            existingWarning.stackTrace = stackTrace;
          }
        } else {
          sessionData.warnings.set(warningType, {
            type: warningType,
            message: text,
            count: 1,
            firstSeen: timestamp,
            lastSeen: timestamp,
            testNames: currentTestName ? new Set([currentTestName]) : new Set(),
            stackTrace,
          });
        }
      }
    });
    
    // Capture page errors
    page.on("pageerror", (err) => {
      const timestamp = Date.now();
      const errorMessage = err.message;
      const errorType = extractErrorType(errorMessage);
      
      sessionData.logs.push({
        timestamp,
        type: "error",
        text: errorMessage,
        testName: currentTestName || undefined,
      });
      
      // Don't print page errors to console - they pollute LLM context
      // Use 'ef info errors' or 'ef info test <name> --logs' to view them
      
      // Deduplicate page errors
      const existingError = sessionData.errors.get(errorType);
      const expected = isExpectedError(errorType, errorMessage);
      
      if (existingError) {
        existingError.count++;
        existingError.lastSeen = timestamp;
        if (currentTestName) {
          existingError.testNames.add(currentTestName);
        }
        if (!existingError.stackTrace && err.stack) {
          existingError.stackTrace = err.stack;
        }
      } else {
        sessionData.errors.set(errorType, {
          type: errorType,
          message: errorMessage,
          count: 1,
          firstSeen: timestamp,
          lastSeen: timestamp,
          testNames: currentTestName ? new Set([currentTestName]) : new Set(),
          stackTrace: err.stack,
          expected,
        });
      }
    });
    
    // Navigate to a simple page served by the dev server so modules can be loaded
    // Use scenario-runner.html which is a simple static page with just the container
    const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";
    const devServerUrl = `http://${worktreeDomain}:4321`;
    
    // Navigate to the scenario-runner page (simple static HTML, no React)
    await page.goto(`${devServerUrl}/scenario-runner.html?sandbox=${sandboxInfo.elementName}`, {
      waitUntil: "load",
      timeout: 30000,
    });
    
    // Check if preload succeeded
    const preloadStatus = await page.evaluate(() => {
      return {
        loaded: (window as any).__trackComponentsLoaded,
        error: (window as any).__trackComponentsLoadError,
      };
    });
    
    // Don't print debug logs - they pollute LLM context
    // Errors will still be thrown and caught at the sandbox level
    
    if (preloadStatus.error) {
      throw new Error(`Track components preload failed: ${preloadStatus.error}`);
    }
    
    if (!preloadStatus.loaded) {
      // Wait for preload to complete
      await page.waitForFunction(() => (window as any).__trackComponentsLoaded || (window as any).__trackComponentsLoadError, {
        timeout: 10000,
      }).catch(() => {});
      
      const retryStatus = await page.evaluate(() => {
        return {
          loaded: (window as any).__trackComponentsLoaded,
          error: (window as any).__trackComponentsLoadError,
        };
      });
      
      if (retryStatus.error) {
        throw new Error(`Track components preload failed: ${retryStatus.error}`);
      }
    }
    
    // Load the sandbox config using the Vite-bundled loader exposed by main.ts
    const sandboxData = await page.evaluate(async ({ sandboxName }) => {
      try {
        // Use the __loadSandbox function exposed by scenario-runner/main.ts
        // This uses Vite's import.meta.glob which properly bundles the module graph
        const loadSandbox = (window as any).__loadSandbox;
        if (!loadSandbox) {
          return {
            success: false,
            error: "__loadSandbox not available - scenario-runner/main.ts may not have loaded",
          };
        }
        
        const config = await loadSandbox(sandboxName);
        
        // Extract scenario names and their assertions
        const scenarioNames: string[] = [];
        const profileAssertions: Record<string, any[]> = {};
        
        for (const [name, scenario] of Object.entries(config.scenarios || {})) {
          scenarioNames.push(name);
          // Check if scenario is a Scenario object with assertions
          if (scenario && typeof scenario === "object" && "run" in scenario) {
            if (scenario.profileAssertions) {
              profileAssertions[name] = scenario.profileAssertions;
            }
          }
        }
        
        return {
          scenarioNames,
          profileAssertions,
          success: true,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }, { sandboxName: sandboxInfo.elementName });
    
    if (!sandboxData.success) {
      throw new Error(`Failed to load sandbox config: ${sandboxData.error}`);
    }
    
    // Filter scenarios by pattern if provided
    let scenarioNames = sandboxData.scenarioNames;
    if (options.scenarioPattern) {
      const pattern = new RegExp(options.scenarioPattern.replace(/\*/g, ".*"));
      scenarioNames = scenarioNames.filter((name) => pattern.test(name));
    }
    
    if (scenarioNames.length === 0) {
      return results;
    }
    
    // Wait for the sandbox to load and SandboxContext to be available
    // Check if page is still valid before waiting
    if (page.isClosed()) {
      throw new Error("Page was closed before scenarios could run");
    }
    
    // Wait for container to exist (should be immediate with scenario-runner.html)
    try {
      await page.waitForFunction(() => {
        return document.getElementById("sandbox-container") !== null;
      }, { timeout: 5000 });
    } catch {
      // If container doesn't exist, create it (fallback)
      await page.evaluate(() => {
        if (!document.getElementById("sandbox-container")) {
          const container = document.createElement("div");
          container.id = "sandbox-container";
          container.style.width = "100%";
          container.style.height = "100%";
          document.body.appendChild(container);
        }
      });
    }
    
    // Set up completion signal on the page
    await page.evaluate(() => {
      (window as any).__scenariosComplete = false;
      (window as any).__scenariosRunning = false;
    });
    
    // Inject sandbox code and run scenarios
    for (const scenarioName of scenarioNames) {
      currentTestName = scenarioName;
      const startTime = Date.now();
      let result: ScenarioResult;
      let profile: any = null;
      
      // Start profiling if enabled
      if (options.profile && cdp) {
        try {
          await cdp.send("Profiler.enable");
          await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
          await cdp.send("Profiler.start");
          profilingActive = true;
        } catch (err) {
          console.warn(`⚠️  Failed to start profiling for ${scenarioName}:`, err);
        }
      }
      
      try {
        // Run scenario directly in the browser by importing the sandbox module
        // and executing the scenario function
        // Wrap in try-catch inside evaluate to ensure errors are properly captured
        let evaluateResult: any;
        try {
          evaluateResult = await page.evaluate(
          async ({ scenarioName, sandboxName }) => {
            // Set up error tracking to catch async errors
            let scenarioError: { message: string; stack?: string } | null = null;
            const originalErrorHandler = window.onerror;
            const originalUnhandledRejection = window.onunhandledrejection;
            
            // Track unhandled errors and promise rejections
            window.onerror = (message, source, lineno, colno, error) => {
              scenarioError = {
                message: error?.message || String(message),
                stack: error?.stack || `${source}:${lineno}:${colno}`,
              };
              return false; // Don't prevent default handling
            };
            
            window.onunhandledrejection = (event: any) => {
              const reason = event.reason;
              scenarioError = {
                message: reason?.message || String(reason),
                stack: reason?.stack,
              };
            };
            
            try {
              // Mark that scenarios are running
              (window as any).__scenariosRunning = true;
              // Import the sandbox module to get the scenario function
              const response = await fetch(`/_sandbox/api/${sandboxName}/config`);
              const data = await response.json();
              
              // Use the glob-loaded sandbox loader (exposed by scenario-runner/main.ts)
              // This uses import.meta.glob which Vite can statically analyze
              const loadSandboxByPath = (window as any).__loadSandboxByPath;
              if (!loadSandboxByPath) {
                throw new Error("__loadSandboxByPath not available - scenario-runner may not be loaded");
              }
              
              const config = await loadSandboxByPath(data.filePath);
              const scenarioDef = config.scenarios[scenarioName];
              
              if (!scenarioDef) {
                throw new Error(`Scenario "${scenarioName}" not found`);
              }
              
              // Extract scenario function - handle both function and Scenario object formats
              const scenario = typeof scenarioDef === "function" 
                ? scenarioDef 
                : scenarioDef.run;
              
              if (!scenario) {
                throw new Error(`Scenario "${scenarioName}" has no run function`);
              }
              
              // Use the globally exposed runScenario from scenario-runner/main.ts
              // This avoids issues with dynamic imports in page.evaluate() context
              const runScenario = (window as any).__runScenario;
              if (!runScenario) {
                throw new Error("__runScenario not available - scenario-runner may not be loaded");
              }
              
              const container = document.getElementById("sandbox-container");
              if (!container) throw new Error("Container not found");
              
              // Use shared runner for consistent execution logic
              // The runner handles container clearing, setup, DOM synchronization, and error handling
              const result = await runScenario(
                config,
                scenarioName,
                container as HTMLElement
              );
              
              // Restore original error handlers
              window.onerror = originalErrorHandler;
              window.onunhandledrejection = originalUnhandledRejection;
              
              // Return result based on scenario execution
              if (result.status === "failed" || result.status === "error") {
                return {
                  success: false,
                  error: result.error || { message: "Scenario failed" },
                };
              }
              
              return {
                success: true,
              };
            } catch (err) {
              // Restore original error handlers
              window.onerror = originalErrorHandler;
              window.onunhandledrejection = originalUnhandledRejection;
              
              const error = err instanceof Error ? err : new Error(String(err));
              
              // Prefer the caught error (from scenario execution) over scenarioError (from error handlers)
              // But if scenarioError has more details, use that
              const errorToReturn = (scenarioError && scenarioError.message === error.message) 
                ? scenarioError 
                : {
                    message: error.message,
                    stack: error.stack || scenarioError?.stack,
                  };
              
              // CRITICAL: Always return error object, never throw or return undefined
              // This ensures Playwright can serialize the error properly
              return {
                success: false,
                error: errorToReturn,
              };
            }
          },
          {
            scenarioName,
            sandboxName: sandboxInfo.elementName,
          },
          );
        } catch (evalError) {
          // If page.evaluate() throws, it means the evaluated function threw an error
          // Playwright serializes errors, so we need to extract the actual error message
          const durationMs = Date.now() - startTime;
          const error = evalError instanceof Error ? evalError : new Error(String(evalError));
          
          // Try to extract the actual error message from Playwright's error
          // Playwright errors often have the actual error in the message
          let errorMessage = error.message;
          let errorStack = error.stack;
          
          // Playwright may wrap errors, so try to extract the actual error message
          // Common patterns:
          // - "Error: Expected false to be true"
          // - "Evaluation failed: Error: Expected false to be true"
          // - The error message might be in the stack trace
          if (errorMessage.includes("Error:")) {
            const match = errorMessage.match(/Error:\s*(.+?)(?:\n|$)/);
            if (match) {
              errorMessage = match[1].trim();
            }
          }
          
          // Also check the stack trace for the actual error message
          if (errorStack && errorStack.includes("Expected")) {
            const stackMatch = errorStack.match(/Expected[^\n]+/);
            if (stackMatch) {
              errorMessage = stackMatch[0];
            }
          }
          
          result = {
            name: scenarioName,
            status: "failed",
            durationMs,
            error: {
              message: errorMessage,
              stack: errorStack,
            },
          };
          
          // Skip the rest of the result processing
          sessionData.tests.push(result);
          results.push(result);
          currentTestName = null;
          continue;
        }
        
        // If evaluateResult is undefined/null, page.evaluate() may have returned undefined
        // This shouldn't happen, but handle it just in case
        if (evaluateResult === undefined || evaluateResult === null) {
          const durationMs = Date.now() - startTime;
          result = {
            name: scenarioName,
            status: "error",
            durationMs,
            error: {
              message: "Scenario evaluation returned undefined/null - possible error during execution",
            },
          };
          sessionData.tests.push(result);
          results.push(result);
          currentTestName = null;
          continue;
        }
        
        const durationMs = Date.now() - startTime;
        
        // Check if the evaluation returned an error
        // evaluateResult should be an object with { success: boolean, error?: {...} }
        // If evaluateResult is undefined/null, page.evaluate() may have thrown (caught above)
        if (!evaluateResult) {
          // This shouldn't happen if page.evaluate() completed successfully
          // But handle it just in case
          result = {
            name: scenarioName,
            status: "error",
            durationMs,
            error: {
              message: "Scenario evaluation returned no result",
            },
          };
        } else if (typeof evaluateResult === "object" && "success" in evaluateResult) {
          if (!evaluateResult.success && "error" in evaluateResult) {
            // Scenario failed with an error
            const errorInfo = (evaluateResult as { error: { message: string; stack?: string } }).error;
            result = {
              name: scenarioName,
              status: "failed",
              durationMs,
              error: errorInfo,
            };
          } else if (evaluateResult.success) {
            // Scenario passed
            result = {
              name: scenarioName,
              status: "passed",
              durationMs,
            };
          } else {
            // success is false but no error object - this shouldn't happen but handle it
            result = {
              name: scenarioName,
              status: "failed",
              durationMs,
              error: {
                message: "Scenario failed but no error details provided",
              },
            };
          }
        } else {
          // Unexpected result format - treat as error
          result = {
            name: scenarioName,
            status: "error",
            durationMs,
            error: {
              message: `Unexpected result format from scenario evaluation: ${JSON.stringify(evaluateResult)}`,
            },
          };
        }
      } catch (err) {
        // This catch block handles errors thrown by page.evaluate() itself
        // (e.g., if the evaluated function throws and Playwright serializes it)
        const durationMs = Date.now() - startTime;
        const error = err instanceof Error ? err : new Error(String(err));
        
        // Check if this is a Playwright error that contains the actual error message
        // Playwright wraps errors, so we need to extract the actual error message
        let errorMessage = error.message;
        let errorStack = error.stack;
        
        // Try to extract the actual error from Playwright's error message
        // Playwright errors often contain the actual error message in the message
        if (errorMessage.includes("Error:")) {
          // The actual error message might be embedded in Playwright's error
          const match = errorMessage.match(/Error:\s*(.+)/);
          if (match) {
            errorMessage = match[1];
          }
        }
        
        result = {
          name: scenarioName,
          status: "failed", // Changed from "error" to "failed" to match browser behavior
          durationMs,
          error: {
            message: errorMessage,
            stack: errorStack,
          },
        };
      } finally {
        // Always signal completion for this scenario (whether it passed or failed)
        // If this is the last scenario, signal that all scenarios are complete
        const isLast = scenarioName === scenarioNames[scenarioNames.length - 1];
        if (isLast) {
          await page.evaluate(() => {
            (window as any).__scenariosRunning = false;
            (window as any).__scenariosComplete = true;
            window.dispatchEvent(new CustomEvent("__scenariosComplete"));
          });
        }
        // Stop profiling if it was started
        if (profilingActive && cdp) {
          try {
            const { profile: cpuProfile } = await cdp.send("Profiler.stop");
            await cdp.send("Profiler.disable");
            profilingActive = false;
            profile = cpuProfile;
            
            // Add profile to result
            if (result) {
              if (profile) {
                (result as any).profile = profile;
                // Save profile to session data
                sessionData.profiles.set(scenarioName, profile);
              }
              
              // Save profile to file if output directory is specified
              if (options.output && profile) {
                const outputDir = path.resolve(options.output);
                // Ensure output directory exists
                if (!fs.existsSync(outputDir)) {
                  fs.mkdirSync(outputDir, { recursive: true });
                }
                
                // Generate filename: <sandbox>_<scenario>.cpuprofile
                const safeSandboxName = sandboxInfo.elementName.replace(/[^a-zA-Z0-9]/g, "_");
                const safeScenarioName = scenarioName.replace(/[^a-zA-Z0-9]/g, "_");
                const profilePath = path.join(outputDir, `${safeSandboxName}_${safeScenarioName}.cpuprofile`);
                
                fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
                console.log(`    💾 Profile saved: ${profilePath}`);
              }
              
              // Check profile assertions if they exist
              const profileAssertions = (sandboxData as any).profileAssertions?.[scenarioName] as ProfileAssertion[] | undefined;
              if (profileAssertions && profileAssertions.length > 0 && profile) {
                const hotspots = extractHotspots(profile, 20);
                const assertionResults = checkProfileAssertions(hotspots, profileAssertions);
                
                let assertionFailed = false;
                for (const assertionResult of assertionResults) {
                  if (!assertionResult.passed) {
                    assertionFailed = true;
                    console.log(`    ⚠️  Performance assertion failed: ${assertionResult.message}`);
                    if (assertionResult.actual) {
                      if (assertionResult.actual.position !== undefined) {
                        console.log(`       Actual position: ${assertionResult.actual.position}`);
                      }
                      if (assertionResult.actual.percentage !== undefined) {
                        console.log(`       Actual percentage: ${assertionResult.actual.percentage.toFixed(1)}%`);
                      }
                      if (assertionResult.actual.selfTimeMs !== undefined) {
                        console.log(`       Actual self time: ${assertionResult.actual.selfTimeMs.toFixed(2)}ms`);
                      }
                    }
                  }
                }
                
                if (assertionFailed) {
                  // Mark result as failed due to performance assertion
                  result.status = "failed";
                  result.error = {
                    message: "Performance assertion failed",
                    stack: undefined,
                  };
                } else {
                  console.log(`    ✅ All performance assertions passed`);
                }
              }
              
              // Compare with baseline if provided
              if (options.baseline && profile) {
                const baselineProfile = loadBaselineProfile(
                  options.baseline,
                  sandboxInfo.elementName,
                  scenarioName,
                );
                
                if (baselineProfile) {
                  const comparison = compareProfiles(profile, baselineProfile, options.baselineThreshold);
                  console.log(`    📊 Baseline Comparison: ${comparison.summary}`);
                  
                  if (comparison.diff.length > 0) {
                    console.log(`    Changes:`);
                    for (const diffHotspot of comparison.diff.slice(0, 5)) {
                      const fileName = diffHotspot.url.split("/").pop() || diffHotspot.url;
                      const location = `${fileName}:${diffHotspot.line + 1}`;
                      const sign = diffHotspot.selfTime > 0 ? "+" : "";
                      const pctSign = diffHotspot.percentage > 0 ? "+" : "";
                      console.log(`      ${sign}${diffHotspot.selfTime.toFixed(2)}ms (${pctSign}${diffHotspot.percentage.toFixed(1)}%) - ${diffHotspot.functionName} @ ${location}`);
                    }
                  } else {
                    console.log(`    No significant changes detected`);
                  }
                  
                  // Check for regressions and fail if thresholds exceeded
                  if (comparison.regressions.duration || comparison.regressions.hotspots.length > 0) {
                    let regressionFailed = false;
                    
                    if (comparison.regressions.duration) {
                      console.log(`    ❌ Performance regression: Duration increased by ${comparison.durationDiffMs.toFixed(2)}ms (${comparison.durationDiffPercent > 0 ? "+" : ""}${comparison.durationDiffPercent.toFixed(1)}%)`);
                      if (options.baselineThreshold?.maxDurationIncreaseMs && comparison.durationDiffMs > options.baselineThreshold.maxDurationIncreaseMs) {
                        console.log(`       Exceeds threshold of +${options.baselineThreshold.maxDurationIncreaseMs}ms`);
                      }
                      if (options.baselineThreshold?.maxDurationIncreasePercent && comparison.durationDiffPercent > options.baselineThreshold.maxDurationIncreasePercent) {
                        console.log(`       Exceeds threshold of +${options.baselineThreshold.maxDurationIncreasePercent}%`);
                      }
                      regressionFailed = true;
                    }
                    
                    for (const regression of comparison.regressions.hotspots) {
                      const fileName = regression.hotspot.url.split("/").pop() || regression.hotspot.url;
                      const location = `${fileName}:${regression.hotspot.line + 1}`;
                      console.log(`    ❌ Performance regression: ${regression.hotspot.functionName} @ ${location}`);
                      console.log(`       ${regression.reason}`);
                      regressionFailed = true;
                    }
                    
                    if (regressionFailed) {
                      result.status = "failed";
                      result.error = {
                        message: "Performance regression detected (baseline comparison)",
                        stack: undefined,
                      };
                    }
                  }
                } else {
                  console.log(`    ℹ️  No baseline profile found for comparison`);
                }
              }
            }
          } catch (err) {
            console.warn(`⚠️  Failed to stop profiling for ${scenarioName}:`, err);
          }
        }
      }
      
      // Add result to session data and results array
      sessionData.tests.push(result);
      results.push(result);
      currentTestName = null; // Clear current test name
    }
    
    // Wait for the page to signal that all scenarios are complete and cleanup is done
    // This ensures all event listeners are removed and the page is ready to close
    await page.waitForFunction(() => {
      return (window as any).__scenariosComplete === true && 
             (window as any).__scenariosRunning === false;
    }, { timeout: 30000 });
    
    // Additional small delay to ensure any final cleanup completes
    await new Promise(resolve => setTimeout(resolve, 100));
  } finally {
    // Don't close the page - it will be reused for the next sandbox
    // Just clear the container to prepare for next sandbox
    try {
      await page.evaluate(() => {
        const container = document.getElementById("sandbox-container");
        if (container) {
          container.innerHTML = "";
        }
      });
    } catch {
      // Ignore cleanup errors
    }
  }
  
  return results;
}

interface ScreenshotOptions {
  sandboxName: string;
  scenarioName?: string;
  outputPath?: string;
  width?: number;
  height?: number;
}

async function screenshotSandbox(options: ScreenshotOptions): Promise<void> {
  const elementsRoot = findElementsRoot();
  const sandboxes = discoverSandboxes(elementsRoot);
  const sandbox = sandboxes.find((s) => s.elementName === options.sandboxName);
  
  if (!sandbox) {
    console.error(`\n❌ Sandbox "${options.sandboxName}" not found\n`);
    process.exit(1);
  }
  
  // Get browser connection (similar to runScenarios)
  let browser: Browser;
  let shouldCloseBrowser = false;
  
  const wsEndpoint = process.env.WS_ENDPOINT;
  if (wsEndpoint) {
    try {
      browser = await chromium.connect(wsEndpoint);
    } catch (err) {
      console.warn(`Failed to connect to browser server: ${err instanceof Error ? err.message : String(err)}`);
      browser = await chromium.launch({
        headless: true,
        channel: "chrome",
      });
      shouldCloseBrowser = true;
    }
  } else {
    const monorepoRoot = findMonorepoRoot();
    const possiblePaths = [
      monorepoRoot ? path.join(monorepoRoot, ".wsEndpoint.json") : null,
      path.join(elementsRoot, ".wsEndpoint.json"),
      "/.wsEndpoint.json",
    ].filter((p): p is string => p !== null);
    
    let wsEndpointPath: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        wsEndpointPath = possiblePath;
        break;
      }
    }
    
    if (wsEndpointPath) {
      try {
        const { wsEndpoint: endpoint } = JSON.parse(fs.readFileSync(wsEndpointPath, "utf-8"));
        browser = await chromium.connect(endpoint);
      } catch (err) {
        browser = await chromium.launch({
          headless: true,
          channel: "chrome",
        });
        shouldCloseBrowser = true;
      }
    } else {
      browser = await chromium.launch({
        headless: true,
        channel: "chrome",
      });
      shouldCloseBrowser = true;
    }
  }
  
  const context = await browser.newContext({
    viewport: options.width && options.height 
      ? { width: options.width, height: options.height }
      : null,
  });
  const page = await context.newPage();
  
  try {
    // Navigate to scenario-runner.html
    const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";
    const devServerUrl = `http://${worktreeDomain}:4321`;
    
    await page.goto(`${devServerUrl}/scenario-runner.html?sandbox=${sandbox.elementName}`, {
      waitUntil: "load",
      timeout: 30000,
    });
    
    // Wait for container to exist
    await page.waitForFunction(() => {
      return document.getElementById("sandbox-container") !== null;
    }, { timeout: 5000 });
    
    // Wait for track components to load
    await page.waitForFunction(() => {
      return (window as any).__trackComponentsLoaded || (window as any).__trackComponentsLoadError;
    }, { timeout: 10000 }).catch(() => {});
    
    const preloadStatus = await page.evaluate(() => {
      return {
        loaded: (window as any).__trackComponentsLoaded,
        error: (window as any).__trackComponentsLoadError,
      };
    });
    
    if (preloadStatus.error) {
      throw new Error(`Track components preload failed: ${preloadStatus.error}`);
    }
    
    // Load the sandbox config and store it
    await page.evaluate(async ({ sandboxName }) => {
      const loadSandbox = (window as any).__loadSandbox;
      if (!loadSandbox) {
        throw new Error("__loadSandbox not available");
      }
      
      const config = await loadSandbox(sandboxName);
      (window as any).__sandboxConfig = config;
    }, { sandboxName: sandbox.elementName });
    
    // If a scenario is specified, run it first
    if (options.scenarioName) {
      const scenarioExists = await page.evaluate(({ scenarioName }) => {
        const config = (window as any).__sandboxConfig;
        return config && config.scenarios && scenarioName in config.scenarios;
      }, { scenarioName: options.scenarioName });
      
      if (!scenarioExists) {
        throw new Error(`Scenario "${options.scenarioName}" not found in sandbox "${sandbox.elementName}"`);
      }
      
      // Run the scenario
      const scenarioResult = await page.evaluate(async ({ scenarioName }) => {
        const runScenario = (window as any).__runScenario;
        if (!runScenario) {
          throw new Error("__runScenario not available");
        }
        
        const config = (window as any).__sandboxConfig;
        const container = document.getElementById("sandbox-container");
        if (!container) {
          throw new Error("sandbox-container not found");
        }
        
        const result = await runScenario(config, scenarioName, container);
        return result;
      }, { scenarioName: options.scenarioName });
      
      if (scenarioResult && (scenarioResult.status === "failed" || scenarioResult.status === "error")) {
        const errorMsg = scenarioResult.error?.message || "Scenario failed";
        throw new Error(`Scenario "${options.scenarioName}" failed: ${errorMsg}`);
      }
      
      // Wait for scenario to complete and DOM to settle
      await page.waitForTimeout(500);
      await page.waitForLoadState("networkidle").catch(() => {});
    } else {
      // Render the default template
      await page.evaluate(async () => {
        const litRender = (window as any).__litRender;
        if (!litRender) {
          throw new Error("__litRender not available");
        }
        
        const config = (window as any).__sandboxConfig;
        const container = document.getElementById("sandbox-container");
        if (!container) {
          throw new Error("sandbox-container not found");
        }
        
        // Render the template
        const templateResult = config.render();
        litRender(templateResult, container);
        
        // Run setup if provided
        if (config.setup) {
          await config.setup(container);
        }
      });
      
      // Wait for rendering to complete
      await page.waitForTimeout(500);
      await page.waitForLoadState("networkidle").catch(() => {});
    }
    
    // Generate output path
    let outputPath = options.outputPath;
    if (!outputPath) {
      const screenshotsDir = path.join(elementsRoot, ".ef-screenshots");
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const scenarioSuffix = options.scenarioName 
        ? `-${options.scenarioName.replace(/[^a-zA-Z0-9]/g, "_")}`
        : "";
      const filename = `${sandbox.elementName}${scenarioSuffix}-${timestamp}.png`;
      outputPath = path.join(screenshotsDir, filename);
    }
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Take screenshot of the container element
    const container = page.locator("#sandbox-container");
    await container.screenshot({ path: outputPath });
    
    console.log(`\n✅ Screenshot saved: ${outputPath}\n`);
  } finally {
    await page.close();
    await context.close();
    if (shouldCloseBrowser) {
      await browser.close();
    }
  }
}

async function profileScenario(
  sandboxName: string,
  scenarioName: string,
  outputPath: string,
): Promise<void> {
  console.log(`\n🔬 Profiling ${sandboxName}::${scenarioName}\n`);
  // Implementation similar to profile-playback.ts
  // This would use CDP Profiler API
  console.log("Profiling not yet implemented");
}

// ============================================================================
// Info Command - Progressive Discovery Queries
// ============================================================================

function findSessionId(args: string[]): string | null {
  const sessionIndex = args.indexOf("--session");
  if (sessionIndex >= 0 && args[sessionIndex + 1]) {
    return args[sessionIndex + 1];
  }
  return null;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

async function listSessions(limit?: number, sandboxFilter?: string): Promise<string[]> {
  const sessionDir = getSessionStorageDir();
  if (!fs.existsSync(sessionDir)) {
    console.log("No test sessions found.");
    console.log(`\nRun tests with: ${SCRIPT_NAME} run [sandbox-name]`);
    return [];
  }
  
  const entries = fs.readdirSync(sessionDir).filter(entry => {
    const entryPath = path.join(sessionDir, entry);
    return fs.statSync(entryPath).isDirectory();
  });
  
  if (entries.length === 0) {
    console.log("No test sessions found.");
    console.log(`\nRun tests with: ${SCRIPT_NAME} run [sandbox-name]`);
    return [];
  }
  
  // Load metadata for all sessions and sort by start time (newest first)
  const sessionsWithMetadata: Array<{id: string; metadata: TestSessionMetadata; mtime: number}> = [];
  for (const sessionId of entries) {
    const sessionPath = path.join(sessionDir, sessionId);
    const metadataPath = path.join(sessionPath, "metadata.json");
    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8")) as TestSessionMetadata;
        const stats = fs.statSync(sessionPath);
        if (!sandboxFilter || metadata.sandboxName.toLowerCase().includes(sandboxFilter.toLowerCase())) {
          sessionsWithMetadata.push({
            id: sessionId,
            metadata,
            mtime: stats.mtimeMs,
          });
        }
      } catch {
        // Skip sessions with invalid metadata
      }
    }
  }
  
  // Sort by start time (newest first)
  sessionsWithMetadata.sort((a, b) => b.metadata.startTime - a.metadata.startTime);
  
  const displayLimit = limit || 20;
  const displaySessions = sessionsWithMetadata.slice(0, displayLimit);
  
  console.log(`\nAvailable sessions (${sessionsWithMetadata.length}${sandboxFilter ? ` matching "${sandboxFilter}"` : ""}):\n`);
  for (let i = 0; i < displaySessions.length; i++) {
    const { id, metadata } = displaySessions[i];
    const date = new Date(metadata.startTime).toLocaleString();
    const statusIcon = metadata.status === "passed" ? "✓" : "✗";
    const duration = (metadata.duration / 1000).toFixed(1);
    console.log(`  ${i + 1}. ${statusIcon} ${id}`);
    console.log(`     Sandbox: ${metadata.sandboxName} | ${metadata.passedTests}/${metadata.totalTests} passed | ${duration}s | ${date}`);
  }
  if (sessionsWithMetadata.length > displayLimit) {
    console.log(`\n  ... and ${sessionsWithMetadata.length - displayLimit} more`);
  }
  console.log();
  
  return sessionsWithMetadata.map(s => s.id);
}

async function infoHistory(sessionId?: string, limit: number = 10, json: boolean = false): Promise<void> {
  // Get sessions synchronously for history
  const sessionDir = getSessionStorageDir();
  if (!fs.existsSync(sessionDir)) {
    if (json) {
      console.log("[]");
    } else {
      console.log("No test sessions found.");
      console.log(`\nRun tests with: ${SCRIPT_NAME} run [sandbox-name]`);
    }
    return;
  }
  
  const entries = fs.readdirSync(sessionDir).filter(entry => {
    const entryPath = path.join(sessionDir, entry);
    return fs.statSync(entryPath).isDirectory();
  });
  
  if (entries.length === 0) {
    if (json) {
      console.log("[]");
    } else {
      console.log("No test sessions found.");
      console.log(`\nRun tests with: ${SCRIPT_NAME} run [sandbox-name]`);
    }
    return;
  }
  
  // Load metadata for all sessions and sort by start time (newest first)
  const sessionsWithMetadata: Array<{id: string; metadata: TestSessionMetadata}> = [];
  let isSessionIdProvided = false;
  
  // Check if sessionId is actually a valid session ID
  if (sessionId) {
    const testData = loadSessionData(sessionId);
    if (testData) {
      isSessionIdProvided = true;
    }
  }
  
  for (const id of entries) {
    const data = loadSessionData(id);
    if (data) {
      if (!sessionId) {
        // No filter - include all sessions
        sessionsWithMetadata.push({ id, metadata: data.metadata });
      } else if (isSessionIdProvided) {
        // sessionId is a valid session ID - include all sessions (we'll filter by sandbox later)
        sessionsWithMetadata.push({ id, metadata: data.metadata });
      } else {
        // sessionId is a sandbox filter
        if (data.metadata.sandboxName.toLowerCase().includes(sessionId.toLowerCase())) {
          sessionsWithMetadata.push({ id, metadata: data.metadata });
        }
      }
    }
  }
  
  sessionsWithMetadata.sort((a, b) => b.metadata.startTime - a.metadata.startTime);
  const displaySessions = sessionsWithMetadata.slice(0, limit);
  
  if (json) {
    const sessionData = displaySessions.map(({ id, metadata }) => ({
      sessionId: id,
      sandboxName: metadata.sandboxName,
      status: metadata.status,
      duration: metadata.duration,
      totalTests: metadata.totalTests,
      passedTests: metadata.passedTests,
      failedTests: metadata.failedTests,
      startTime: metadata.startTime,
      date: new Date(metadata.startTime).toISOString(),
    }));
    
    console.log(JSON.stringify(sessionData, null, 2));
    return;
  }
  
  // If a specific session ID was provided, show history relative to that
  if (sessionId) {
    const currentData = loadSessionData(sessionId);
    if (!currentData) {
      console.error(`Session ${sessionId} not found`);
      process.exit(1);
    }
    
    // Filter to same sandbox
    const sameSandboxSessions = sessionsWithMetadata.filter(s => 
      s.metadata.sandboxName === currentData.metadata.sandboxName
    );
    
    const currentIndex = sameSandboxSessions.findIndex(s => s.id === sessionId);
    
    if (currentIndex < 0) {
      console.error(`Session ${sessionId} not found in history`);
      process.exit(1);
    }
    
    console.log(`\nTest run history for ${currentData.metadata.sandboxName}:`);
    console.log(`Current session: ${sessionId} (position ${currentIndex + 1} of ${sameSandboxSessions.length})\n`);
    
    const startIdx = Math.max(0, currentIndex - Math.floor(limit / 2));
    const endIdx = Math.min(sameSandboxSessions.length, startIdx + limit);
    const displaySessionsForSandbox = sameSandboxSessions.slice(startIdx, endIdx);
    
    for (let i = 0; i < displaySessionsForSandbox.length; i++) {
      const { id, metadata } = displaySessionsForSandbox[i];
      const isCurrent = id === sessionId;
      const date = new Date(metadata.startTime).toLocaleString();
      const statusIcon = metadata.status === "passed" ? "✓" : "✗";
      const duration = (metadata.duration / 1000).toFixed(1);
      const marker = isCurrent ? "← current" : "";
      console.log(`  ${statusIcon} ${id} ${marker}`);
      console.log(`    ${metadata.passedTests}/${metadata.totalTests} passed | ${duration}s | ${date}`);
    }
    
    if (currentIndex > 0) {
      const previousId = sameSandboxSessions[currentIndex - 1].id;
      console.log(`\n💡 Compare with previous run:`);
      console.log(`  ${SCRIPT_NAME} info compare ${previousId} ${sessionId}`);
    }
    return;
  }
  
  // Show general history
  console.log(`\nRecent test runs (${sessionsWithMetadata.length} total):\n`);
  for (let i = 0; i < displaySessions.length; i++) {
    const { id, metadata } = displaySessions[i];
    const date = new Date(metadata.startTime).toLocaleString();
    const statusIcon = metadata.status === "passed" ? "✓" : "✗";
    const duration = (metadata.duration / 1000).toFixed(1);
    console.log(`  ${i + 1}. ${statusIcon} ${id}`);
    console.log(`     Sandbox: ${metadata.sandboxName} | ${metadata.passedTests}/${metadata.totalTests} passed | ${duration}s | ${date}`);
  }
  if (sessionsWithMetadata.length > limit) {
    console.log(`\n  ... and ${sessionsWithMetadata.length - limit} more`);
  }
  console.log();
}

async function infoSummary(sessionId: string, json: boolean): Promise<void> {
  const data = loadSessionData(sessionId);
  if (!data) {
    const sessionDir = getSessionStorageDir();
    console.error(`Session ${sessionId} not found`);
    if (fs.existsSync(sessionDir)) {
      const entries = fs.readdirSync(sessionDir).filter(entry => {
        const entryPath = path.join(sessionDir, entry);
        return fs.statSync(entryPath).isDirectory();
      });
      if (entries.length > 0) {
        console.error(`\nAvailable sessions:`);
        for (const entry of entries.slice(0, 5)) {
          console.error(`  ${entry}`);
        }
        if (entries.length > 5) {
          console.error(`  ... and ${entries.length - 5} more`);
        }
        console.error(`\nList all sessions: ${SCRIPT_NAME} info list`);
      }
    } else {
      console.error(`\nNo sessions directory found. Run tests with: ${SCRIPT_NAME} run [sandbox-name]`);
    }
    process.exit(1);
  }
  
  if (json) {
    console.log(JSON.stringify({
      sessionId: data.metadata.sessionId,
      sandboxName: data.metadata.sandboxName,
      status: data.metadata.status,
      duration: data.metadata.duration,
      totalTests: data.metadata.totalTests,
      passedTests: data.metadata.passedTests,
      failedTests: data.metadata.failedTests,
      totalErrors: data.metadata.totalErrors,
      totalWarnings: data.metadata.totalWarnings,
      avgDuration: data.tests.length > 0
        ? data.tests.reduce((sum, t) => sum + t.durationMs, 0) / data.tests.length
        : 0,
      slowestTest: data.tests.length > 0
        ? data.tests.reduce((slowest, t) => t.durationMs > slowest.durationMs ? t : slowest, data.tests[0])
        : null,
      fastestTest: data.tests.length > 0
        ? data.tests.reduce((fastest, t) => t.durationMs < fastest.durationMs ? t : fastest, data.tests[0])
        : null,
    }, null, 2));
    return;
  }
  
  console.log(`\nSession: ${data.metadata.sessionId}`);
  console.log(`Sandbox: ${data.metadata.sandboxName}`);
  console.log(`Status: ${data.metadata.status.toUpperCase()}`);
  console.log(`Duration: ${(data.metadata.duration / 1000).toFixed(2)}s\n`);
  
  console.log(`Tests:`);
  console.log(`  Total: ${data.metadata.totalTests}`);
  console.log(`  Passed: ${data.metadata.passedTests}`);
  console.log(`  Failed: ${data.metadata.failedTests}`);
  
  if (data.tests.length > 0) {
    const avgDuration = data.tests.reduce((sum, t) => sum + t.durationMs, 0) / data.tests.length;
    const slowest = data.tests.reduce((slowest, t) => t.durationMs > slowest.durationMs ? t : slowest, data.tests[0]);
    const fastest = data.tests.reduce((fastest, t) => t.durationMs < fastest.durationMs ? t : fastest, data.tests[0]);
    
    console.log(`  Avg Duration: ${avgDuration.toFixed(0)}ms`);
    console.log(`  Slowest: "${slowest.name}" (${slowest.durationMs}ms)`);
    console.log(`  Fastest: "${fastest.name}" (${fastest.durationMs}ms)`);
  }
  
  console.log(`\nLogs:`);
  console.log(`  Browser errors: ${Array.from(data.errors.values()).reduce((sum, e) => sum + e.count, 0)}`);
  console.log(`  Browser warnings: ${Array.from(data.warnings.values()).reduce((sum, w) => sum + w.count, 0)}`);
    console.log(`  Debug logs: ${data.logs.filter(l => l.type === "debug" || l.type === "log").length}`);
    console.log(`  Log prefixes: ${data.logPrefixes.size}`);
}

async function infoWarnings(sessionId: string, warningType?: string, json: boolean = false): Promise<void> {
  const data = loadSessionData(sessionId);
  if (!data) {
    console.error(`Session ${sessionId} not found`);
    console.error(`List available sessions: ${SCRIPT_NAME} info list`);
    process.exit(1);
  }
  
  let warnings = Array.from(data.warnings.values());
  
  if (warningType) {
    warnings = warnings.filter(w => w.type.toLowerCase().includes(warningType.toLowerCase()));
    if (warnings.length === 0) {
      console.error(`Warning type "${warningType}" not found`);
      process.exit(1);
    }
    
    const warn = warnings[0];
    if (json) {
      console.log(JSON.stringify({
        ...warn,
        testNames: Array.from(warn.testNames),
      }, null, 2));
      return;
    }
    
    console.log(`\nWarning: ${warn.type}`);
    console.log(`Occurrences: ${warn.count}`);
    console.log(`Message: "${warn.message}"`);
    console.log(`\nContext:`);
    console.log(`  - Occurs in ${warn.testNames.size} different test${warn.testNames.size !== 1 ? 's' : ''}`);
    console.log(`  - First seen: ${new Date(warn.firstSeen).toISOString()}`);
    console.log(`  - Last seen: ${new Date(warn.lastSeen).toISOString()}`);
    
    if (warn.stackTrace) {
      console.log(`\nStack Trace (first occurrence):`);
      const lines = warn.stackTrace.split("\n");
      for (const line of lines) {
        console.log(`  ${line}`);
      }
    }
    
    // Show logs around the warning time to provide context
    const warningTimeWindow = 5000; // 5 seconds before/after warning
    const logsNearWarning = data.logs
      .filter(log => Math.abs(log.timestamp - warn.firstSeen) <= warningTimeWindow)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (logsNearWarning.length > 0) {
      console.log(`\nLogs around first occurrence (±${warningTimeWindow/1000}s):`);
      const warningIndex = logsNearWarning.findIndex(log => 
        log.type === 'warning' && log.text.includes(warn.message.slice(0, 50))
      );
      const startIndex = warningIndex >= 0 ? Math.max(0, warningIndex - 15) : 0;
      const endIndex = warningIndex >= 0 ? Math.min(logsNearWarning.length, warningIndex + 16) : Math.min(logsNearWarning.length, 30);
      const relevantLogs = logsNearWarning.slice(startIndex, endIndex);
      
      for (const log of relevantLogs) {
        const timeStr = new Date(log.timestamp).toISOString();
        const relativeTime = Math.abs((log.timestamp - warn.firstSeen) / 1000).toFixed(2);
        const sign = log.timestamp >= warn.firstSeen ? '+' : '-';
        const typeIcon = log.type === 'error' ? '✗' : log.type === 'warning' ? '⚠' : '•';
        const isWarningLog = log.type === 'warning' && log.text.includes(warn.message.slice(0, 50));
        const marker = isWarningLog ? '>>> ' : '    ';
        console.log(`${marker}[${timeStr}] ${sign}${relativeTime}s ${typeIcon} [${log.type}] ${log.text.slice(0, 200)}${log.text.length > 200 ? '...' : ''}`);
      }
      if (logsNearWarning.length > endIndex - startIndex) {
        console.log(`  ... and ${logsNearWarning.length - (endIndex - startIndex)} more log entries in this window`);
      }
    }
    
    console.log(`\n💡 Next steps:`);
    if (warn.testNames.size > 0) {
      const testNamesArray = Array.from(warn.testNames);
      const firstTest = testNamesArray[0];
      console.log(`  ${SCRIPT_NAME} info test "${firstTest}" --logs --session ${sessionId}  # View logs for affected test`);
      if (testNamesArray.length > 1) {
        console.log(`  ${SCRIPT_NAME} info test "${testNamesArray[1]}" --logs --session ${sessionId}  # View logs for another affected test`);
      }
    }
    const firstSeenDate = new Date(warn.firstSeen).toISOString();
    console.log(`  ${SCRIPT_NAME} info logs --session ${sessionId} --grep "${warn.type.slice(0, 30)}"  # Search logs for this warning`);
    console.log(`  ${SCRIPT_NAME} info warnings ${warn.type} --session ${sessionId}  # View full warning details again`);
    return;
  }
  
  if (json) {
    console.log(JSON.stringify(warnings.map(w => ({
      ...w,
      testNames: Array.from(w.testNames),
    })), null, 2));
    return;
  }
  
  const totalWarnings = warnings.reduce((sum, w) => sum + w.count, 0);
  console.log(`\nBrowser Warnings (${totalWarnings} total):\n`);
  
  if (warnings.length === 0) {
    console.log("  No warnings found");
    return;
  }
  
  // Sort by count descending
  warnings.sort((a, b) => b.count - a.count);
  
  // Calculate column widths dynamically based on content
  const maxTypeLength = Math.max(40, ...warnings.map(w => w.type.length));
  const typeWidth = Math.max(maxTypeLength, 40);
  const countWidth = 5;
  
  // Build table header
  const headerSeparator = "─".repeat(typeWidth);
  const countSeparator = "─".repeat(countWidth);
  console.log(`┌─${headerSeparator}─┬─${countSeparator}─┐`);
  console.log(`│ ${"Warning Type".padEnd(typeWidth)} │ ${"Count".padStart(countWidth)} │`);
  console.log(`├─${headerSeparator}─┼─${countSeparator}─┤`);
  
  for (const warn of warnings) {
    const count = warn.count.toString().padStart(countWidth);
    console.log(`│ ${warn.type.padEnd(typeWidth)} │ ${count} │`);
  }
  
  const footerSeparator = "─".repeat(typeWidth);
  console.log(`└─${footerSeparator}─┴─${countSeparator}─┘`);
  
  console.log(`\n💡 Drill down:`);
  console.log(`  ${SCRIPT_NAME} info warnings <warning-type> --session ${sessionId}`);
}

async function infoLogPrefixes(sessionId: string, prefix?: string, json: boolean = false): Promise<void> {
  const data = loadSessionData(sessionId);
  if (!data) {
    console.error(`Session ${sessionId} not found`);
    console.error(`List available sessions: ${SCRIPT_NAME} info list`);
    process.exit(1);
  }
  
  let prefixes = Array.from(data.logPrefixes.values());
  
  if (prefix) {
    prefixes = prefixes.filter(p => p.prefix.toLowerCase().includes(prefix.toLowerCase()));
    if (prefixes.length === 0) {
      console.error(`Log prefix "${prefix}" not found`);
      process.exit(1);
    }
    
    const prefixData = prefixes[0];
    if (json) {
      console.log(JSON.stringify({
        ...prefixData,
        testNames: Array.from(prefixData.testNames),
      }, null, 2));
      return;
    }
    
    console.log(`\nLog Prefix: ${prefixData.prefix}`);
    console.log(`Occurrences: ${prefixData.count}`);
    console.log(`Sample Message: "${prefixData.sampleMessage}"`);
    console.log(`\nContext:`);
    console.log(`  - Occurs in ${prefixData.testNames.size} different test${prefixData.testNames.size !== 1 ? 's' : ''}`);
    console.log(`  - First seen: ${new Date(prefixData.firstSeen).toISOString()}`);
    console.log(`  - Last seen: ${new Date(prefixData.lastSeen).toISOString()}`);
    
    // Show logs with this prefix
    const logsWithPrefix = data.logs
      .filter(log => {
        const logPrefix = extractLogPrefix(log.text);
        return logPrefix === prefixData.prefix;
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 10); // Show first 10 examples
    
    if (logsWithPrefix.length > 0) {
      console.log(`\nExample Logs (showing first ${Math.min(10, logsWithPrefix.length)}):`);
      for (const log of logsWithPrefix) {
        const timestamp = new Date(log.timestamp).toISOString().split("T")[1].slice(0, -1);
        const levelIcon = log.type === "error" ? "✗" : log.type === "warning" ? "⚠" : log.type === "info" ? "ℹ" : "•";
        console.log(`  [${timestamp}] ${levelIcon} [${log.type}] ${log.text}`);
      }
      if (prefixData.count > logsWithPrefix.length) {
        console.log(`  ... and ${prefixData.count - logsWithPrefix.length} more`);
      }
    }
    
    const testNamesArray = Array.from(prefixData.testNames);
    const firstTest = testNamesArray[0];
    console.log(`\n💡 Next steps:`);
    if (firstTest) {
      console.log(`  ${SCRIPT_NAME} info test "${firstTest}" --logs --session ${sessionId}  # View logs for affected test`);
      if (testNamesArray.length > 1) {
        console.log(`  ${SCRIPT_NAME} info test "${testNamesArray[1]}" --logs --session ${sessionId}  # View logs for another affected test`);
      }
    }
    console.log(`  ${SCRIPT_NAME} info logs --session ${sessionId} --grep "[${prefixData.prefix}]"  # Search logs for this prefix`);
    console.log(`  ${SCRIPT_NAME} info logs ${prefixData.prefix} --session ${sessionId}  # View full prefix details again`);
    return;
  }
  
  if (json) {
    console.log(JSON.stringify(prefixes.map(p => ({
      ...p,
      testNames: Array.from(p.testNames),
    })), null, 2));
    return;
  }
  
  const totalPrefixes = prefixes.reduce((sum, p) => sum + p.count, 0);
  console.log(`\nLog Prefixes (${totalPrefixes} total):\n`);
  
  if (prefixes.length === 0) {
    console.log("  No log prefixes found");
    return;
  }
  
  // Sort by count descending
  prefixes.sort((a, b) => b.count - a.count);
  
  // Calculate column widths dynamically based on content
  const maxPrefixLength = Math.max(30, ...prefixes.map(p => p.prefix.length));
  const prefixWidth = Math.max(maxPrefixLength, 30);
  const countWidth = 5;
  
  // Build table header
  const headerSeparator = "─".repeat(prefixWidth);
  const countSeparator = "─".repeat(countWidth);
  console.log(`┌─${headerSeparator}─┬─${countSeparator}─┐`);
  console.log(`│ ${"Log Prefix".padEnd(prefixWidth)} │ ${"Count".padStart(countWidth)} │`);
  console.log(`├─${headerSeparator}─┼─${countSeparator}─┤`);
  
  for (const prefixData of prefixes) {
    const count = prefixData.count.toString().padStart(countWidth);
    console.log(`│ ${prefixData.prefix.padEnd(prefixWidth)} │ ${count} │`);
  }
  
  const footerSeparator = "─".repeat(prefixWidth);
  console.log(`└─${footerSeparator}─┴─${countSeparator}─┘`);
  
  console.log(`\n💡 Drill down:`);
  console.log(`  ${SCRIPT_NAME} info logs <prefix> --session ${sessionId}`);
}

async function infoErrors(sessionId: string, errorType?: string, json: boolean = false, unexpectedOnly: boolean = false): Promise<void> {
  const data = loadSessionData(sessionId);
  if (!data) {
    console.error(`Session ${sessionId} not found`);
    console.error(`List available sessions: ${SCRIPT_NAME} info list`);
    process.exit(1);
  }
  
  let errors = Array.from(data.errors.values());
  
  if (unexpectedOnly) {
    errors = errors.filter(e => !e.expected);
  }
  
  if (errorType) {
    errors = errors.filter(e => e.type.toLowerCase().includes(errorType.toLowerCase()));
    if (errors.length === 0) {
      console.error(`Error type "${errorType}" not found`);
      process.exit(1);
    }
    
    const err = errors[0];
    if (json) {
      console.log(JSON.stringify({
        ...err,
        testNames: Array.from(err.testNames),
      }, null, 2));
      return;
    }
    
    console.log(`\nError: ${err.type}`);
    console.log(`Occurrences: ${err.count}`);
    console.log(`Message: "${err.message}"`);
    console.log(`Expected: ${err.expected ? "Yes (test environment limitation)" : "No"}`);
    console.log(`\nContext:`);
    console.log(`  - Occurs in ${err.testNames.size} different test${err.testNames.size !== 1 ? 's' : ''}`);
    console.log(`  - First seen: ${new Date(err.firstSeen).toISOString()}`);
    console.log(`  - Last seen: ${new Date(err.lastSeen).toISOString()}`);
    
    if (err.stackTrace) {
      console.log(`\nStack Trace (first occurrence):`);
      // Show full stack trace, not just first 5 lines
      const lines = err.stackTrace.split("\n");
      for (const line of lines) {
        console.log(`  ${line}`);
      }
    }
    
    // Show logs around the error time to provide context
    const errorTimeWindow = 5000; // 5 seconds before/after error
    const logsNearError = data.logs
      .filter(log => Math.abs(log.timestamp - err.firstSeen) <= errorTimeWindow)
      .sort((a, b) => a.timestamp - b.timestamp); // Sort chronologically
    
    if (logsNearError.length > 0) {
      console.log(`\nLogs around first occurrence (±${errorTimeWindow/1000}s):`);
      // Show up to 30 log entries around the error (15 before, 15 after)
      const errorIndex = logsNearError.findIndex(log => 
        log.type === 'error' && log.text.includes(err.message.slice(0, 50))
      );
      const startIndex = errorIndex >= 0 ? Math.max(0, errorIndex - 15) : 0;
      const endIndex = errorIndex >= 0 ? Math.min(logsNearError.length, errorIndex + 16) : Math.min(logsNearError.length, 30);
      const relevantLogs = logsNearError.slice(startIndex, endIndex);
      
      for (const log of relevantLogs) {
        const timeStr = new Date(log.timestamp).toISOString();
        const relativeTime = Math.abs((log.timestamp - err.firstSeen) / 1000).toFixed(2);
        const sign = log.timestamp >= err.firstSeen ? '+' : '-';
        const typeIcon = log.type === 'error' ? '✗' : log.type === 'warning' ? '⚠' : '•';
        const isErrorLog = log.type === 'error' && log.text.includes(err.message.slice(0, 50));
        const marker = isErrorLog ? '>>> ' : '    ';
        console.log(`${marker}[${timeStr}] ${sign}${relativeTime}s ${typeIcon} [${log.type}] ${log.text.slice(0, 200)}${log.text.length > 200 ? '...' : ''}`);
      }
      if (logsNearError.length > endIndex - startIndex) {
        console.log(`  ... and ${logsNearError.length - (endIndex - startIndex)} more log entries in this window`);
      }
    }
    
    console.log(`\n💡 Next steps:`);
    if (err.testNames.size > 0) {
      const testNamesArray = Array.from(err.testNames);
      const firstTest = testNamesArray[0];
      console.log(`  ${SCRIPT_NAME} info test "${firstTest}" --logs --session ${sessionId}  # View logs for affected test`);
      if (testNamesArray.length > 1) {
        console.log(`  ${SCRIPT_NAME} info test "${testNamesArray[1]}" --logs --session ${sessionId}  # View logs for another affected test`);
      }
    }
    // Show how to get logs around the error time
    const firstSeenDate = new Date(err.firstSeen).toISOString();
    console.log(`  ${SCRIPT_NAME} info logs --session ${sessionId} --grep "${err.type.slice(0, 30)}"  # Search logs for this error`);
    console.log(`  ${SCRIPT_NAME} info errors ${err.type} --session ${sessionId}  # View full error details again`);
    return;
  }
  
  if (json) {
    console.log(JSON.stringify(errors.map(e => ({
      ...e,
      testNames: Array.from(e.testNames),
    })), null, 2));
    return;
  }
  
  const totalErrors = errors.reduce((sum, e) => sum + e.count, 0);
  console.log(`\nBrowser Errors (${totalErrors} total):\n`);
  
  if (errors.length === 0) {
    console.log("  No errors found");
    return;
  }
  
  // Sort by count descending
  errors.sort((a, b) => b.count - a.count);
  
  // Calculate column widths dynamically based on content
  const maxTypeLength = Math.max(40, ...errors.map(e => e.type.length));
  // Don't truncate in table - show full names for LLM context
  const typeWidth = Math.max(maxTypeLength, 40);
  const countWidth = 5;
  const expectedWidth = 8;
  
  // Build table header
  const headerSeparator = "─".repeat(typeWidth);
  const countSeparator = "─".repeat(countWidth);
  const expectedSeparator = "─".repeat(expectedWidth);
  console.log(`┌─${headerSeparator}─┬─${countSeparator}─┬─${expectedSeparator}─┐`);
  console.log(`│ ${"Error Type".padEnd(typeWidth)} │ ${"Count".padStart(countWidth)} │ ${"Expected".padEnd(expectedWidth)} │`);
  console.log(`├─${headerSeparator}─┼─${countSeparator}─┼─${expectedSeparator}─┤`);
  
  for (const err of errors) {
    // Always show full error type - no truncation for LLM context
    const count = err.count.toString().padStart(countWidth);
    const expected = err.expected ? "✓" : "✗";
    const expectedStr = String(expected).padEnd(expectedWidth);
    console.log(`│ ${err.type.padEnd(typeWidth)} │ ${count} │ ${expectedStr} │`);
  }
  
  const footerSeparator = "─".repeat(typeWidth);
  console.log(`└─${footerSeparator}─┴─${countSeparator}─┴─${expectedSeparator}─┘`);
  
  if (!unexpectedOnly) {
    console.log(`\n💡 Drill down:`);
    console.log(`  ${SCRIPT_NAME} info errors <error-type> --session ${sessionId}`);
    console.log(`  ${SCRIPT_NAME} info errors --unexpected --session ${sessionId}`);
  }
}

async function infoTest(sessionId: string, testName: string, json: boolean = false, logs: boolean = false, profile: boolean = false, grep?: string, level?: string): Promise<void> {
  const data = loadSessionData(sessionId);
  if (!data) {
    console.error(`Session ${sessionId} not found`);
    console.error(`List available sessions: ${SCRIPT_NAME} info list`);
    process.exit(1);
  }
  
  const test = data.tests.find(t => t.name === testName || t.name.toLowerCase().includes(testName.toLowerCase()));
  if (!test) {
    console.error(`Test "${testName}" not found`);
    process.exit(1);
  }
  
  if (json) {
    const testData: any = { ...test };
    if (profile && data.profiles.has(test.name)) {
      testData.profile = data.profiles.get(test.name);
    }
    if (logs) {
      let testLogs = data.logs.filter(l => l.testName === test.name);
      if (level) {
        testLogs = testLogs.filter(l => l.type === level);
      }
      if (grep) {
        const grepLower = grep.toLowerCase();
        testLogs = testLogs.filter(l => l.text.toLowerCase().includes(grepLower));
      }
      testData.logs = testLogs;
    }
    console.log(JSON.stringify(testData, null, 2));
    return;
  }
  
  console.log(`\nTest: "${test.name}"`);
  console.log(`Status: ${test.status.toUpperCase()}`);
  console.log(`Duration: ${test.durationMs}ms\n`);
  
  if (logs) {
    let testLogs = data.logs.filter(l => l.testName === test.name);
    
    // Apply filters
    if (level) {
      testLogs = testLogs.filter(l => l.type === level);
    }
    if (grep) {
      const grepLower = grep.toLowerCase();
      testLogs = testLogs.filter(l => l.text.toLowerCase().includes(grepLower));
    }
    
    if (testLogs.length === 0) {
      console.log(`No logs found${level ? ` (filtered by level: ${level})` : ""}${grep ? ` (filtered by grep: "${grep}")` : ""}`);
    } else {
      console.log(`Logs (${testLogs.length} entries${level ? `, level: ${level}` : ""}${grep ? `, grep: "${grep}"` : ""}):`);
      for (const log of testLogs) {
        const timestamp = new Date(log.timestamp).toISOString().split("T")[1].slice(0, -1);
        const levelIcon = log.type === "error" ? "✗" : log.type === "warning" ? "⚠" : log.type === "info" ? "ℹ" : "•";
        console.log(`  [${timestamp}] ${levelIcon} [${log.type}] ${log.text}`);
      }
    }
  }
  
  if (profile && data.profiles.has(test.name)) {
    const profileData = data.profiles.get(test.name)!;
    const hotspots = extractHotspots(profileData, 5);
    if (hotspots.length > 0) {
      console.log(`\nPerformance Profile:`);
      console.log(`  Top 5 hotspots:`);
      for (let i = 0; i < hotspots.length; i++) {
        const h = hotspots[i];
        const fileName = h.url.split("/").pop() || h.url;
        console.log(`  ${i + 1}. ${h.selfTime.toFixed(2)}ms - ${h.functionName} @ ${fileName}:${h.line + 1}`);
      }
    }
  }
  
  if (test.error) {
    console.log(`\nError: ${test.error.message}`);
    if (test.error.stack) {
      const lines = test.error.stack.split("\n").slice(0, 5);
      for (const line of lines) {
        console.log(`  ${line}`);
      }
    }
  }
  
  if (!logs && !profile) {
    console.log(`\n💡 View logs:`);
    console.log(`  ${SCRIPT_NAME} info test "${test.name}" --logs --session ${sessionId}`);
    console.log(`  ${SCRIPT_NAME} info test "${test.name}" --logs --grep "pattern" --session ${sessionId}`);
    console.log(`  ${SCRIPT_NAME} info test "${test.name}" --logs --level error --session ${sessionId}`);
    if (data.profiles.has(test.name)) {
      console.log(`  ${SCRIPT_NAME} info test "${test.name}" --profile --session ${sessionId}`);
    }
  }
}

async function infoLogs(sessionId: string, testName?: string, grep?: string, level?: string, json: boolean = false): Promise<void> {
  const data = loadSessionData(sessionId);
  if (!data) {
    console.error(`Session ${sessionId} not found`);
    console.error(`List available sessions: ${SCRIPT_NAME} info list`);
    process.exit(1);
  }
  
  let logs = data.logs;
  
  // Filter by test name if provided
  if (testName) {
    const matchingTests = data.tests.filter(t => 
      t.name.toLowerCase().includes(testName.toLowerCase())
    );
    if (matchingTests.length === 0) {
      console.error(`No tests found matching "${testName}"`);
      process.exit(1);
    }
    const testNames = new Set(matchingTests.map(t => t.name));
    logs = logs.filter(l => l.testName && testNames.has(l.testName));
  }
  
  // Filter by level
  if (level) {
    logs = logs.filter(l => l.type === level);
  }
  
  // Filter by grep pattern
  if (grep) {
    const grepLower = grep.toLowerCase();
    logs = logs.filter(l => l.text.toLowerCase().includes(grepLower));
  }
  
  if (json) {
    console.log(JSON.stringify(logs, null, 2));
    return;
  }
  
  if (logs.length === 0) {
    console.log(`No logs found${testName ? ` for test "${testName}"` : ""}${level ? ` (level: ${level})` : ""}${grep ? ` (grep: "${grep}")` : ""}`);
    return;
  }
  
  console.log(`\nLogs (${logs.length} entries${testName ? ` for test: ${testName}` : ""}${level ? `, level: ${level}` : ""}${grep ? `, grep: "${grep}"` : ""}):\n`);
  
  // Group by test for better readability
  const logsByTest = new Map<string, BrowserLogEntry[]>();
  for (const log of logs) {
    const key = log.testName || "(global)";
    if (!logsByTest.has(key)) {
      logsByTest.set(key, []);
    }
    logsByTest.get(key)!.push(log);
  }
  
  for (const [test, testLogs] of logsByTest.entries()) {
    console.log(`Test: ${test}`);
    for (const log of testLogs) {
      const timestamp = new Date(log.timestamp).toISOString().split("T")[1].slice(0, -1);
      const levelIcon = log.type === "error" ? "✗" : log.type === "warning" ? "⚠" : log.type === "info" ? "ℹ" : "•";
      console.log(`  [${timestamp}] ${levelIcon} [${log.type}] ${log.text}`);
    }
    console.log();
  }
}

async function infoSearch(sessionId: string, query: string, json: boolean = false, testsOnly: boolean = false, errorsOnly: boolean = false): Promise<void> {
  const data = loadSessionData(sessionId);
  if (!data) {
    console.error(`Session ${sessionId} not found`);
    console.error(`List available sessions: ${SCRIPT_NAME} info list`);
    process.exit(1);
  }
  
  const queryLower = query.toLowerCase();
  const results: any = {
    tests: [],
    errors: [],
  };
  
  if (!errorsOnly) {
    results.tests = data.tests.filter(t => t.name.toLowerCase().includes(queryLower));
  }
  
  if (!testsOnly) {
    results.errors = Array.from(data.errors.values()).filter(e =>
      e.type.toLowerCase().includes(queryLower) || e.message.toLowerCase().includes(queryLower)
    );
  }
  
  if (json) {
    console.log(JSON.stringify({
      query,
      tests: results.tests,
      errors: results.errors.map(e => ({
        ...e,
        testNames: Array.from(e.testNames),
      })),
    }, null, 2));
    return;
  }
  
  if (results.tests.length > 0) {
    console.log(`\nFound in ${results.tests.length} tests:`);
    for (const test of results.tests) {
      const icon = test.status === "passed" ? "✓" : "✗";
      console.log(`  ${icon} ${test.name}`);
    }
  }
  
  if (results.errors.length > 0) {
    console.log(`\nFound in ${results.errors.length} errors:`);
    for (const err of results.errors) {
      console.log(`  ${err.type} (${err.count} occurrences)`);
    }
  }
  
  if (results.tests.length === 0 && results.errors.length === 0) {
    console.log(`No results found for "${query}"`);
  }
}

async function infoSuggest(sessionId: string, json: boolean = false): Promise<void> {
  const data = loadSessionData(sessionId);
  if (!data) {
    console.error(`Session ${sessionId} not found`);
    console.error(`List available sessions: ${SCRIPT_NAME} info list`);
    process.exit(1);
  }
  
  const suggestions: string[] = [];
  const nextQueries: string[] = [];
  
  // Analyze test results
  if (data.metadata.failedTests > 0) {
    suggestions.push(`${data.metadata.failedTests} test(s) failed - investigate failures`);
    nextQueries.push(`${SCRIPT_NAME} info tests --failed --session ${sessionId}`);
  } else {
    suggestions.push("All tests passed ✓");
  }
  
  // Analyze errors
  const unexpectedErrors = Array.from(data.errors.values()).filter(e => !e.expected);
  if (unexpectedErrors.length > 0) {
    suggestions.push(`${unexpectedErrors.length} unexpected error type(s) detected - review errors`);
    nextQueries.push(`${SCRIPT_NAME} info errors --unexpected --session ${sessionId}`);
  } else {
    const totalErrors = Array.from(data.errors.values()).reduce((sum, e) => sum + e.count, 0);
    if (totalErrors > 0) {
      suggestions.push(`${totalErrors} expected errors logged - investigate root causes: handle missing resources gracefully instead of throwing errors, avoid starting work that can't complete`);
      nextQueries.push(`${SCRIPT_NAME} info errors --session ${sessionId}`);
    }
  }
  
  // Analyze performance
  if (data.tests.length > 0) {
    const avgDuration = data.tests.reduce((sum, t) => sum + t.durationMs, 0) / data.tests.length;
    const slowTests = data.tests.filter(t => t.durationMs > avgDuration * 1.5);
    if (slowTests.length > 0) {
      suggestions.push(`${slowTests.length} test(s) significantly slower than average (>${(avgDuration * 1.5).toFixed(0)}ms) - review performance`);
      nextQueries.push(`${SCRIPT_NAME} info tests --slow --threshold ${Math.round(avgDuration * 1.5)}ms --session ${sessionId}`);
    }
    
    const slowest = data.tests.reduce((slowest, t) => t.durationMs > slowest.durationMs ? t : slowest, data.tests[0]);
    if (slowest.durationMs > 2000) {
      suggestions.push(`Slowest test: "${slowest.name}" (${slowest.durationMs}ms) - consider optimization`);
      nextQueries.push(`${SCRIPT_NAME} info test "${slowest.name}" --profile --session ${sessionId}`);
    }
  }
  
  // Check for patterns
  const errorTypes = Array.from(data.errors.values());
  if (errorTypes.length > 0) {
    const mostCommon = errorTypes.sort((a, b) => b.count - a.count)[0];
    if (mostCommon.count > 10) {
      suggestions.push(`Most common error: ${mostCommon.type} (${mostCommon.count} occurrences) - investigate root cause`);
      nextQueries.push(`${SCRIPT_NAME} info errors ${mostCommon.type} --session ${sessionId}`);
    }
  }
  
  if (suggestions.length === 0) {
    suggestions.push("No issues detected - test run looks healthy");
  }
  
  if (json) {
    console.log(JSON.stringify({
      suggestions,
      nextQueries,
      sessionId: data.metadata.sessionId,
      status: data.metadata.status,
    }, null, 2));
    return;
  }
  
  console.log(`\n💡 Suggestions for session ${sessionId}:\n`);
  for (let i = 0; i < suggestions.length; i++) {
    console.log(`  ${i + 1}. ${suggestions[i]}`);
  }
  
  if (nextQueries.length > 0) {
    console.log(`\n💡 Suggested next queries:\n`);
    for (const query of nextQueries) {
      console.log(`  ${query}`);
    }
  }
}

function resolveSessionId(sessionIdOrAlias: string, sandboxName?: string): string | null {
  // Handle special aliases
  if (sessionIdOrAlias === "last" || sessionIdOrAlias === "latest") {
    // Get sessions synchronously for this helper
    const sessionDir = getSessionStorageDir();
    if (!fs.existsSync(sessionDir)) {
      return null;
    }
    
    const entries = fs.readdirSync(sessionDir).filter(entry => {
      const entryPath = path.join(sessionDir, entry);
      return fs.statSync(entryPath).isDirectory();
    });
    
    const sessionsWithMetadata: Array<{id: string; metadata: TestSessionMetadata}> = [];
    for (const id of entries) {
      const data = loadSessionData(id);
      if (data && (!sandboxName || data.metadata.sandboxName.toLowerCase().includes(sandboxName.toLowerCase()))) {
        sessionsWithMetadata.push({ id, metadata: data.metadata });
      }
    }
    
    sessionsWithMetadata.sort((a, b) => b.metadata.startTime - a.metadata.startTime);
    return sessionsWithMetadata.length > 0 ? sessionsWithMetadata[0].id : null;
  }
  
  if (sessionIdOrAlias === "previous" || sessionIdOrAlias === "prev") {
    // Get sessions synchronously for this helper
    const sessionDir = getSessionStorageDir();
    if (!fs.existsSync(sessionDir)) {
      return null;
    }
    
    const entries = fs.readdirSync(sessionDir).filter(entry => {
      const entryPath = path.join(sessionDir, entry);
      return fs.statSync(entryPath).isDirectory();
    });
    
    const sessionsWithMetadata: Array<{id: string; metadata: TestSessionMetadata}> = [];
    for (const id of entries) {
      const data = loadSessionData(id);
      if (data && (!sandboxName || data.metadata.sandboxName.toLowerCase().includes(sandboxName.toLowerCase()))) {
        sessionsWithMetadata.push({ id, metadata: data.metadata });
      }
    }
    
    sessionsWithMetadata.sort((a, b) => b.metadata.startTime - a.metadata.startTime);
    return sessionsWithMetadata.length > 1 ? sessionsWithMetadata[1].id : null;
  }
  
  // Check if it's a valid session ID
  const data = loadSessionData(sessionIdOrAlias);
  if (data) {
    return sessionIdOrAlias;
  }
  
  return null;
}

async function infoCompare(sessionId1: string, sessionId2: string, json: boolean = false): Promise<void> {
  // Resolve aliases like "last", "previous"
  const resolvedId1 = resolveSessionId(sessionId1);
  const resolvedId2 = resolveSessionId(sessionId2);
  
  if (!resolvedId1) {
    console.error(`Session "${sessionId1}" not found`);
    if (sessionId1 === "last" || sessionId1 === "previous") {
      console.error(`No previous sessions available. Use a specific session ID or run tests first.`);
    }
    process.exit(1);
  }
  
  if (!resolvedId2) {
    console.error(`Session "${sessionId2}" not found`);
    if (sessionId2 === "last" || sessionId2 === "previous") {
      console.error(`No previous sessions available. Use a specific session ID or run tests first.`);
    }
    process.exit(1);
  }
  
  const data1 = loadSessionData(resolvedId1);
  const data2 = loadSessionData(resolvedId2);
  
  if (!data1) {
    console.error(`Session ${resolvedId1} not found`);
    process.exit(1);
  }
  if (!data2) {
    console.error(`Session ${resolvedId2} not found`);
    process.exit(1);
  }
  
  // Show which sessions are being compared (especially if aliases were used)
  if (sessionId1 !== resolvedId1 || sessionId2 !== resolvedId2) {
    console.log(`\nResolved session aliases:`);
    if (sessionId1 !== resolvedId1) {
      console.log(`  "${sessionId1}" → ${resolvedId1}`);
    }
    if (sessionId2 !== resolvedId2) {
      console.log(`  "${sessionId2}" → ${resolvedId2}`);
    }
    console.log();
  }
  
  const changes: string[] = [];
  const improvements: string[] = [];
  const regressions: string[] = [];
  
  // Compare test counts
  if (data1.metadata.totalTests !== data2.metadata.totalTests) {
    const diff = data2.metadata.totalTests - data1.metadata.totalTests;
    changes.push(`${diff > 0 ? "+" : ""}${diff} test(s) ${diff > 0 ? "added" : "removed"}`);
  }
  
  // Compare pass/fail
  if (data1.metadata.failedTests !== data2.metadata.failedTests) {
    const diff = data2.metadata.failedTests - data1.metadata.failedTests;
    if (diff < 0) {
      improvements.push(`${Math.abs(diff)} test(s) now passing`);
    } else {
      regressions.push(`${diff} test(s) now failing`);
    }
  }
  
  // Compare duration
  const durationDiff = data2.metadata.duration - data1.metadata.duration;
  const durationDiffPercent = data1.metadata.duration > 0 
    ? ((durationDiff / data1.metadata.duration) * 100) 
    : 0;
  
  if (Math.abs(durationDiffPercent) > 5) {
    if (durationDiff < 0) {
      improvements.push(`Performance: ${Math.abs(durationDiffPercent).toFixed(1)}% faster (${(Math.abs(durationDiff) / 1000).toFixed(1)}s improvement)`);
    } else {
      regressions.push(`Performance: ${durationDiffPercent.toFixed(1)}% slower (${(durationDiff / 1000).toFixed(1)}s regression)`);
    }
  }
  
  // Compare errors
  const errors1 = new Set(data1.errors.keys());
  const errors2 = new Set(data2.errors.keys());
  const newErrors = Array.from(errors2).filter(e => !errors1.has(e));
  const resolvedErrors = Array.from(errors1).filter(e => !errors2.has(e));
  
  if (newErrors.length > 0) {
    regressions.push(`${newErrors.length} new error type(s): ${newErrors.slice(0, 3).join(", ")}${newErrors.length > 3 ? "..." : ""}`);
  }
  if (resolvedErrors.length > 0) {
    improvements.push(`${resolvedErrors.length} error type(s) resolved`);
  }
  
  // Compare individual test durations
  const testMap1 = new Map(data1.tests.map(t => [t.name, t]));
  const testMap2 = new Map(data2.tests.map(t => [t.name, t]));
  
  const performanceChanges: Array<{test: string; diff: number; diffPercent: number}> = [];
  for (const [name, test2] of testMap2.entries()) {
    const test1 = testMap1.get(name);
    if (test1) {
      const diff = test2.durationMs - test1.durationMs;
      const diffPercent = test1.durationMs > 0 ? (diff / test1.durationMs) * 100 : 0;
      if (Math.abs(diffPercent) > 10) {
        performanceChanges.push({ test: name, diff, diffPercent });
      }
    }
  }
  
  if (performanceChanges.length > 0) {
    const slower = performanceChanges.filter(c => c.diff > 0).sort((a, b) => b.diffPercent - a.diffPercent);
    const faster = performanceChanges.filter(c => c.diff < 0).sort((a, b) => a.diffPercent - b.diffPercent);
    
    if (slower.length > 0) {
      regressions.push(`${slower.length} test(s) >10% slower: ${slower.slice(0, 2).map(s => `"${s.test}" (+${s.diffPercent.toFixed(0)}%)`).join(", ")}${slower.length > 2 ? "..." : ""}`);
    }
    if (faster.length > 0) {
      improvements.push(`${faster.length} test(s) >10% faster`);
    }
  }
  
  if (json) {
    console.log(JSON.stringify({
      session1: resolvedId1,
      session2: resolvedId2,
      changes,
      improvements,
      regressions,
      durationDiff,
      durationDiffPercent,
    }, null, 2));
    return;
  }
  
  console.log(`\nComparing sessions:`);
  console.log(`  Previous: ${resolvedId1} (${data1.metadata.totalTests} tests, ${data1.metadata.failedTests} failed)`);
  console.log(`  Current:  ${resolvedId2} (${data2.metadata.totalTests} tests, ${data2.metadata.failedTests} failed)\n`);
  
  if (changes.length > 0) {
    console.log(`Changes:`);
    for (const change of changes) {
      console.log(`  • ${change}`);
    }
    console.log();
  }
  
  if (improvements.length > 0) {
    console.log(`✓ Improvements:`);
    for (const improvement of improvements) {
      console.log(`  • ${improvement}`);
    }
    console.log();
  }
  
  if (regressions.length > 0) {
    console.log(`✗ Regressions:`);
    for (const regression of regressions) {
      console.log(`  • ${regression}`);
    }
    console.log();
  }
  
  if (improvements.length === 0 && regressions.length === 0 && changes.length === 0) {
    console.log(`No significant changes detected`);
  }
}

async function handleInfoCommand(args: string[]): Promise<void> {
  const subcommand = args[1];
  
  // Handle list command (doesn't require session ID)
  if (subcommand === "list") {
    const limitIndex = args.indexOf("--limit");
    const limit = limitIndex >= 0 && args[limitIndex + 1] ? parseInt(args[limitIndex + 1], 10) : undefined;
    const sandboxIndex = args.indexOf("--sandbox");
    const sandbox = sandboxIndex >= 0 && args[sandboxIndex + 1] ? args[sandboxIndex + 1] : undefined;
    await listSessions(limit, sandbox);
    process.exit(0);
  }
  
  // Handle history command (doesn't require session ID)
  if (subcommand === "history") {
    const sessionIdIndex = args.findIndex((a, i) => !a.startsWith("--") && a !== "history" && a !== "info" && (i === 0 || args[i - 1] !== "--limit"));
    const sessionId = sessionIdIndex >= 0 ? args[sessionIdIndex] : undefined;
    const limitIndex = args.indexOf("--limit");
    const limit = limitIndex >= 0 && args[limitIndex + 1] ? parseInt(args[limitIndex + 1], 10) : 10;
    const jsonFlag = hasFlag(args, "--json");
    await infoHistory(sessionId, limit, jsonFlag);
    process.exit(0);
  }
  
  // Handle compare command (doesn't use --session flag, takes two session IDs as positional args)
  if (subcommand === "compare") {
    const sessionId1Index = args.findIndex((a, i) => !a.startsWith("--") && a !== "compare" && a !== "info" && (i === 0 || args[i - 1] !== "--session"));
    const sessionId2Index = args.findIndex((a, i) => i > sessionId1Index && !a.startsWith("--") && a !== "compare" && a !== "info" && (i === 0 || args[i - 1] !== "--session"));
    const sessionId1 = sessionId1Index >= 0 ? args[sessionId1Index] : undefined;
    const sessionId2 = sessionId2Index >= 0 ? args[sessionId2Index] : undefined;
    
    if (!sessionId1 || !sessionId2) {
      console.error("Error: two session IDs are required");
      console.error(`Usage: ${SCRIPT_NAME} info compare <session-id-1> <session-id-2> [--json]`);
      process.exit(1);
    }
    const json = hasFlag(args, "--json");
    await infoCompare(sessionId1, sessionId2, json);
    process.exit(0);
  }
  
  // Show help if no subcommand provided
  if (!subcommand || subcommand.startsWith("--")) {
    console.log(`
Info Command - Progressive Discovery for Test Sessions

Usage:
  ${SCRIPT_NAME} info <subcommand> [--session <session-id>] [options]

Subcommands:
  list                          List available test sessions (no --session required)
  history [session-id]           Show test run history (optionally for specific session/sandbox)
  summary                       Show session summary (tests, duration, status)
  errors [type]                 Show error analysis (optionally filtered by type)
  warnings [type]               Show warning analysis (optionally filtered by type)
  test <name>                   Show individual test details
  logs [test-name]              Show logs (optionally filtered by test, level, or grep pattern)
  search <query>                Search tests and errors by name/message
  suggest                       Get AI-friendly suggestions based on session results
  compare <id1> <id2>           Compare two test sessions (supports "last", "previous" aliases)

Options:
  --session <id>                Session ID (required for all subcommands except list)
  --json                        Output JSON for machine parsing
  --unexpected                  (errors) Show only unexpected errors
  --logs                        (test) Include browser logs
  --profile                     (test) Include performance profile
  --grep <pattern>              (logs, test --logs) Filter logs by text pattern
  --level <level>               (logs, test --logs) Filter logs by level (error, warning, info, debug, log)
  --tests-only                  (search) Search only test names
  --errors-only                 (search) Search only errors

Examples:
  ${SCRIPT_NAME} info list                                    # List all sessions
  ${SCRIPT_NAME} info list --limit 5 --sandbox EFThumbnailStrip  # List recent 5 for sandbox
  ${SCRIPT_NAME} info history                                 # Show recent 10 runs
  ${SCRIPT_NAME} info history <session-id>                    # Show history relative to session
  ${SCRIPT_NAME} info summary --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info errors --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info errors scrubVideoInitSegmentFetchTask --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info warnings --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info warnings Canvas2D --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info logs --session ef-20260115-143022-a3f9                # Show all log prefixes
  ${SCRIPT_NAME} info logs captureFromClone --session ef-20260115-143022-a3f9  # Show prefix details
  ${SCRIPT_NAME} info test "handles complex composition" --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info test "renders thumbnails" --logs --grep "error" --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info logs --test "video" --level error --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info logs --grep "rendition" --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info search "video" --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info suggest --session ef-20260115-143022-a3f9
  ${SCRIPT_NAME} info compare last previous                   # Compare last two runs
  ${SCRIPT_NAME} info compare <id> last                       # Compare session with latest
  ${SCRIPT_NAME} info compare <id1> <id2>

Note: Session IDs are printed after running '${SCRIPT_NAME} run'. Use progressive discovery
      to drill down into test results without overwhelming context windows.
`);
    process.exit(0);
  }
  
  let sessionId = findSessionId(args);
  
  if (!sessionId) {
    console.error("Error: --session <session-id> is required");
    console.error(`Usage: ${SCRIPT_NAME} info <subcommand> --session <session-id> [options]`);
    console.error(`\nList available sessions: ${SCRIPT_NAME} info list`);
    console.error(`Session IDs are also printed after running '${SCRIPT_NAME} run'`);
    console.error(`\nYou can also use aliases: "last", "previous" (e.g., --session last)`);
    process.exit(1);
  }
  
  // Resolve session ID alias if needed
  if (sessionId === "last" || sessionId === "latest" || sessionId === "previous" || sessionId === "prev") {
    const resolvedSessionId = resolveSessionId(sessionId);
    if (!resolvedSessionId) {
      console.error(`Session alias "${sessionId}" not found. No previous sessions available.`);
      console.error(`Run tests first: ${SCRIPT_NAME} run [sandbox-name]`);
      process.exit(1);
    }
    sessionId = resolvedSessionId;
  }
  
  const json = hasFlag(args, "--json");
  
  if (subcommand === "summary") {
    await infoSummary(sessionId, json);
  } else if (subcommand === "warnings") {
    const sessionIdIndex = args.indexOf("--session");
    if (sessionIdIndex < 0 || !args[sessionIdIndex + 1]) {
      console.error("Error: --session <session-id> is required");
      console.error(`Usage: ${SCRIPT_NAME} info warnings [<warning-type>] --session <session-id> [--json]`);
      process.exit(1);
    }
    const sessionId = args[sessionIdIndex + 1];
    const json = hasFlag(args, "--json");
    
    // Check if a specific warning type was provided
    const warningTypeIndex = args.findIndex((a, i) => 
      !a.startsWith("--") && 
      a !== "warnings" && 
      a !== "info" && 
      i > 0 && 
      args[i - 1] !== "--session" &&
      args[i - 1] !== "--json"
    );
    const warningType = warningTypeIndex >= 0 ? args[warningTypeIndex] : undefined;
    
    await infoWarnings(sessionId, warningType, json);
    process.exit(0);
  } else if (subcommand === "errors") {
    // Find error type - it's the first non-flag argument that's not "errors", "info", or the session ID
    const sessionIndex = args.indexOf("--session");
    const errorTypeIndex = args.findIndex((a, i) => 
      !a.startsWith("--") && 
      a !== "errors" && 
      a !== "info" && 
      (sessionIndex < 0 || i !== sessionIndex + 1) // Not the session ID value
    );
    const errorType = errorTypeIndex >= 0 ? args[errorTypeIndex] : undefined;
    const unexpectedOnly = hasFlag(args, "--unexpected");
    await infoErrors(sessionId, errorType, json, unexpectedOnly);
  } else if (subcommand === "test") {
    const testNameIndex = args.findIndex(a => !a.startsWith("--") && a !== "test" && a !== "info");
    const testName = testNameIndex >= 0 ? args[testNameIndex] : undefined;
    if (!testName) {
      console.error("Error: test name is required");
      console.error("Usage: ef info test <test-name> --session <session-id> [--logs] [--profile]");
      process.exit(1);
    }
    const logs = hasFlag(args, "--logs");
    const profile = hasFlag(args, "--profile");
    const grepIndex = args.indexOf("--grep");
    const grep = grepIndex >= 0 && args[grepIndex + 1] ? args[grepIndex + 1] : undefined;
    const levelIndex = args.indexOf("--level");
    const level = levelIndex >= 0 && args[levelIndex + 1] ? args[levelIndex + 1] : undefined;
    await infoTest(sessionId, testName, json, logs, profile, grep, level);
  } else if (subcommand === "logs") {
    // Logs can take optional prefix/test name as positional arg, or use --test flag
    const testFlagIndex = args.indexOf("--test");
    const testNameFromFlag = testFlagIndex >= 0 && args[testFlagIndex + 1] ? args[testFlagIndex + 1] : undefined;
    const testNameIndex = args.findIndex((a, i) => 
      !a.startsWith("--") && 
      a !== "logs" && 
      a !== "info" && 
      (i === 0 || (args[i - 1] !== "--grep" && args[i - 1] !== "--level" && args[i - 1] !== "--test" && args[i - 1] !== "--session"))
    );
    const testNameFromPos = testNameIndex >= 0 ? args[testNameIndex] : undefined;
    const testName = testNameFromFlag || testNameFromPos;
    
    // Check if the positional arg is a log prefix (by checking if it exists in logPrefixes)
    // If it's a prefix, show prefix details; otherwise treat as test name
    if (testNameFromPos && !testNameFromFlag) {
      const data = loadSessionData(sessionId);
      if (data && data.logPrefixes.has(testNameFromPos)) {
        // Show log prefix details
        await infoLogPrefixes(sessionId, testNameFromPos, json);
        return;
      }
    }
    
    // Show logs (filtered by test name if provided, or show all prefixes if no args)
    if (!testName && !testNameFromFlag) {
      // No test name or prefix provided - show all log prefixes
      await infoLogPrefixes(sessionId, undefined, json);
    } else {
      // Show logs filtered by test name
      const grepIndex = args.indexOf("--grep");
      const grep = grepIndex >= 0 && args[grepIndex + 1] ? args[grepIndex + 1] : undefined;
      const levelIndex = args.indexOf("--level");
      const level = levelIndex >= 0 && args[levelIndex + 1] ? args[levelIndex + 1] : undefined;
      await infoLogs(sessionId, testName, grep, level, json);
    }
  } else if (subcommand === "search") {
    const queryIndex = args.findIndex(a => !a.startsWith("--") && a !== "search" && a !== "info");
    const query = queryIndex >= 0 ? args[queryIndex] : undefined;
    if (!query) {
      console.error("Error: search query is required");
      console.error("Usage: ef info search <query> --session <session-id> [--tests-only] [--errors-only]");
      process.exit(1);
    }
    const testsOnly = hasFlag(args, "--tests-only");
    const errorsOnly = hasFlag(args, "--errors-only");
    await infoSearch(sessionId, query, json, testsOnly, errorsOnly);
  } else if (subcommand === "suggest") {
    await infoSuggest(sessionId, json);
  } else {
    console.error(`Unknown info subcommand: ${subcommand}`);
    console.error("Available subcommands: list, summary, errors, warnings, logs, test, search, suggest, compare");
    console.error(`Run '${SCRIPT_NAME} info' without arguments to see usage`);
    process.exit(1);
  }
}

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
  categories                    Show all affordance categories
  list [name] [options]        List sandboxes (grouped by category, or scenarios for specific sandbox)
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
  --category <name>              Filter sandboxes by category (media, timeline, controls, etc.)
  --json                         Output JSON for machine parsing

Run Options:
  --scenario <pattern>          Run scenarios matching pattern (supports * wildcard)
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
  ${SCRIPT_NAME} categories           # Show all affordance categories
  ${SCRIPT_NAME} list                 # List all sandboxes grouped by category
  ${SCRIPT_NAME} list --category media # List sandboxes in media category
  ${SCRIPT_NAME} list EFDial          # Show scenarios for EFDial sandbox
  ${SCRIPT_NAME} open                # Open scenario viewer with all sandboxes
  ${SCRIPT_NAME} open EFDial         # Open scenario viewer with EFDial sandbox selected
  ${SCRIPT_NAME} run EFDial
  ${SCRIPT_NAME} run EFDial --scenario "normalizes*"
  ${SCRIPT_NAME} run EFDial --profile                      # Run with profiling
  ${SCRIPT_NAME} run --profile                             # Profile all sandboxes (CI mode)
  ${SCRIPT_NAME} profile EFDial --scenario "rotates through full circle"
  ${SCRIPT_NAME} screenshot CompactnessScene               # Screenshot default template
  ${SCRIPT_NAME} screenshot CompactnessScene --scenario "renders with timegroup"  # Screenshot after scenario
  ${SCRIPT_NAME} screenshot CompactnessScene --output ./screenshot.png --width 800 --height 600
  
Info Command (Progressive Discovery):
  ${SCRIPT_NAME} info summary --session <id>              # Session overview
  ${SCRIPT_NAME} info errors --session <id>               # Error analysis
  ${SCRIPT_NAME} info errors <type> --session <id>        # Specific error details
  ${SCRIPT_NAME} info errors --unexpected --session <id>  # Only unexpected errors
  ${SCRIPT_NAME} info test "<name>" --session <id>        # Test details
  ${SCRIPT_NAME} info test "<name>" --logs --session <id> # Test logs
  ${SCRIPT_NAME} info test "<name>" --profile --session <id> # Performance profile
  ${SCRIPT_NAME} info search "<query>" --session <id>     # Search tests/errors
  
  Add --json to any info command for machine-readable output
`);
    process.exit(0);
  }
  
  if (command === "categories") {
    await showCategories();
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
    const sandboxName = args[1]; // Optional - if provided, opens that sandbox, otherwise opens full viewer
    await openSandbox(sandboxName);
    // Keep process alive - wait for page to close or user interrupt
    // The page will stay open until user closes the browser window
    // Process will exit when user presses Ctrl+C (handled by cleanup handlers)
    console.log("Press Ctrl+C to exit.\n");
    
    // Wait indefinitely - cleanup handlers will exit on SIGINT/SIGTERM
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
let browserInstance: Browser | null = null;
let contextInstance: Awaited<ReturnType<typeof chromium.newContext>> | null = null;

const cleanup = async () => {
  if (cleanupInProgress) return;
  cleanupInProgress = true;
  try {
    if (contextInstance) {
      await contextInstance.close().catch(() => {});
    }
    if (browserInstance) {
      await browserInstance.close().catch(() => {});
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

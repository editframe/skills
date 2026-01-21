import * as fs from "node:fs";
import * as path from "node:path";
import { findElementsRoot } from "./paths.js";
import type { ScenarioResult } from "../../packages/elements/src/sandbox/index.js";

export interface BrowserLogEntry {
  timestamp: number;
  type: "log" | "error" | "warning" | "info" | "debug";
  text: string;
  testName?: string;
}

export interface BrowserError {
  type: string; // Error type/key (e.g., "scrubVideoInitSegmentFetchTask")
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  testNames: Set<string>;
  stackTrace?: string;
  expected: boolean; // Whether this is an expected error in test environment
}

export interface BrowserWarning {
  type: string; // Warning type/key (e.g., "Canvas2D_multiple_readback")
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  testNames: Set<string>;
  stackTrace?: string;
}

export interface BrowserLogPrefix {
  prefix: string; // Log prefix (e.g., "log", "captureFromClone", "renderToImage")
  count: number;
  firstSeen: number;
  lastSeen: number;
  testNames: Set<string>;
  sampleMessage: string; // Example message with this prefix
}

export interface TestSessionMetadata {
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

export interface TestSessionData {
  metadata: TestSessionMetadata;
  tests: ScenarioResult[];
  errors: Map<string, BrowserError>;
  warnings: Map<string, BrowserWarning>;
  logPrefixes: Map<string, BrowserLogPrefix>;
  logs: BrowserLogEntry[];
  profiles: Map<string, any>; // testName -> CPUProfile
}

export function getSessionStorageDir(): string {
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

export function generateSessionId(sandboxName: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const random = Math.random().toString(36).substr(2, 9);
  return `ef-${timestamp}-${random}`;
}

function getSessionDir(sessionId: string): string {
  return path.join(getSessionStorageDir(), sessionId);
}

export function saveSessionData(sessionId: string, data: TestSessionData): void {
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

export function loadSessionData(sessionId: string): TestSessionData | null {
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

export function cleanupOldSessions(maxAgeDays: number = 7): void {
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

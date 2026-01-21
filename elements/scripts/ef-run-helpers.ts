import * as fs from "node:fs";
import * as path from "node:path";
import type { TestSessionData } from "./ef-utils/session-storage.js";
import type { SandboxRunResult } from "./ef-utils/types.js";

export function mergeSessionData(
  target: TestSessionData,
  source: SandboxRunResult["sessionData"],
): void {
  target.logs.push(...source.logs);
  
  for (const [key, error] of source.errors) {
    const existing = target.errors.get(key);
    if (existing) {
      existing.count += error.count;
      existing.lastSeen = Math.max(existing.lastSeen, error.lastSeen);
      for (const testName of error.testNames) {
        existing.testNames.add(testName);
      }
      if (!existing.stackTrace && error.stackTrace) {
        existing.stackTrace = error.stackTrace;
      }
    } else {
      target.errors.set(key, { ...error, testNames: new Set(error.testNames) });
    }
  }
  
  for (const [key, warning] of source.warnings) {
    const existing = target.warnings.get(key);
    if (existing) {
      existing.count += warning.count;
      existing.lastSeen = Math.max(existing.lastSeen, warning.lastSeen);
      for (const testName of warning.testNames) {
        existing.testNames.add(testName);
      }
      if (!existing.stackTrace && warning.stackTrace) {
        existing.stackTrace = warning.stackTrace;
      }
    } else {
      target.warnings.set(key, { ...warning, testNames: new Set(warning.testNames) });
    }
  }
  
  for (const [key, prefix] of source.logPrefixes) {
    const existing = target.logPrefixes.get(key);
    if (existing) {
      existing.count += prefix.count;
      existing.lastSeen = Math.max(existing.lastSeen, prefix.lastSeen);
      for (const testName of prefix.testNames) {
        existing.testNames.add(testName);
      }
    } else {
      target.logPrefixes.set(key, { ...prefix, testNames: new Set(prefix.testNames) });
    }
  }
  
  for (const [key, profile] of source.profiles) {
    target.profiles.set(key, profile);
  }
}

export function createIsolatedSessionData(): SandboxRunResult["sessionData"] {
  return {
    logs: [],
    errors: new Map(),
    warnings: new Map(),
    logPrefixes: new Map(),
    profiles: new Map(),
  };
}

export function loadBaselineProfile(
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

import type { ScenarioResult } from "../../packages/elements/src/sandbox/index.js";
import type { BrowserLogEntry, BrowserError, BrowserWarning, BrowserLogPrefix } from "./session-storage.js";
import type { BaselineThreshold } from "./profile.js";

// Re-export types for convenience
export type { BrowserLogEntry, BrowserError, BrowserWarning, BrowserLogPrefix };

export interface RunOptions {
  sandboxName?: string;
  scenarioPattern?: string;
  watch?: boolean;
  profile?: boolean; // true = enable, false = disable, undefined = default (enabled unless watch mode)
  output?: string;
  baseline?: string;
  baselineThreshold?: BaselineThreshold;
  concurrency?: number; // Number of parallel workers (default: number of CPU cores)
  verbose?: boolean; // Show all test names (default: only show failures)
}

export interface SandboxRunResult {
  sandboxName: string;
  results: ScenarioResult[];
  passed: number;
  failed: number;
  error?: Error;
  sessionData: {
    logs: BrowserLogEntry[];
    errors: Map<string, BrowserError>;
    warnings: Map<string, BrowserWarning>;
    logPrefixes: Map<string, BrowserLogPrefix>;
    profiles: Map<string, any>;
  };
}

export interface ScreenshotOptions {
  sandboxName: string;
  scenarioName?: string;
  outputPath?: string;
  width?: number;
  height?: number;
}

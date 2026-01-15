import type { TemplateResult } from "lit";
import type { SandboxContext } from "./SandboxContext.js";

/**
 * Result of running a scenario
 */
export interface ScenarioResult {
  name: string;
  status: "passed" | "failed" | "error";
  durationMs: number;
  error?: {
    message: string;
    stack?: string;
  };
  // Optional profiling data if profiling was enabled
  profile?: unknown; // CPUProfile type from Chrome DevTools Protocol
}

/**
 * A scenario function that tests an element
 */
export type ScenarioFn = (ctx: SandboxContext) => Promise<void> | void;

/**
 * Collection of scenarios for a sandbox
 */
export type Scenarios = Record<string, ScenarioFn>;

/**
 * Sandbox configuration
 */
export interface SandboxConfig {
  name: string;
  description?: string;
  render: () => TemplateResult;
  setup?: (container: HTMLElement) => Promise<void> | void;
  scenarios: Scenarios;
}

/**
 * Internal sandbox metadata with resolved file path
 */
export interface Sandbox extends SandboxConfig {
  filePath: string;
  elementName: string; // Extracted from file name (e.g., "EFDial" from "EFDial.sandbox.ts")
}

/**
 * Helper to define a sandbox with type checking
 */
export function defineSandbox(config: SandboxConfig): SandboxConfig {
  return config;
}

// Export React SandboxViewer component
export { SandboxViewer } from "./SandboxViewer.js";

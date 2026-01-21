/**
 * Core sandbox definition types and helpers
 * 
 * This module contains only the types and helpers needed to define sandboxes.
 * It does NOT import any React components, making it safe to use in all contexts.
 */

import type { TemplateResult } from "lit";
import type { SandboxContext, Assertion } from "./SandboxContext.js";

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
  /** Assertions that ran during this scenario */
  assertions?: Assertion[];
  // Optional profiling data if profiling was enabled
  profile?: unknown; // CPUProfile type from Chrome DevTools Protocol
}

/**
 * A scenario function that tests an element
 */
export type ScenarioFn = (ctx: SandboxContext) => Promise<void> | void;

/**
 * Scenario type for categorization in the viewer
 * - "scenario": Main scenarios shown prominently (default)
 * - "validation": Edge cases and property tests, collapsed by default in viewer
 */
export type ScenarioType = "scenario" | "validation";

/**
 * Scenario category for organizing scenarios by purpose
 * - "demonstration": Shows how components work (for humans/LLMs to understand) - default
 * - "theming": For GUI components, allows inline theme modification via UI controls
 * - "internals": Verifies critical behaviors work correctly (metadata for tooling filtering)
 * - "performance": Built to give good profile output for performance improvement (triggers profiling)
 */
export type ScenarioCategory = "demonstration" | "theming" | "internals" | "performance";

/**
 * A scenario definition with optional metadata and performance assertions
 * Use this format when you want to add description, type, or performance assertions
 */
export interface Scenario {
  /**
   * The scenario function to execute
   */
  run: ScenarioFn;
  /**
   * Optional render function that returns HTML markup for this scenario.
   * If provided, this overrides the sandbox's top-level render() function.
   * This allows each scenario to have its own declarative HTML markup
   * instead of programmatically creating elements in the run function.
   */
  render?: () => TemplateResult;
  /**
   * Human-readable description of what this scenario tests
   * Shown in the viewer to help understand the scenario's purpose
   */
  description?: string;
  /**
   * Categorize as "scenario" (default, prominent) or "validation" (collapsed)
   * Validations are edge cases and property tests that are valuable but shouldn't
   * clutter the main scenario list
   */
  type?: ScenarioType;
  /**
   * Category for organizing scenarios by purpose
   * - "demonstration": Default category, shown prominently in viewer
   * - "theming": For GUI components, viewer should provide UI controls to modify CSS variables/properties inline
   * - "internals": Metadata for tooling to filter (viewer shows all, but tooling can hide)
   * - "performance": Automatically triggers profiling when run, can also have profileAssertions
   */
  category?: ScenarioCategory;
  /**
   * Optional performance assertions for this scenario
   * These assertions are checked when profiling is enabled
   */
  profileAssertions?: ProfileAssertion[];
}

/**
 * Collection of scenarios for a sandbox
 * Can be either:
 * - A Scenario object (with assertions)
 */
export type Scenarios = Record<string, Scenario>;

/**
 * Performance assertion for profile data
 */
export interface ProfileAssertion {
  type: "topHotspot" | "notInTopN" | "maxPercentage" | "maxSelfTime";
  functionName?: string;
  fileName?: string;
  position?: number; // For topHotspot: expected position (0-indexed)
  maxN?: number; // For notInTopN: ensure function is not in top N
  maxPercentage?: number; // For maxPercentage: maximum allowed percentage
  maxSelfTimeMs?: number; // For maxSelfTime: maximum allowed self time in ms
}

/**
 * Sandbox configuration
 */
export interface SandboxConfig {
  name: string;
  description?: string;
  /**
   * Top-level category for organizing sandboxes.
   * - "elements": Composition primitives (things you put in a timegroup)
   * - "gui": User interface components (how users interact with elements)
   * - "demos": Example compositions (complete working examples)
   */
  category?: string;
  /**
   * Subcategory within the parent category for finer organization.
   * 
   * For elements: "temporal", "media", "text", "visualization"
   * For gui: "controls", "timeline", "hierarchy", "preview", "canvas", "config"
   * For demos: "workbench", "compactness"
   */
  subcategory?: string;
  render: () => TemplateResult;
  setup?: (container: HTMLElement) => Promise<void> | void;
  scenarios: Scenarios;
}

export interface SandboxConfigInput {
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  render: () => TemplateResult;
  setup?: (container: HTMLElement) => Promise<void> | void;
  scenarios: Scenarios | Record<string, ScenarioFn>;
  assertions?: Assertion[];
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
export function defineSandbox(config: SandboxConfigInput): SandboxConfig {
  for (const key in config.scenarios) {
    if (typeof config.scenarios[key] === 'function') {
      config.scenarios[key] = {
        run: config.scenarios[key],
        description: key,
        type: 'scenario',
        category: 'demonstration',
      };
    }
  }
  return config as SandboxConfig;
}

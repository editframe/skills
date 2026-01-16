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
 * A scenario definition with optional metadata and performance assertions
 * Use this format when you want to add description, type, or performance assertions
 */
export interface Scenario {
  /**
   * The scenario function to execute
   */
  run: ScenarioFn;
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
   * Optional performance assertions for this scenario
   * These assertions are checked when profiling is enabled
   */
  profileAssertions?: ProfileAssertion[];
}

/**
 * Collection of scenarios for a sandbox
 * Can be either:
 * - A function (legacy format, no assertions)
 * - A Scenario object (with assertions)
 */
export type Scenarios = Record<string, ScenarioFn | Scenario>;

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

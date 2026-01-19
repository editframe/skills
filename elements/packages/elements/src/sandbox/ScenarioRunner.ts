/**
 * Shared scenario execution logic used by both CLI and browser viewers
 * This ensures consistent behavior across all test runners
 */

import { render, nothing } from "lit";
import type { SandboxConfig, ScenarioResult, ScenarioFn } from "./index.js";
import { SandboxContext } from "./SandboxContext.js";

export interface RunScenarioOptions {
  /**
   * Optional callback for logging messages
   */
  onLog?: (message: string) => void;
}

/**
 * Run a single scenario with proper isolation
 * 
 * This function handles:
 * - Container clearing for isolation
 * - Setup execution
 * - DOM synchronization
 * - Error handling
 * - Result creation
 */
export async function runScenario(
  sandboxConfig: SandboxConfig,
  scenarioName: string,
  container: HTMLElement,
  options: RunScenarioOptions = {},
): Promise<ScenarioResult> {
  const scenarioDef = sandboxConfig.scenarios[scenarioName];
  if (!scenarioDef) {
    throw new Error(`Scenario "${scenarioName}" not found`);
  }

  // Extract scenario function - handle both function and Scenario object formats
  const scenario: ScenarioFn = typeof scenarioDef === "function" 
    ? scenarioDef 
    : scenarioDef.run;

  if (!scenario) {
    throw new Error(`Scenario "${scenarioName}" has no run function`);
  }

  const startTime = performance.now();
  const result: ScenarioResult = {
    name: scenarioName,
    status: "passed",
    durationMs: 0,
  };

  // Create context outside try block so we can capture assertions even on failure
  let ctx: SandboxContext | undefined;

  try {
    // Clear container before running scenario to ensure isolation
    // This prevents state leakage between scenarios
    // We use Lit's render with `nothing` to properly clear the container
    // This preserves Lit's internal marker nodes and avoids ChildPart errors
    render(nothing, container);
    
    // Render the sandbox content into the container
    // This provides the elements that scenarios will query and test
    render(sandboxConfig.render(), container);
    
    // Run sandbox setup if provided (setup runs before each scenario for isolation)
    // This typically clears global caches (e.g., thumbnailImageCache.clear())
    if (sandboxConfig.setup) {
      await sandboxConfig.setup(container);
    }
    
    // Wait for DOM to settle after clearing, rendering, and setup
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

    // Create context with optional logging callback
    ctx = new SandboxContext(container, options.onLog);
    
    // Run the scenario
    await scenario(ctx);

    result.durationMs = performance.now() - startTime;
    result.status = "passed";
  } catch (err) {
    const durationMs = performance.now() - startTime;
    const error = err instanceof Error ? err : new Error(String(err));
    
    result.durationMs = durationMs;
    result.status = "failed";
    result.error = {
      message: error.message,
      stack: error.stack,
    };
  }

  // Capture assertions from context (even if scenario failed)
  if (ctx) {
    const assertions = ctx.getAssertions();
    if (assertions.length > 0) {
      result.assertions = [...assertions];
    }
  }

  return result;
}

/**
 * Run all scenarios sequentially with proper isolation between each
 */
export async function runAllScenarios(
  sandboxConfig: SandboxConfig,
  container: HTMLElement,
  options: RunScenarioOptions = {},
): Promise<ScenarioResult[]> {
  const scenarioNames = Object.keys(sandboxConfig.scenarios);
  const results: ScenarioResult[] = [];

  for (const scenarioName of scenarioNames) {
    const result = await runScenario(sandboxConfig, scenarioName, container, options);
    results.push(result);

    // Wait for DOM to settle between scenarios
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }

  return results;
}

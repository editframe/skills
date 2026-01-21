/**
 * Shared scenario execution logic used by both CLI and browser viewers
 * This ensures consistent behavior across all test runners
 */

import { render, nothing, type TemplateResult } from "lit";
import type { SandboxConfig, ScenarioResult } from "./index.js";
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

  const scenarioCategory = scenarioDef.category;
  // Get scenario-specific render function if provided, otherwise use sandbox render
  const scenarioRender: () => TemplateResult = scenarioDef.render ?? sandboxConfig.render;

  const startTime = performance.now();
  const result: ScenarioResult = {
    name: scenarioName,
    status: "passed",
    durationMs: 0,
  };

  // For performance scenarios, mark that profiling should be enabled
  // The actual profiling will be handled by the viewer/CLI that runs scenarios
  const isPerformanceScenario = scenarioCategory === "performance";

  // Create context outside try block so we can capture assertions even on failure
  let ctx: SandboxContext | undefined;

  // Install global error handlers to suppress AbortErrors during test execution
  // These occur when tasks are cancelled due to element disconnection during Lit's update cycle
  const originalErrorHandler = window.onerror;
  const originalUnhandledRejection = window.onunhandledrejection;
  const originalConsoleError = console.error;
  
  const isAbortError = (error: unknown): boolean => {
    return (
      error instanceof DOMException && error.name === "AbortError" ||
      error instanceof Error && (
        error.name === "AbortError" ||
        error.message?.includes("signal is aborted") ||
        error.message?.includes("The user aborted a request")
      )
    );
  };
  
  // Override console.error to filter out AbortErrors
  console.error = (...args: unknown[]) => {
    // Check if any argument is an AbortError
    for (const arg of args) {
      if (isAbortError(arg)) {
        return; // Suppress AbortError logging
      }
      // Also check error messages in strings
      if (typeof arg === "string" && (
        arg.includes("signal is aborted") ||
        arg.includes("AbortError")
      )) {
        return; // Suppress AbortError logging
      }
    }
    // Call original console.error for non-AbortErrors
    originalConsoleError.apply(console, args);
  };
  
  window.onerror = (message, source, lineno, colno, error) => {
    if (error && isAbortError(error)) {
      return true; // Suppress AbortError
    }
    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error);
    }
    return false;
  };
  
  window.onunhandledrejection = (event) => {
    if (isAbortError(event.reason)) {
      event.preventDefault();
      return;
    }
    if (originalUnhandledRejection) {
      // @ts-ignore
      originalUnhandledRejection(event);
    }
  };

  try {
    render(nothing, container);
    await Promise.resolve();
    render(scenarioRender(), container);
    await Promise.resolve();

    
    // Run sandbox setup if provided (setup runs before each scenario for isolation)
    // This typically clears global caches (e.g., thumbnailImageCache.clear())
    if (sandboxConfig.setup) {
      await sandboxConfig.setup(container);
    }

    // Create context with optional logging callback
    ctx = new SandboxContext(container, options.onLog);
    
    // For performance scenarios, emit an event that profiling tools can listen to
    // This allows the viewer/CLI to enable profiling before running the scenario
    if (isPerformanceScenario && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sandbox-scenario-performance-start", {
        detail: { scenarioName, startTime }
      }));
    }
    
    // Run the scenario
    await scenarioDef.run(ctx);
    
    // Emit event when performance scenario completes
    if (isPerformanceScenario && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sandbox-scenario-performance-end", {
        detail: { scenarioName, durationMs: performance.now() - startTime }
      }));
    }

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
  } finally {
    // Restore original error handlers
    window.onerror = originalErrorHandler;
    window.onunhandledrejection = originalUnhandledRejection;
    console.error = originalConsoleError;
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
    await Promise.resolve();
  }

  return results;
}

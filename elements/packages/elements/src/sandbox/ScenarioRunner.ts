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
      originalUnhandledRejection(event);
    }
  };

  try {
    // STEP 1: Collect task promises BEFORE clearing
    // This captures all currently running tasks
    const elements = Array.from(container.querySelectorAll("*"));
    const taskPromises: Promise<unknown>[] = [];
    
    for (const element of elements) {
      // Collect all taskComplete promises from Lit Tasks
      const anyElement = element as any;
      if (anyElement.mediaEngineTask?.taskComplete) {
        taskPromises.push(
          anyElement.mediaEngineTask.taskComplete.catch(() => {})
        );
      }
      if (anyElement.frameTask?.taskComplete) {
        taskPromises.push(
          anyElement.frameTask.taskComplete.catch(() => {})
        );
      }
      if (anyElement.unifiedVideoSeekTask?.taskComplete) {
        taskPromises.push(
          anyElement.unifiedVideoSeekTask.taskComplete.catch(() => {})
        );
      }
      // Add video-specific tasks
      if (anyElement.videoBufferTask?.taskComplete) {
        taskPromises.push(
          anyElement.videoBufferTask.taskComplete.catch(() => {})
        );
      }
      if (anyElement.scrubVideoBufferTask?.taskComplete) {
        taskPromises.push(
          anyElement.scrubVideoBufferTask.taskComplete.catch(() => {})
        );
      }
      // Add audio tasks
      if (anyElement.audioBufferTask?.taskComplete) {
        taskPromises.push(
          anyElement.audioBufferTask.taskComplete.catch(() => {})
        );
      }
      if (anyElement.audioSeekTask?.taskComplete) {
        taskPromises.push(
          anyElement.audioSeekTask.taskComplete.catch(() => {})
        );
      }
    }
    
    // STEP 2: Clear container - this disconnects elements and triggers task aborts
    // We use Lit's render with `nothing` to properly clear the container
    // This preserves Lit's internal marker nodes and avoids ChildPart errors
    render(nothing, container);
    
    // STEP 3: Wait for all previously collected task promises to settle
    // The tasks have now been aborted, so their promises should resolve/reject quickly
    // Use a timeout to prevent hanging if tasks never settle (shouldn't happen, but safety first)
    if (taskPromises.length > 0) {
      const settleTimeout = new Promise<void>(resolve => setTimeout(resolve, 2000));
      await Promise.race([
        Promise.allSettled(taskPromises),
        settleTimeout,
      ]);
    }
    
    // STEP 4: Give time for any microtasks/error handlers to complete
    await new Promise<void>(resolve => setTimeout(resolve, 50));
    
    // STEP 5: Render the sandbox content into the container
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

    // Wait for DOM to settle between scenarios
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }

  return results;
}

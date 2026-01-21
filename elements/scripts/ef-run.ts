import { chromium, type Browser, type BrowserContext, type Page, type CDPSession } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { discoverSandboxes } from "../sandbox-server/discover.js";
import type { ScenarioResult } from "../packages/elements/src/sandbox/index.js";
import { findElementsRoot, findMonorepoRoot, SCRIPT_NAME } from "./ef-utils/paths.js";
import { generateSessionId, saveSessionData, cleanupOldSessions, type TestSessionData } from "./ef-utils/session-storage.js";
import { extractErrorType, extractLogPrefix, extractWarningType, isExpectedError } from "./ef-utils/error-processing.js";
import { extractHotspots, checkProfileAssertions, compareProfiles, type ProfileAssertion, type Hotspot } from "./ef-utils/profile.js";
import { mergeSessionData, createIsolatedSessionData, loadBaselineProfile } from "./ef-run-helpers.js";
import { connectToBrowser } from "./ef-utils/browser.js";
import type { RunOptions, SandboxRunResult } from "./ef-utils/types.js";
import type { BrowserLogEntry } from "./ef-utils/session-storage.js";

// Export browser instances for cleanup
export let browserInstance: Browser | null = null;
export let contextInstance: BrowserContext | null = null;

// Scenario task type for parallel execution
type ScenarioTask = {
  sandboxInfo: { filePath: string; elementName: string };
  scenarioName: string;
};

// Per-page sandbox loading cache
const sandboxLoadedCache = new WeakMap<Page, Set<string>>();

// Discover all scenarios for sandboxes upfront
async function discoverScenarios(
  sandboxes: Array<{ filePath: string; elementName: string }>,
  options: RunOptions,
  elementsRoot: string,
  browser: Browser,
): Promise<ScenarioTask[]> {
  const tasks: ScenarioTask[] = [];
  
  // Use the provided browser connection for discovery
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";
    const devServerUrl = `http://${worktreeDomain}:4321`;
    
    for (const sandboxInfo of sandboxes) {
      try {
        // Navigate to scenario-runner page
        await page.goto(`${devServerUrl}/scenario-runner.html?sandbox=${sandboxInfo.elementName}`, {
          waitUntil: "load",
          timeout: 30000,
        });
        
        // Wait for preload
        await page.waitForFunction(() => (window as any).__trackComponentsLoaded || (window as any).__trackComponentsLoadError, {
          timeout: 10000,
        }).catch(() => {});
        
        // Load sandbox config to discover scenarios
        const sandboxData = await page.evaluate(async ({ sandboxName }) => {
          try {
            const loadSandbox = (window as any).__loadSandbox;
            if (!loadSandbox) {
              return { success: false, error: "__loadSandbox not available" };
            }
            
            const config = await loadSandbox(sandboxName);
            const scenarioNames: string[] = [];
            
            for (const [name] of Object.entries(config.scenarios || {})) {
              scenarioNames.push(name);
            }
            
            return { success: true, scenarioNames };
          } catch (err) {
            return {
              success: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        }, { sandboxName: sandboxInfo.elementName });
        
        if (sandboxData.success) {
          let scenarioNames = sandboxData.scenarioNames;
          
          // Filter by scenario pattern if provided
          if (options.scenarioPattern) {
            const pattern = new RegExp(options.scenarioPattern.replace(/\*/g, ".*"));
            scenarioNames = scenarioNames.filter((name) => pattern.test(name));
          }
          
          // Filter by scenario name if provided
          if (options.scenarioName) {
            scenarioNames = scenarioNames.filter((name) => name === options.scenarioName);
          }
          
          // Create tasks for each scenario
          for (const scenarioName of scenarioNames) {
            tasks.push({ sandboxInfo, scenarioName });
          }
        }
      } catch (err) {
        // If sandbox discovery fails, skip it (will be handled during execution)
        console.warn(`⚠️  Failed to discover scenarios for ${sandboxInfo.elementName}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } finally {
    await page.close();
    await context.close();
  }
  
  return tasks;
}

async function runSandboxWorker(
  page: Page,
  sandboxInfo: { filePath: string; elementName: string },
  options: RunOptions,
  elementsRoot: string,
  profileAssertionCounts?: { checked: number; passed: number; failed: number },
): Promise<SandboxRunResult> {
  const isolatedSessionData = createIsolatedSessionData();
  const tempSessionData: TestSessionData = {
    metadata: {
      sessionId: "",
      sandboxName: sandboxInfo.elementName,
      startTime: Date.now(),
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
    errors: isolatedSessionData.errors,
    warnings: isolatedSessionData.warnings,
    logPrefixes: isolatedSessionData.logPrefixes,
    logs: isolatedSessionData.logs,
    profiles: isolatedSessionData.profiles,
  };
  
  try {
    const results = await runSandboxScenarios(
      page,
      sandboxInfo,
      options,
      elementsRoot,
      tempSessionData,
      profileAssertionCounts,
    );
    
    let passed = 0;
    let failed = 0;
    for (const result of results) {
      if (result.status === "failed" || result.status === "error") {
        failed++;
      } else {
        passed++;
      }
    }
    
    return {
      sandboxName: sandboxInfo.elementName,
      results,
      passed,
      failed,
      sessionData: isolatedSessionData,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return {
      sandboxName: sandboxInfo.elementName,
      results: [],
      passed: 0,
      failed: 1,
      error,
      sessionData: isolatedSessionData,
    };
  }
}

export async function runScenarios(options: RunOptions): Promise<number> {
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
  
  // Connect to browser - ef run always connects to host browser server
  const { browser, shouldClose: shouldCloseBrowser } = await connectToBrowser({ forceLaunch: true });
  
  // Discover all scenarios upfront to create task queue
  const scenarioTasks = await discoverScenarios(sandboxesToRun, options, elementsRoot, browser);
  
  // Determine concurrency level based on scenario count, not sandbox count
  const concurrency = options.concurrency ?? os.cpus().length;
  const effectiveConcurrency = Math.min(concurrency, scenarioTasks.length || sandboxesToRun.length);
  
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
  
  let exitCode = 0;
  const context = await browser.newContext();
  contextInstance = context;
  browserInstance = browser;
  
  // Create worker pages
  const pages: Page[] = [];
  for (let i = 0; i < effectiveConcurrency; i++) {
    pages.push(await context.newPage());
  }
  
  const totalScenarios = scenarioTasks.length;
  const totalSandboxes = sandboxesToRun.length;
  if (totalScenarios > 0) {
    console.log(`🔄 Running ${totalScenarios} scenario(s) from ${totalSandboxes} sandbox(es) with ${effectiveConcurrency} worker(s)...\n`);
  } else {
    console.log(`🔄 Running ${totalSandboxes} sandbox(es) with ${effectiveConcurrency} worker(s)...\n`);
  }
  
  try {
    // Create scenario task queue and results collector
    const taskQueue = scenarioTasks.length > 0 ? [...scenarioTasks] : sandboxesToRun.map(s => ({ sandboxInfo: s, scenarioName: "" }));
    const scenarioResults: Array<{ sandboxName: string; result: ScenarioResult }> = [];
    
    // Track profile assertion results across all tests
    let totalProfileAssertionsChecked = 0;
    let totalProfileAssertionsPassed = 0;
    let totalProfileAssertionsFailed = 0;
    
    // Worker function that processes scenario tasks from queue
    const processQueue = async (page: Page): Promise<void> => {
      // Set up page listeners once per page
      setupPageListeners(page, sessionData);
      
      while (true) {
        const task = taskQueue.shift();
        if (!task) break;
        
        // Create shared tracking object (passed by reference, modified in place)
        const assertionCounts = {
          checked: totalProfileAssertionsChecked,
          passed: totalProfileAssertionsPassed,
          failed: totalProfileAssertionsFailed,
        };
        
        if (scenarioTasks.length > 0) {
          // Parallel scenario execution mode
          const result = await runSingleScenario(page, task.sandboxInfo, task.scenarioName, options, elementsRoot, sessionData, assertionCounts);
          if (result) {
            scenarioResults.push({ sandboxName: task.sandboxInfo.elementName, result });
          }
        } else {
          // Fallback to old sandbox-based execution (for backwards compatibility)
          const result = await runSandboxWorker(page, task.sandboxInfo, options, elementsRoot, assertionCounts);
          // Convert to scenario results format
          for (const scenarioResult of result.results) {
            scenarioResults.push({ sandboxName: task.sandboxInfo.elementName, result: scenarioResult });
          }
        }
        
        // Update totals from the shared object (modified by reference)
        totalProfileAssertionsChecked = assertionCounts.checked;
        totalProfileAssertionsPassed = assertionCounts.passed;
        totalProfileAssertionsFailed = assertionCounts.failed;
      }
    };
    
    // Start all workers
    await Promise.all(pages.map(page => processQueue(page)));
    
    // Aggregate results by sandbox
    const allResults: SandboxRunResult[] = [];
    const resultsBySandbox = new Map<string, ScenarioResult[]>();
    
    for (const { sandboxName, result } of scenarioResults) {
      if (!resultsBySandbox.has(sandboxName)) {
        resultsBySandbox.set(sandboxName, []);
      }
      resultsBySandbox.get(sandboxName)!.push(result);
    }
    
    // Convert to SandboxRunResult format
    for (const sandboxInfo of sandboxesToRun) {
      const scenarioResults = resultsBySandbox.get(sandboxInfo.elementName) || [];
      let passed = 0;
      let failed = 0;
      for (const result of scenarioResults) {
        if (result.status === "failed" || result.status === "error") {
          failed++;
        } else {
          passed++;
        }
      }
      
      allResults.push({
        sandboxName: sandboxInfo.elementName,
        results: scenarioResults,
        passed,
        failed,
        sessionData: createIsolatedSessionData(),
      });
    }
    
    // Sort results to maintain consistent ordering (by original sandbox order)
    const sandboxOrder = new Map(sandboxesToRun.map((s, i) => [s.elementName, i]));
    allResults.sort((a, b) => (sandboxOrder.get(a.sandboxName) ?? 0) - (sandboxOrder.get(b.sandboxName) ?? 0));
    
    // Process results and print output
    let totalPassed = 0;
    let totalFailed = 0;
    let failedSandboxes = 0;
    
    for (const result of allResults) {
      // Merge session data
      mergeSessionData(sessionData, result.sessionData);
      sessionData.tests.push(...result.results);
      
      // Determine if we should show details for this sandbox
      const hasFailures = result.error || result.failed > 0;
      const showDetails = options.verbose || hasFailures;
      
      if (showDetails) {
        // Print sandbox name
        console.log(`\n${result.sandboxName}`);
        
        if (result.error) {
          console.log(`  \x1b[31m✗\x1b[0m Failed to load sandbox`);
          console.log(`    Error: ${result.error.message}`);
          if (result.error.stack) {
            const stackLines = result.error.stack.split("\n").slice(0, 3);
            for (const line of stackLines) {
              console.log(`    ${line}`);
            }
          }
          console.log(`\n0 passed, 1 failed`);
          failedSandboxes++;
          totalFailed++;
          exitCode = 1;
          continue;
        }
        
        for (const scenarioResult of result.results) {
          // In non-verbose mode, only show failures
          if (!options.verbose && scenarioResult.status === "passed") {
            continue;
          }
          const icon = scenarioResult.status === "passed" ? "✓" : "✗";
          const statusColor = scenarioResult.status === "passed" ? "\x1b[32m" : "\x1b[31m";
          const resetColor = "\x1b[0m";
          console.log(
            `  ${statusColor}${icon}${resetColor} ${scenarioResult.name} (${scenarioResult.durationMs}ms)`,
          );
        }
        
        console.log(`\n${result.passed} passed, ${result.failed} failed`);
      }
      
      totalPassed += result.passed;
      totalFailed += result.failed;
      
      if (result.failed > 0) {
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
    console.log(`Workers: ${effectiveConcurrency}`);
    console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`Tests: ${totalPassed} passed, ${totalFailed} failed`);
    
    const totalBrowserErrors = Array.from(sessionData.errors.values()).reduce((sum, err) => sum + err.count, 0);
    if (totalBrowserErrors > 0) {
      console.log(`Warnings: ${totalBrowserErrors} browser errors logged`);
    }
    
    // Print profile assertion summary if any were checked
    if (totalProfileAssertionsChecked > 0) {
      if (totalProfileAssertionsFailed === 0) {
        console.log(`Profile assertions: ${totalProfileAssertionsChecked} passed`);
      } else {
        console.log(`Profile assertions: ${totalProfileAssertionsPassed} passed, ${totalProfileAssertionsFailed} failed`);
      }
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
    console.log(`  ${SCRIPT_NAME} info test "<scenario-name>" --session ${sessionId}              # Test details`);
    console.log(`  ${SCRIPT_NAME} info test "SandboxName:<scenario-name>" --session ${sessionId}  # Test with sandbox prefix`);
    console.log(`  ${SCRIPT_NAME} info test "<scenario-name>" --logs --session ${sessionId}       # Test logs`);
    console.log(`  ${SCRIPT_NAME} info test "<scenario-name>" --profile --session ${sessionId}    # Performance profile`);
    console.log(`  ${SCRIPT_NAME} info search "<query>" --session ${sessionId}    # Search tests/errors`);
    console.log(`\n  Add --json to any query for machine-readable output`);
    console.log(`${"=".repeat(60)}\n`);
    
    if (exitCode === 0) {
      console.log(`✅ All tests passed!\n`);
    } else {
      console.log(`❌ Some tests failed\n`);
    }
  } finally {
    // Close all pages and context
    for (const page of pages) {
      try {
        await page.close();
      } catch {
        // Ignore close errors
      }
    }
    await context.close();
    if (shouldCloseBrowser) {
      await browser.close();
    }
  }
  
  return exitCode;
}

// Set up console and error listeners for a page (called once per page)
function setupPageListeners(page: Page, sessionData: TestSessionData): void {
  // Capture browser console logs and errors for session data
  page.on("console", (msg) => {
    const text = msg.text();
    const msgType = msg.type() as BrowserLogEntry["type"];
    const timestamp = Date.now();
    
    // Get current test name from page context
    const currentTestName = (page as any).__currentTestName as string | null | undefined;
    
    // Filter out expected AbortErrors
    if (msgType === "error") {
      const isAbortError = 
        text.includes("signal is aborted") ||
        text.includes("AbortError") ||
        text.includes("The user aborted a request");
      
      if (isAbortError) {
        return;
      }
    }
    
    const logEntry: BrowserLogEntry = {
      timestamp,
      type: msgType,
      text,
      testName: currentTestName || undefined,
    };
    sessionData.logs.push(logEntry);
    
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
    
    if (msgType === "error") {
      const errorType = extractErrorType(text);
      const existingError = sessionData.errors.get(errorType);
      const expected = isExpectedError(errorType, text);
      
      let stackTrace: string | undefined;
      const stackMatch = text.match(/\n\s+at\s+/);
      if (stackMatch) {
        stackTrace = text;
      }
      
      if (existingError) {
        existingError.count++;
        existingError.lastSeen = timestamp;
        if (currentTestName) {
          existingError.testNames.add(currentTestName);
        }
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
    
    if (msgType === "warning") {
      const warningType = extractWarningType(text);
      const existingWarning = sessionData.warnings.get(warningType);
      
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
    const currentTestName = (page as any).__currentTestName as string | null | undefined;
    
    sessionData.logs.push({
      timestamp,
      type: "error",
      text: errorMessage,
      testName: currentTestName || undefined,
    });
    
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
}

// Ensure sandbox is loaded on a page (with caching)
async function ensureSandboxLoaded(
  page: Page,
  sandboxInfo: { filePath: string; elementName: string },
  elementsRoot: string,
): Promise<void> {
  // Check cache
  let loadedSandboxes = sandboxLoadedCache.get(page);
  if (!loadedSandboxes) {
    loadedSandboxes = new Set();
    sandboxLoadedCache.set(page, loadedSandboxes);
  }
  
  if (loadedSandboxes.has(sandboxInfo.elementName)) {
    return; // Already loaded
  }
  
  // Set up console listeners if not already set up
  // (We'll set these up once per page, they'll track all scenarios)
  
  const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";
  const devServerUrl = `http://${worktreeDomain}:4321`;
  
  // Navigate to the scenario-runner page
  await page.goto(`${devServerUrl}/scenario-runner.html?sandbox=${sandboxInfo.elementName}`, {
    waitUntil: "load",
    timeout: 30000,
  });
  
  // Wait for preload
  await page.waitForFunction(() => (window as any).__trackComponentsLoaded || (window as any).__trackComponentsLoadError, {
    timeout: 10000,
  }).catch(() => {});
  
  const preloadStatus = await page.evaluate(() => {
    return {
      loaded: (window as any).__trackComponentsLoaded,
      error: (window as any).__trackComponentsLoadError,
    };
  });
  
  if (preloadStatus.error) {
    throw new Error(`Track components preload failed: ${preloadStatus.error}`);
  }
  
  // Wait for container
  try {
    await page.waitForFunction(() => {
      return document.getElementById("sandbox-container") !== null;
    }, { timeout: 5000 });
  } catch {
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
  
  // Mark as loaded
  loadedSandboxes.add(sandboxInfo.elementName);
}

// Run a single scenario on a page
async function runSingleScenario(
  page: Page,
  sandboxInfo: { filePath: string; elementName: string },
  scenarioName: string,
  options: RunOptions,
  elementsRoot: string,
  sessionData: TestSessionData,
  profileAssertionCounts?: { checked: number; passed: number; failed: number },
): Promise<ScenarioResult | null> {
  // Set current test name on page for logging
  (page as any).__currentTestName = scenarioName;
  
  // Ensure sandbox is loaded
  await ensureSandboxLoaded(page, sandboxInfo, elementsRoot);
  
  const startTime = Date.now();
  let result: ScenarioResult;
  let profile: any = null;
  
  // Set up profiling if requested
  let cdp: CDPSession | null = null;
  let profilingActive = false;
  
  if (options.profile) {
    cdp = await page.context().newCDPSession(page);
  }
  
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
    // Run scenario
    let evaluateResult: any;
    try {
      evaluateResult = await page.evaluate(
        async ({ scenarioName, sandboxName }) => {
          let scenarioError: { message: string; stack?: string } | null = null;
          const originalErrorHandler = window.onerror;
          const originalUnhandledRejection = window.onunhandledrejection;
          
          window.onerror = (message, source, lineno, colno, error) => {
            scenarioError = {
              message: error?.message || String(message),
              stack: error?.stack || `${source}:${lineno}:${colno}`,
            };
            return false;
          };
          
          window.onunhandledrejection = (event: any) => {
            const reason = event.reason;
            scenarioError = {
              message: reason?.message || String(reason),
              stack: reason?.stack,
            };
          };
          
          try {
            (window as any).__scenariosRunning = true;
            const response = await fetch(`/sandbox/api/${sandboxName}/config`);
            const data = await response.json();
            
            const loadSandboxByPath = (window as any).__loadSandboxByPath;
            if (!loadSandboxByPath) {
              throw new Error("__loadSandboxByPath not available - scenario-runner may not be loaded");
            }
            
            const config = await loadSandboxByPath(data.filePath);
            const scenarioDef = config.scenarios[scenarioName];
            
            if (!scenarioDef) {
              throw new Error(`Scenario "${scenarioName}" not found`);
            }
            
            const scenario = typeof scenarioDef === "function" 
              ? scenarioDef 
              : scenarioDef.run;
            
            if (!scenario) {
              throw new Error(`Scenario "${scenarioName}" has no run function`);
            }
            
            const runScenario = (window as any).__runScenario;
            if (!runScenario) {
              throw new Error("__runScenario not available - scenario-runner may not be loaded");
            }
            
            const container = document.getElementById("sandbox-container");
            if (!container) throw new Error("Container not found");
            
            const result = await runScenario(
              config,
              scenarioName,
              container as HTMLElement
            );
            
            window.onerror = originalErrorHandler;
            window.onunhandledrejection = originalUnhandledRejection;
            
            if (result.status === "failed" || result.status === "error") {
              return {
                success: false,
                error: result.error || { message: "Scenario failed" },
              };
            }
            
            return { success: true };
          } catch (err) {
            window.onerror = originalErrorHandler;
            window.onunhandledrejection = originalUnhandledRejection;
            
            const error = err instanceof Error ? err : new Error(String(err));
            const errorToReturn = (scenarioError && scenarioError.message === error.message) 
              ? scenarioError 
              : {
                  message: error.message,
                  stack: error.stack || scenarioError?.stack,
                };
            
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
      const durationMs = Date.now() - startTime;
      const error = evalError instanceof Error ? evalError : new Error(String(evalError));
      
      let errorMessage = error.message;
      let errorStack = error.stack;
      
      if (errorMessage.includes("Error:")) {
        const match = errorMessage.match(/Error:\s*(.+?)(?:\n|$)/);
        if (match) {
          errorMessage = match[1].trim();
        }
      }
      
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
      
      sessionData.tests.push(result);
      return result;
    }
    
    const durationMs = Date.now() - startTime;
    
    if (!evaluateResult) {
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
        const errorInfo = (evaluateResult as { error: { message: string; stack?: string } }).error;
        result = {
          name: scenarioName,
          status: "failed",
          durationMs,
          error: errorInfo,
        };
      } else if (evaluateResult.success) {
        result = {
          name: scenarioName,
          status: "passed",
          durationMs,
        };
      } else {
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
      result = {
        name: scenarioName,
        status: "error",
        durationMs,
        error: {
          message: `Unexpected result format: ${JSON.stringify(evaluateResult)}`,
        },
      };
    }
    
    // Stop profiling if it was started
    if (profilingActive && cdp) {
      try {
        const { profile: cpuProfile } = await cdp.send("Profiler.stop");
        await cdp.send("Profiler.disable");
        profilingActive = false;
        profile = cpuProfile;
        
        if (profile) {
          (result as any).profile = profile;
          sessionData.profiles.set(scenarioName, profile);
        }
        
        if (options.output && profile) {
          const outputDir = path.resolve(options.output);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          const safeSandboxName = sandboxInfo.elementName.replace(/[^a-zA-Z0-9]/g, "_");
          const safeScenarioName = scenarioName.replace(/[^a-zA-Z0-9]/g, "_");
          const profilePath = path.join(outputDir, `${safeSandboxName}_${safeScenarioName}.cpuprofile`);
          
          fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
          console.log(`    💾 Profile saved: ${profilePath}`);
        }
      } catch (err) {
        console.warn(`⚠️  Failed to stop profiling for ${scenarioName}:`, err);
      }
    }
    
    // Check profile assertions if they exist
    const sandboxData = await page.evaluate(async ({ sandboxName }) => {
      try {
        const loadSandbox = (window as any).__loadSandbox;
        if (!loadSandbox) {
          return { success: false, error: "__loadSandbox not available" };
        }
        
        const config = await loadSandbox(sandboxName);
        const profileAssertions: Record<string, any[]> = {};
        
        for (const [name, scenario] of Object.entries(config.scenarios || {})) {
          if (scenario && typeof scenario === "object" && "run" in scenario) {
            const scenarioObj = scenario as { profileAssertions?: ProfileAssertion[] };
            if (scenarioObj.profileAssertions) {
              profileAssertions[name] = scenarioObj.profileAssertions;
            }
          }
        }
        
        return { success: true, profileAssertions };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }, { sandboxName: sandboxInfo.elementName });
    
    if (sandboxData.success && profile) {
      const profileAssertions = (sandboxData as any).profileAssertions?.[scenarioName] as ProfileAssertion[] | undefined;
      if (profileAssertions && profileAssertions.length > 0) {
        const hotspots = extractHotspots(profile, 20);
        const assertionResults = checkProfileAssertions(hotspots, profileAssertions);
        
        if (profileAssertionCounts) {
          profileAssertionCounts.checked += assertionResults.length;
        }
        let assertionFailed = false;
        for (const assertionResult of assertionResults) {
          if (!assertionResult.passed) {
            assertionFailed = true;
            if (profileAssertionCounts) {
              profileAssertionCounts.failed++;
            }
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
          } else {
            if (profileAssertionCounts) {
              profileAssertionCounts.passed++;
            }
          }
        }
        
        if (assertionFailed) {
          result.status = "failed";
          result.error = {
            message: "Performance assertion failed",
            stack: undefined,
          };
        }
      }
    }
    
    sessionData.tests.push(result);
    return result;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const error = err instanceof Error ? err : new Error(String(err));
    
    result = {
      name: scenarioName,
      status: "failed",
      durationMs,
      error: {
        message: error.message,
        stack: error.stack,
      },
    };
    
    sessionData.tests.push(result);
    return result;
  } finally {
    // Clear current test name
    (page as any).__currentTestName = null;
    
    if (cdp) {
      try {
        if (profilingActive) {
          await cdp.send("Profiler.stop");
          await cdp.send("Profiler.disable");
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

async function runSandboxScenarios(
  page: Page,
  sandboxInfo: { filePath: string; elementName: string },
  options: RunOptions,
  elementsRoot: string,
  sessionData: TestSessionData,
  profileAssertionCounts?: { checked: number; passed: number; failed: number },
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
      
      // Filter out expected AbortErrors - don't log them at all
      if (msgType === "error") {
        const isAbortError = 
          text.includes("signal is aborted") ||
          text.includes("AbortError") ||
          text.includes("The user aborted a request");
        
        if (isAbortError) {
          // Don't log expected AbortErrors - these are intentional cancellations
          return;
        }
      }
      
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
            const scenarioObj = scenario as { profileAssertions?: ProfileAssertion[] };
            if (scenarioObj.profileAssertions) {
              profileAssertions[name] = scenarioObj.profileAssertions;
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
              const response = await fetch(`/sandbox/api/${sandboxName}/config`);
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
                
                if (profileAssertionCounts) {
                  profileAssertionCounts.checked += assertionResults.length;
                }
                let assertionFailed = false;
                for (const assertionResult of assertionResults) {
                  if (!assertionResult.passed) {
                    assertionFailed = true;
                    if (profileAssertionCounts) {
                      profileAssertionCounts.failed++;
                    }
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
                  } else {
                    if (profileAssertionCounts) {
                      profileAssertionCounts.passed++;
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

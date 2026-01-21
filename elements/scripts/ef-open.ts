import { chromium, type Browser, type BrowserContext, type CDPSession } from "playwright";
import { findElementsRoot } from "./ef-utils/paths.js";
import { connectToBrowserNonHeadless } from "./ef-utils/browser.js";

// Export browser instances for cleanup
export let browserInstance: Browser | null = null;
export let contextInstance: BrowserContext | null = null;

export async function openSandbox(sandboxName?: string): Promise<void> {
  const elementsRoot = findElementsRoot();
  const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";
  
  // Generate a unique session ID for this browser session
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Open sandbox app with full navigation - if sandboxName provided, include it, otherwise show all sandboxes
  // Uses path-based routing: /sandbox/:sandboxName
  // Include sessionId so the page can identify itself for profiling
  // Include profile=true to enable profiling by default when opened with ef open
  const basePath = sandboxName 
    ? `/sandbox/${encodeURIComponent(sandboxName)}`
    : `/sandbox`;
  const url = `http://${worktreeDomain}:4321${basePath}?controlled=true&profile=true&sessionId=${encodeURIComponent(sessionId)}`;
  
  console.log(`\n🌐 Opening scenario viewer in Playwright-controlled browser...\n`);
  console.log(`📋 Session ID: ${sessionId}\n`);
  
  // Connect to browser
  const { browser, shouldClose: shouldCloseBrowser } = await connectToBrowserNonHeadless();
  
  // viewport: null allows the page to resize with the browser window
  // Without this, Playwright sets a fixed 1280x720 viewport that doesn't respond to resizing
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  
  // Create CDP session for profiling
  const cdp = await context.newCDPSession(page);
  console.log(`📊 CDP session created for profiling`);
  
  // Track profiling state to prevent concurrent profiling sessions
  let profilingActive = false;
  let profilingQueue: Array<() => void> = [];
  const MAX_QUEUE_SIZE = 5; // Prevent unbounded queue growth
  
  // Expose profiling functions to the page
  await page.exposeFunction("__startProfiling", async (optionsJson?: string) => {
    const options = optionsJson ? JSON.parse(optionsJson) : {};
    
    // If profiling is already active, queue this request (with limit)
    if (profilingActive) {
      if (profilingQueue.length >= MAX_QUEUE_SIZE) {
        console.warn(`[CDP] ⚠️ Profiling queue full (${profilingQueue.length} pending), rejecting request. Run scenarios sequentially when profiling.`);
        return JSON.stringify({ error: "Profiling queue full. Too many concurrent profiling requests. Run scenarios one at a time when profiling is enabled." });
      }
      console.log(`[CDP] ⏳ Profiling already active, queuing request (queue size: ${profilingQueue.length + 1})...`);
      await new Promise<void>((resolve) => {
        profilingQueue.push(resolve);
      });
    }
    
    profilingActive = true;
    console.log(`[CDP] Starting profiling with options:`, options);
    
    try {
      await cdp.send("Profiler.enable");
      await cdp.send("Profiler.setSamplingInterval", { interval: options.samplingInterval || 100 });
      await cdp.send("Profiler.start");
      return JSON.stringify({ started: true, timestamp: Date.now() });
    } catch (err) {
      console.error(`[CDP] ❌ Error starting profiling:`, err);
      profilingActive = false;
      // Process next in queue
      const next = profilingQueue.shift();
      if (next) next();
      return JSON.stringify({ error: `Failed to start profiling: ${err instanceof Error ? err.message : String(err)}` });
    }
  });
  
  await page.exposeFunction("__stopProfiling", async () => {
    try {
      console.log(`[CDP] Stopping profiling (queue size: ${profilingQueue.length})...`);
      const { profile } = await cdp.send("Profiler.stop");
      await cdp.send("Profiler.disable");
      console.log(`[CDP] Profile collected:`, {
        nodes: profile.nodes?.length || 0,
        samples: profile.samples?.length || 0,
        startTime: profile.startTime,
        endTime: profile.endTime,
      });
      
      // Mark profiling as inactive and process queue
      profilingActive = false;
      const next = profilingQueue.shift();
      if (next) {
        console.log(`[CDP] Processing next queued profiling request (${profilingQueue.length} remaining)...`);
        next();
      }
      
      if (!profile || !profile.nodes || profile.nodes.length === 0) {
        console.warn(`[CDP] ⚠️ Profile data is empty or invalid`);
        return JSON.stringify({ error: "Profile data is empty. Make sure profiling was started and the scenario ran long enough to collect samples." });
      }
      
      return JSON.stringify(profile); // Returns CPUProfile object
    } catch (err) {
      console.error(`[CDP] ❌ Error stopping profiling:`, err);
      await cdp.send("Profiler.disable").catch(() => {}); // Try to disable even on error
      
      // Mark profiling as inactive and process queue
      profilingActive = false;
      const next = profilingQueue.shift();
      if (next) {
        console.log(`[CDP] Processing next queued profiling request after error (${profilingQueue.length} remaining)...`);
        next();
      }
      
      return JSON.stringify({ error: `Failed to stop profiling: ${err instanceof Error ? err.message : String(err)}` });
    }
  });
  
  // Expose a function to reset profiling state if it gets stuck
  await page.exposeFunction("__resetProfiling", async () => {
    console.log(`[CDP] 🔄 Resetting profiling state. Was active: ${profilingActive}, queue size: ${profilingQueue.length}`);
    
    // Try to stop any active profiling
    if (profilingActive) {
      try {
        await cdp.send("Profiler.stop").catch(() => {});
        await cdp.send("Profiler.disable").catch(() => {});
      } catch {
        // Ignore errors during reset
      }
    }
    
    // Clear state
    profilingActive = false;
    const queueSize = profilingQueue.length;
    profilingQueue = [];
    
    return JSON.stringify({ reset: true, clearedQueueSize: queueSize });
  });
  
  console.log(`✅ Profiling functions exposed: __startProfiling, __stopProfiling, __resetProfiling`);
  
  // Navigate after exposing functions
  console.log(`Opening: ${url}`);
  await page.goto(url, { waitUntil: "load" });
  
  console.log("\n✅ Browser opened. Close browser window to exit.\n");
  
  // Keep browser open - don't close automatically
  // User will close the browser window manually
  // Store references so cleanup handlers can close if needed
  browserInstance = browser;
  contextInstance = context;
}

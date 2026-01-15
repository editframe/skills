/**
 * @deprecated This ProfileService is no longer used.
 * 
 * Profiling is now done via Playwright's `page.exposeFunction()` which injects
 * `__startProfiling` and `__stopProfiling` functions directly into pages opened
 * with `ef open`. This approach is more reliable because:
 * 
 * 1. The `ef open` process already has direct access to the page and CDP session
 * 2. No cross-process communication or HTTP API needed
 * 3. Playwright's exposeFunction handles all IPC reliably
 * 
 * The exposed functions are defined in: elements/scripts/ef.ts (openSandbox function)
 * They are used by: elements/dev-projects/src/scenario-viewer/ScenarioViewer.tsx
 * 
 * This file is kept for reference only and can be safely deleted.
 */

import { chromium, type Browser, type Page, type CDPSession } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ProfileNode {
  id: number;
  callFrame: {
    functionName: string;
    scriptId: string;
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
  hitCount?: number;
  children?: number[];
  positionTicks?: { line: number; ticks: number }[];
}

export interface CPUProfile {
  nodes: ProfileNode[];
  startTime: number;
  endTime: number;
  samples: number[];
  timeDeltas: number[];
}

interface ProfileSession {
  cdp: CDPSession;
  page: Page | null; // Can be null if we're using CDP directly
  targetId?: string; // CDP target ID if we're using direct CDP
}

interface RegisteredPage {
  page: Page;
  sessionId: string;
  url: string;
  registeredAt: number;
}

function findMonorepoRoot(elementsRootHint?: string): string | null {
  // Strategy 1: If elementsRootHint is provided, try to find monorepo root from it
  if (elementsRootHint) {
    console.log(`[ProfileService] 🔍 Using elementsRoot hint: ${elementsRootHint}`);
    // elementsRoot is typically /packages (elements root in Docker) or the actual elements directory
    // Monorepo root would be parent of elements directory
    let currentDir = elementsRootHint;
    
    // Check if currentDir is the monorepo root
    if (fs.existsSync(path.join(currentDir, "elements")) && fs.existsSync(path.join(currentDir, "telecine"))) {
      console.log(`[ProfileService] ✅ Found monorepo root from hint: ${currentDir}`);
      return currentDir;
    }
    
    // Check if currentDir is the elements directory (monorepo root would be parent)
    if (fs.existsSync(path.join(currentDir, "packages", "elements", "src"))) {
      // This is the elements root, monorepo root is parent
      const parent = path.dirname(currentDir);
      if (fs.existsSync(path.join(parent, "elements")) && fs.existsSync(path.join(parent, "telecine"))) {
        console.log(`[ProfileService] ✅ Found monorepo root (parent of elements): ${parent}`);
        return parent;
      }
    }
    
    // Traverse up from elementsRoot
    while (currentDir !== path.dirname(currentDir)) {
      if (
        fs.existsSync(path.join(currentDir, "elements")) &&
        fs.existsSync(path.join(currentDir, "telecine"))
      ) {
        console.log(`[ProfileService] ✅ Found monorepo root (traversed from hint): ${currentDir}`);
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
  }
  
  // Strategy 2: Try common locations starting from __dirname
  let currentDir = __dirname;
  console.log(`[ProfileService] 🔍 Starting search from __dirname: ${currentDir}`);
  
  // In Docker, we might be in /packages/sandbox-server (elements root is /packages)
  if (fs.existsSync(path.join(currentDir, "..", "packages", "elements", "src"))) {
    const elementsRoot = path.dirname(currentDir);
    const monorepoRoot = path.dirname(elementsRoot);
    if (fs.existsSync(path.join(monorepoRoot, "elements")) && fs.existsSync(path.join(monorepoRoot, "telecine"))) {
      console.log(`[ProfileService] ✅ Found monorepo root (Docker structure): ${monorepoRoot}`);
      return monorepoRoot;
    }
  }
  
  // Normal traversal from __dirname
  while (currentDir !== path.dirname(currentDir)) {
    if (
      fs.existsSync(path.join(currentDir, "elements")) &&
      fs.existsSync(path.join(currentDir, "telecine"))
    ) {
      console.log(`[ProfileService] ✅ Found monorepo root (normal traversal): ${currentDir}`);
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  console.warn(`[ProfileService] ⚠️  Could not find monorepo root`);
  return null;
}

export class ProfileService {
  private browser: Browser | null = null;
  private sessions = new Map<string, ProfileSession>();
  private registeredPages = new Map<string, RegisteredPage>();
  private elementsRoot?: string;
  private cdpBindingSetup = false;
  
  constructor(elementsRoot?: string) {
    this.elementsRoot = elementsRoot;
  }
  
  /**
   * Set up CDP binding so pages can register themselves directly
   * This is called once when we first connect to the browser
   */
  private async setupCDPBinding(browser: Browser): Promise<void> {
    if (this.cdpBindingSetup) {
      return;
    }
    
    console.log(`[ProfileService] 🔧 Setting up CDP binding for page registration...`);
    
    // Shared handler for binding calls
    const handleBindingCall = async (event: any) => {
      if (event.name === "__registerForProfiling") {
        try {
          const payload = JSON.parse(event.payload || "{}");
          const { sessionId, pageUrl } = payload;
          
          console.log(`[ProfileService] 📞 CDP binding called: sessionId=${sessionId}, pageUrl=${pageUrl}`);
          
          // Find the page by URL - retry a few times in case page isn't loaded yet
          let page = await this.findPageByUrl(pageUrl);
          if (!page) {
            // Wait a bit and retry (page might still be loading)
            await new Promise(resolve => setTimeout(resolve, 200));
            page = await this.findPageByUrl(pageUrl);
          }
          
          if (page) {
            if (sessionId) {
              this.registerPage(sessionId, page);
              console.log(`[ProfileService] ✅ Page registered via CDP binding: ${sessionId}`);
            } else {
              console.warn(`[ProfileService] ⚠️  CDP binding called without sessionId`);
            }
          } else {
            console.warn(`[ProfileService] ⚠️  Could not find page for URL: ${pageUrl}`);
            console.warn(`[ProfileService] 💡 This might be a timing issue - page may not be loaded yet`);
          }
        } catch (err) {
          console.error(`[ProfileService] ❌ Error handling CDP binding:`, err);
        }
      }
    };
    
    // Set up binding for a specific context
    const setupContextBinding = async (context: any) => {
      try {
        const pages = context.pages();
        if (pages.length === 0) {
          console.log(`[ProfileService] ⏳ Context has no pages yet, will set up when page is created`);
          // Set up listener for when pages are added
          context.on("page", async (page: any) => {
            console.log(`[ProfileService] 📄 New page created in context, setting up CDP binding...`);
            await setupContextBinding(context);
          });
          return;
        }
        
        const page = pages[0];
        const cdp = await context.newCDPSession(page);
        
        // Enable Runtime domain
        await cdp.send("Runtime.enable");
        
        // Add binding that pages can call
        await cdp.send("Runtime.addBinding", { name: "__registerForProfiling" });
        
        // Listen for binding calls
        cdp.on("Runtime.bindingCalled", handleBindingCall);
        
        console.log(`[ProfileService] ✅ CDP binding set up for context`);
      } catch (err) {
        console.error(`[ProfileService] ❌ Failed to setup CDP binding for context:`, err);
      }
    };
    
    try {
      // Set up for existing contexts
      const contexts = browser.contexts();
      console.log(`[ProfileService] 📋 Found ${contexts.length} existing contexts`);
      
      if (contexts.length === 0) {
        console.log(`[ProfileService] ⏳ No contexts yet - will set up binding when contexts are created`);
      } else {
        for (const context of contexts) {
          await setupContextBinding(context);
        }
      }
      
      // Set up for future contexts - this is critical!
      browser.on("context", async (context) => {
        console.log(`[ProfileService] 🔧 New browser context created, setting up CDP binding...`);
        await setupContextBinding(context);
      });
      
      // Also listen for pages being added to existing contexts
      for (const context of browser.contexts()) {
        context.on("page", async () => {
          console.log(`[ProfileService] 📄 Page added to context, ensuring CDP binding is set up...`);
          await setupContextBinding(context);
        });
      }
      
      this.cdpBindingSetup = true;
      console.log(`[ProfileService] ✅ CDP binding setup complete`);
    } catch (err) {
      console.error(`[ProfileService] ❌ Failed to setup CDP binding:`, err);
      // Don't throw - binding is optional, URL matching still works
    }
  }
  
  /**
   * Register a page for profiling using a sessionId
   * The sessionId is passed in the URL query parameter and persists across navigation
   */
  registerPage(sessionId: string, page: Page): void {
    const registeredPage: RegisteredPage = {
      page,
      sessionId,
      url: page.url(),
      registeredAt: Date.now(),
    };
    
    this.registeredPages.set(sessionId, registeredPage);
    console.log(`[ProfileService] 📝 Registered page with sessionId: ${sessionId} (${page.url()})`);
    
    // Clean up registration when page closes
    page.once("close", () => {
      this.registeredPages.delete(sessionId);
      console.log(`[ProfileService] 🗑️  Unregistered page: ${sessionId}`);
    });
  }
  
  /**
   * Get a registered page by sessionId
   */
  getRegisteredPage(sessionId: string): Page | null {
    console.log(`[ProfileService] 🔍 Looking up registered page for sessionId: ${sessionId}`);
    const registered = this.registeredPages.get(sessionId);
    if (!registered) {
      console.log(`[ProfileService] ❌ No registered page found for sessionId: ${sessionId}`);
      console.log(`[ProfileService] 💡 Available registered sessions:`, Array.from(this.registeredPages.keys()));
      return null;
    }
    
    // Check if page is still valid
    if (registered.page.isClosed()) {
      console.log(`[ProfileService] ⚠️  Registered page for sessionId ${sessionId} is closed, removing registration`);
      this.registeredPages.delete(sessionId);
      return null;
    }
    
    console.log(`[ProfileService] ✅ Found registered page for sessionId: ${sessionId} (${registered.page.url()})`);
    return registered.page;
  }
  
  async connectToBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      console.log(`[ProfileService] ✅ Using existing browser connection`);
      return this.browser;
    }
    
    console.log(`[ProfileService] 🔍 Connecting to browser...`);
    
    // Try to get wsEndpoint from environment variable first
    const wsEndpoint = process.env.WS_ENDPOINT;
    if (wsEndpoint) {
      console.log(`[ProfileService] 📍 Using WS_ENDPOINT from environment: ${wsEndpoint}`);
      try {
        this.browser = await chromium.connect(wsEndpoint);
        console.log(`[ProfileService] ✅ Connected to browser via environment variable`);
        return this.browser;
      } catch (err) {
        console.error(`[ProfileService] ❌ Failed to connect via environment variable:`, err);
        throw new Error(`Failed to connect to browser server: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    
    // Try to find .wsEndpoint.json file
    console.log(`[ProfileService] 🔍 Looking for .wsEndpoint.json file...`);
    const monorepoRoot = findMonorepoRoot(this.elementsRoot);
    console.log(`[ProfileService] 📍 Monorepo root: ${monorepoRoot || "not found"}`);
    
    // Build list of possible paths to check
    const possiblePaths: string[] = [];
    
    if (monorepoRoot) {
      possiblePaths.push(path.join(monorepoRoot, ".wsEndpoint.json"));
    }
    
    // Check common Docker mount points
    possiblePaths.push("/.wsEndpoint.json");
    
    // Check relative to elementsRoot if provided
    if (this.elementsRoot) {
      // Try parent of elementsRoot (monorepo root)
      const parent = path.dirname(this.elementsRoot);
      possiblePaths.push(path.join(parent, ".wsEndpoint.json"));
      // Try elementsRoot itself
      possiblePaths.push(path.join(this.elementsRoot, ".wsEndpoint.json"));
    }
    
    // Check process.cwd() and common locations
    possiblePaths.push(
      path.join(process.cwd(), ".wsEndpoint.json"),
      path.join(process.cwd(), "..", ".wsEndpoint.json"),
      path.join(process.cwd(), "..", "..", ".wsEndpoint.json"),
    );
    
    // Remove duplicates and nulls
    const uniquePaths = Array.from(new Set(possiblePaths.filter(p => p !== null)));
    
    console.log(`[ProfileService] 🔍 Checking ${uniquePaths.length} possible paths:`, uniquePaths);
    
    let wsEndpointPath: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        wsEndpointPath = possiblePath;
        console.log(`[ProfileService] ✅ Found .wsEndpoint.json at: ${wsEndpointPath}`);
        break;
      }
    }
    
    if (!wsEndpointPath) {
      console.error(`[ProfileService] ❌ No .wsEndpoint.json found in any of these paths:`, uniquePaths);
      console.error(`[ProfileService] 💡 Tip: In Docker, the monorepo root isn't mounted, so .wsEndpoint.json isn't accessible.`);
      console.error(`[ProfileService] 💡 Solution: Set WS_ENDPOINT environment variable with the browser WebSocket endpoint.`);
      console.error(`[ProfileService] 💡 You can get it by running: cat .wsEndpoint.json | jq -r .wsEndpoint`);
      throw new Error(
        "No .wsEndpoint.json found and WS_ENDPOINT not set. " +
        "Profiling requires a Playwright-controlled browser. " +
        "Either: 1) Set WS_ENDPOINT environment variable, or 2) Ensure .wsEndpoint.json is accessible. " +
        "Make sure host-chrome is running: ./scripts/start-host-chrome"
      );
    }
    
    try {
      const fileContent = fs.readFileSync(wsEndpointPath, "utf-8");
      const { wsEndpoint: endpoint } = JSON.parse(fileContent);
      console.log(`[ProfileService] 🔌 Connecting to browser at: ${endpoint}`);
      console.log(`[ProfileService] 📍 WebSocket endpoint from file: ${endpoint}`);
      this.browser = await chromium.connect(endpoint);
      console.log(`[ProfileService] ✅ Connected to browser successfully`);
      console.log(`[ProfileService] 📊 Browser connected: ${this.browser.isConnected()}`);
      
      // Try to get browser version info to verify connection
      try {
        const browserCDP = await this.browser.newBrowserCDPSession();
        const version = await browserCDP.send("Browser.getVersion");
        console.log(`[ProfileService] 🌐 Browser version: ${version.product} ${version.revision}`);
        await browserCDP.detach();
      } catch (err) {
        console.warn(`[ProfileService] ⚠️  Could not get browser version:`, err);
      }
      
      // Check contexts immediately after connection
      let contexts = this.browser.contexts();
      console.log(`[ProfileService] 📊 Browser contexts immediately after connection: ${contexts.length}`);
      
      // Also set up a listener to detect when contexts are created
      this.browser.on("context", (context) => {
        console.log(`[ProfileService] 🎉 New context created! Total contexts: ${this.browser!.contexts().length}`);
        const pages = context.pages();
        console.log(`[ProfileService] 📄 New context has ${pages.length} pages`);
        for (const page of pages) {
          console.log(`[ProfileService] 📄   Page: ${page.url()}`);
        }
      });
      
      // Check contexts again after a short delay (in case they're created asynchronously)
      setTimeout(() => {
        if (this.browser && this.browser.isConnected()) {
          contexts = this.browser.contexts();
          console.log(`[ProfileService] 📊 Browser contexts after delay: ${contexts.length}`);
          for (const context of contexts) {
            const pages = context.pages();
            console.log(`[ProfileService] 📊 Context has ${pages.length} pages`);
            for (const page of pages) {
              console.log(`[ProfileService] 📊   Page: ${page.url()}`);
            }
          }
        }
      }, 1000);
      
      // Log initial contexts
      for (const context of contexts) {
        const pages = context.pages();
        console.log(`[ProfileService] 📊 Context has ${pages.length} pages`);
        for (const page of pages) {
          console.log(`[ProfileService] 📊   Page: ${page.url()}`);
        }
      }
      
      // Set up CDP binding for page registration
      // This will also set up listeners for future contexts
      await this.setupCDPBinding(this.browser);
      
      // Also ensure we set up binding if contexts are created later
      // (This is a fallback in case the browser.on("context") handler doesn't fire)
      const checkAndSetupBinding = async () => {
        const contexts = this.browser!.contexts();
        if (contexts.length > 0 && !this.cdpBindingSetup) {
          console.log(`[ProfileService] 🔧 Contexts appeared, setting up CDP binding now...`);
          await this.setupCDPBinding(this.browser!);
        }
      };
      
      // Poll for contexts (in case browser.on("context") doesn't fire)
      const pollInterval = setInterval(() => {
        if (this.browser && this.browser.isConnected()) {
          checkAndSetupBinding();
        } else {
          clearInterval(pollInterval);
        }
      }, 1000);
      
      // Stop polling after 30 seconds
      setTimeout(() => clearInterval(pollInterval), 30000);
      
      return this.browser;
    } catch (err) {
      console.error(`[ProfileService] ❌ Failed to connect to browser:`, err);
      if (err instanceof Error) {
        console.error(`[ProfileService] Error stack:`, err.stack);
      }
      throw new Error(`Failed to connect to browser: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  
  async findPageByUrl(urlPattern: string): Promise<Page | null> {
    console.log(`[ProfileService] 🔍 Finding page with URL pattern: ${urlPattern}`);
    
    const browser = await this.connectToBrowser();
    
    // Always get fresh contexts - they might have been created since we connected
    let contexts = browser.contexts();
    console.log(`[ProfileService] 📋 Found ${contexts.length} browser contexts`);
    
    // If no contexts, try using CDP to find targets directly and attach to them
    if (contexts.length === 0) {
      console.log(`[ProfileService] ⏳ No contexts found via Playwright API, trying CDP Target domain...`);
      try {
        const browserCDP = await browser.newBrowserCDPSession();
        const { targetInfos } = await browserCDP.send("Target.getTargets");
        console.log(`[ProfileService] 📋 Found ${targetInfos.length} targets via CDP Target.getTargets`);
        
        // Log all targets for debugging
        for (const targetInfo of targetInfos) {
          console.log(`[ProfileService] 🎯 Target: type=${targetInfo.type}, url=${targetInfo.url || "about:blank"}, targetId=${targetInfo.targetId}, title=${targetInfo.title || "none"}`);
        }
        
        // Parse the target URL to match against
        let targetUrlObj: URL | null = null;
        try {
          targetUrlObj = new URL(urlPattern);
        } catch {
          // Not a valid URL, skip CDP matching
        }
        
        for (const targetInfo of targetInfos) {
          
          // If it's a page target, check if it matches
          if (targetInfo.type === "page") {
            const targetUrl = targetInfo.url || "";
            
            // Check if this target matches our criteria
            if (targetUrlObj) {
              try {
                const targetUrlParsed = new URL(targetUrl);
                const targetPathname = targetUrlParsed.pathname;
                const targetSearchParams = targetUrlParsed.searchParams;
                const hasControlled = targetSearchParams.get("controlled") === "true";
                
                const patternPathname = targetUrlObj.pathname;
                const patternHasControlled = targetUrlObj.searchParams.get("controlled") === "true";
                
                if (targetPathname === patternPathname && hasControlled && patternHasControlled) {
                  console.log(`[ProfileService] ✅ Found matching target via CDP: ${targetUrl}`);
                  
                  // Attach to this target to get a Page object
                  try {
                    const { sessionId } = await browserCDP.send("Target.attachToTarget", {
                      targetId: targetInfo.targetId,
                      flatten: true,
                    });
                    
                    // Create a CDP session for this target
                    const targetCDP = await browser.newBrowserCDPSession();
                    // Actually, we need to use the sessionId from attachToTarget
                    // But Playwright doesn't expose a way to create a Page from a targetId
                    // So we need to find it in contexts after attaching
                    
                    // Wait a moment for the attachment to propagate
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Now check contexts again - the attached target should appear
                    contexts = browser.contexts();
                    for (const context of contexts) {
                      for (const page of context.pages()) {
                        if (page.url() === targetUrl || page.url().includes("scenario-viewer.html")) {
                          console.log(`[ProfileService] ✅ Found page after CDP attach: ${page.url()}`);
                          await browserCDP.detach();
                          return page;
                        }
                      }
                    }
                  } catch (attachErr) {
                    console.warn(`[ProfileService] ⚠️  Failed to attach to target:`, attachErr);
                  }
                }
              } catch (parseErr) {
                // URL parsing failed, skip
              }
            }
          }
        }
        await browserCDP.detach();
      } catch (err) {
        console.warn(`[ProfileService] ⚠️  Failed to use CDP Target domain:`, err);
      }
      
      // Wait a bit and check again (contexts might be created asynchronously)
      console.log(`[ProfileService] ⏳ Waiting 500ms and retrying...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      contexts = browser.contexts();
      console.log(`[ProfileService] 📋 After wait: Found ${contexts.length} browser contexts`);
    }
    
    // Parse the URL pattern to extract key components
    let urlObj: URL;
    try {
      urlObj = new URL(urlPattern);
    } catch (err) {
      console.error(`[ProfileService] ❌ Invalid URL pattern: ${urlPattern}`, err);
      throw new Error(`Invalid URL pattern: ${urlPattern}`);
    }
    
    const targetPathname = urlObj.pathname;
    const targetSearchParams = urlObj.searchParams;
    const hasControlled = targetSearchParams.get("controlled") === "true";
    const targetSandbox = targetSearchParams.get("sandbox");
    
    console.log(`[ProfileService] 🎯 Looking for page with pathname: ${targetPathname}, controlled: ${hasControlled}, sandbox: ${targetSandbox}`);
    
    // Collect all pages first for better logging
    const allPages: Array<{ page: Page; url: string }> = [];
    for (const context of contexts) {
      const pages = context.pages();
      console.log(`[ProfileService] 📄 Context has ${pages.length} pages`);
      for (const page of pages) {
        const pageUrl = page.url();
        allPages.push({ page, url: pageUrl });
        console.log(`[ProfileService] 🔗 Found page: ${pageUrl}`);
      }
    }
    
    if (allPages.length === 0) {
      console.warn(`[ProfileService] ⚠️  No pages found in any browser context`);
      console.warn(`[ProfileService] 💡 Make sure the page is loaded and the browser is connected`);
      console.warn(`[ProfileService] 💡 Browser connected: ${browser.isConnected()}`);
      console.warn(`[ProfileService] 💡 Browser contexts: ${contexts.length}`);
      return null;
    }
    
    console.log(`[ProfileService] 📋 All available pages (${allPages.length} total):`);
    for (const { url } of allPages) {
      console.log(`[ProfileService]    - ${url}`);
    }
    
    // Very lenient matching: find ANY page with scenario-viewer.html and controlled=true
    // Ignore all other query parameters (profile, scenario, etc.) as they may vary
    // The key requirement is just: pathname matches and has controlled=true
    console.log(`[ProfileService] 🔍 Looking for any controlled scenario-viewer page...`);
    console.log(`[ProfileService] 🎯 Target: pathname=${targetPathname}, controlled=${hasControlled}, sandbox=${targetSandbox || "any"}`);
    
    const controlledPages: Array<{ page: Page; url: string; sandbox?: string }> = [];
    
    for (const { page, url: pageUrl } of allPages) {
      try {
        const pageUrlObj = new URL(pageUrl);
        const pagePathname = pageUrlObj.pathname;
        const pageSearchParams = pageUrlObj.searchParams;
        const pageHasControlled = pageSearchParams.get("controlled") === "true";
        
        console.log(`[ProfileService] 🔍 Checking page: pathname=${pagePathname}, controlled=${pageHasControlled}`);
        
        // Check if this is a scenario-viewer page with controlled=true
        if (pagePathname === targetPathname && pageHasControlled) {
          const pageSandbox = pageSearchParams.get("sandbox");
          console.log(`[ProfileService] ✅ Match! Adding to controlled pages (sandbox: ${pageSandbox || "none"})`);
          controlledPages.push({ page, url: pageUrl, sandbox: pageSandbox || undefined });
        } else {
          console.log(`[ProfileService] ⏭️  No match: pathname match=${pagePathname === targetPathname}, controlled match=${pageHasControlled}`);
        }
      } catch (err) {
        // If URL parsing fails, try simple string matching
        console.warn(`[ProfileService] ⚠️  Failed to parse page URL: ${pageUrl}`, err);
        if (pageUrl.includes("scenario-viewer.html") && pageUrl.includes("controlled=true")) {
          console.log(`[ProfileService] ✅ Match via string matching`);
          controlledPages.push({ page, url: pageUrl });
        }
      }
    }
    
    if (controlledPages.length === 0) {
      console.warn(`[ProfileService] ⚠️  No controlled scenario-viewer pages found`);
      console.warn(`[ProfileService] 💡 Searched ${allPages.length} pages, none matched criteria`);
      console.warn(`[ProfileService] 💡 Criteria: pathname=${targetPathname}, controlled=true`);
      return null;
    }
    
    console.log(`[ProfileService] 📋 Found ${controlledPages.length} controlled scenario-viewer page(s):`);
    for (const { url, sandbox } of controlledPages) {
      console.log(`[ProfileService]    - ${url}${sandbox ? ` (sandbox: ${sandbox})` : ""}`);
    }
    
    // If sandbox is specified, prefer matching it, but still match any controlled page if not found
    if (targetSandbox) {
      // Try to find exact sandbox match first
      for (const { page, url, sandbox } of controlledPages) {
        if (sandbox === targetSandbox) {
          console.log(`[ProfileService] ✅ Found matching page (sandbox match): ${url}`);
          return page;
        }
      }
      // If no exact match, use the first controlled page (user might have navigated)
      console.log(`[ProfileService] ✅ Using first controlled page (sandbox param may differ): ${controlledPages[0].url}`);
      return controlledPages[0].page;
    } else {
      // No sandbox specified - use the first controlled page
      console.log(`[ProfileService] ✅ Using first controlled page: ${controlledPages[0].url}`);
      return controlledPages[0].page;
    }
  }
  
  /**
   * Find a page via CDP Target domain when Playwright contexts aren't available
   * Returns a CDP session directly attached to the target
   */
  private async findPageViaCDPTarget(urlPattern: string): Promise<CDPSession | null> {
    console.log(`[ProfileService] 🔍 Finding page via CDP Target domain: ${urlPattern}`);
    
    const browser = await this.connectToBrowser();
    let browserCDP: CDPSession | null = null;
    
    try {
      browserCDP = await browser.newBrowserCDPSession();
      const { targetInfos } = await browserCDP.send("Target.getTargets");
      console.log(`[ProfileService] 📋 Found ${targetInfos.length} targets via CDP Target.getTargets`);
      
      // Log all targets for debugging
      for (const targetInfo of targetInfos) {
        console.log(`[ProfileService] 🎯 Target: type=${targetInfo.type}, url=${targetInfo.url || "about:blank"}, targetId=${targetInfo.targetId}, title=${targetInfo.title || "none"}`);
      }
      
      // Parse the target URL to match against
      let targetUrlObj: URL;
      try {
        targetUrlObj = new URL(urlPattern);
      } catch {
        console.warn(`[ProfileService] ⚠️  Invalid URL pattern for CDP search: ${urlPattern}`);
        await browserCDP.detach();
        return null;
      }
      
      const targetPathname = targetUrlObj.pathname;
      const targetSearchParams = targetUrlObj.searchParams;
      const hasControlled = targetSearchParams.get("controlled") === "true";
      const targetSandbox = targetSearchParams.get("sandbox");
      
      for (const targetInfo of targetInfos) {
        if (targetInfo.type !== "page") {
          continue;
        }
        
        const targetUrl = targetInfo.url || "";
        console.log(`[ProfileService] 🎯 Checking target: ${targetUrl}`);
        
        try {
          const targetUrlParsed = new URL(targetUrl);
          const pagePathname = targetUrlParsed.pathname;
          const pageSearchParams = targetUrlParsed.searchParams;
          const pageHasControlled = pageSearchParams.get("controlled") === "true";
          
          // Match by pathname and controlled=true
          if (pagePathname === targetPathname && pageHasControlled) {
            const pageSandbox = pageSearchParams.get("sandbox");
            
            // If sandbox is specified, prefer matching it
            if (targetSandbox && pageSandbox !== targetSandbox) {
              continue;
            }
            
            console.log(`[ProfileService] ✅ Found matching target via CDP: ${targetUrl}`);
            
            // Attach to this target WITHOUT flattening so we can use Target.sendMessageToTarget
            try {
              const { sessionId: attachedSessionId } = await browserCDP.send("Target.attachToTarget", {
                targetId: targetInfo.targetId,
                flatten: false, // Don't flatten - we'll use sendMessageToTarget
              });
              
              console.log(`[ProfileService] ✅ Attached to target (non-flattened), sessionId: ${attachedSessionId}, targetId: ${targetInfo.targetId}`);
              
              // Create a wrapper CDP session that sends messages to this target
              let messageIdCounter = 0;
              const targetCDPWrapper = {
                send: async (method: string, params?: any) => {
                  const messageId = ++messageIdCounter;
                  const message = JSON.stringify({
                    id: messageId,
                    method,
                    params: params || {},
                  });
                  
                  // Wait for response
                  console.log(`[ProfileService] 📤 Sending CDP command: ${method} (messageId: ${messageId})`);
                  return new Promise((resolve, reject) => {
                    let resolved = false;
                    const timeout = setTimeout(() => {
                      if (!resolved) {
                        browserCDP.off("Target.receivedMessageFromTarget", handler);
                        console.error(`[ProfileService] ❌ Timeout waiting for response to ${method} (messageId: ${messageId}, sessionId: ${attachedSessionId})`);
                        reject(new Error(`Timeout waiting for response to ${method}`));
                      }
                    }, 10000);
                    
                    const handler = (eventOrParams: any) => {
                      if (resolved) return;
                      
                      // Log the raw event first to understand its structure
                      console.log(`[ProfileService] 📥 Raw event type: ${typeof eventOrParams}, isArray: ${Array.isArray(eventOrParams)}`);
                      if (eventOrParams) {
                        try {
                          const eventStr = JSON.stringify(eventOrParams, null, 2);
                          // Limit size but show first 1000 chars
                          console.log(`[ProfileService] 📥 Raw event (first 1000 chars): ${eventStr.substring(0, 1000)}`);
                        } catch (e) {
                          console.log(`[ProfileService] 📥 Event cannot be stringified, keys: ${Object.keys(eventOrParams || {}).join(", ")}`);
                        }
                      }
                      
                      // Playwright CDP events can come in different formats:
                      // 1. Direct params object: { sessionId, targetId, message }
                      // 2. Wrapped in event object: { params: { sessionId, targetId, message } }
                      // 3. As an array: [{ sessionId, targetId, message }]
                      
                      let sessionId: string | undefined;
                      let targetId: string | undefined;
                      let message: string | undefined;
                      
                      // Try different event structures
                      if (eventOrParams?.params) {
                        // Format 2: wrapped in event.params
                        sessionId = eventOrParams.params.sessionId;
                        targetId = eventOrParams.params.targetId;
                        message = eventOrParams.params.message;
                      } else if (eventOrParams?.sessionId || eventOrParams?.message) {
                        // Format 1: direct params object
                        sessionId = eventOrParams.sessionId;
                        targetId = eventOrParams.targetId;
                        message = eventOrParams.message;
                      } else if (Array.isArray(eventOrParams) && eventOrParams[0]) {
                        // Format 3: array, try first element
                        const first = eventOrParams[0];
                        sessionId = first.params?.sessionId ?? first.sessionId;
                        targetId = first.params?.targetId ?? first.targetId;
                        message = first.params?.message ?? first.message;
                      }
                      
                      console.log(`[ProfileService] 📥 Received message from target: sessionId=${sessionId}, targetId=${targetId}, message length=${message?.length || 0}`);
                      
                      // Log full event structure for debugging (but limit size)
                      if (eventOrParams) {
                        const eventKeys = Object.keys(eventOrParams);
                        console.log(`[ProfileService] 📥 Event keys: ${eventKeys.join(", ")}`);
                        if (eventOrParams.params) {
                          const paramKeys = Object.keys(eventOrParams.params);
                          console.log(`[ProfileService] 📥 Params keys: ${paramKeys.join(", ")}`);
                          console.log(`[ProfileService] 📥 Params values:`, JSON.stringify({
                            sessionId: eventOrParams.params.sessionId,
                            targetId: eventOrParams.params.targetId,
                            messageLength: eventOrParams.params.message?.length
                          }));
                        }
                      } else {
                        console.log(`[ProfileService] ⚠️  eventOrParams is null/undefined`);
                      }
                      
                      // Check if this message is for our session
                      // Match by sessionId OR targetId (either should work)
                      const sessionMatches = sessionId === attachedSessionId;
                      const targetMatches = targetId === targetInfo.targetId;
                      
                      if (sessionMatches || targetMatches) {
                        if (!message) {
                          console.log(`[ProfileService] ⏭️  No message in event, skipping (sessionId=${sessionId}, targetId=${targetId})`);
                          return;
                        }
                        
                        try {
                          const response = JSON.parse(message);
                          console.log(`[ProfileService] 📥 Parsed response: id=${response.id}, method=${response.method || "response"}, error=${response.error ? "yes" : "no"}`);
                          
                          if (response.id === messageId) {
                            resolved = true;
                            clearTimeout(timeout);
                            browserCDP.off("Target.receivedMessageFromTarget", handler);
                            if (response.error) {
                              reject(new Error(response.error.message || "CDP error"));
                            } else {
                              console.log(`[ProfileService] ✅ Received response for ${method}`);
                              resolve(response.result || {});
                            }
                          } else {
                            console.log(`[ProfileService] ⏭️  Message ID mismatch: expected ${messageId}, got ${response.id}`);
                          }
                        } catch (err) {
                          console.warn(`[ProfileService] ⚠️  Failed to parse response:`, err, `message: ${message?.substring(0, 200)}`);
                          // Not our message, continue waiting
                        }
                      } else {
                        console.log(`[ProfileService] ⏭️  Session/target mismatch: expected sessionId=${attachedSessionId} or targetId=${targetInfo.targetId}, got sessionId=${sessionId}, targetId=${targetId}`);
                      }
                    };
                    
                    // Set up handler BEFORE sending the message
                    browserCDP.on("Target.receivedMessageFromTarget", handler);
                    
                    // Now send the message
                    console.log(`[ProfileService] 📤 Sending to target: targetId=${targetInfo.targetId}, sessionId=${attachedSessionId}, method=${method}`);
                    browserCDP.send("Target.sendMessageToTarget", {
                      targetId: targetInfo.targetId,
                      sessionId: attachedSessionId,
                      message,
                    }).catch((sendErr) => {
                      if (!resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        browserCDP.off("Target.receivedMessageFromTarget", handler);
                        console.error(`[ProfileService] ❌ Failed to send message:`, sendErr);
                        reject(sendErr);
                      }
                    });
                  });
                },
                detach: async () => {
                  await browserCDP.send("Target.detachFromTarget", {
                    targetId: targetInfo.targetId,
                    sessionId: attachedSessionId,
                  });
                },
                targetId: targetInfo.targetId,
                sessionId: attachedSessionId,
              } as CDPSession & { targetId: string; sessionId: string };
              
              // Don't detach browserCDP - we need it to send messages
              // Store it so we can clean up later
              (targetCDPWrapper as any)._browserCDP = browserCDP;
              
              return targetCDPWrapper as CDPSession;
            } catch (attachErr) {
              console.warn(`[ProfileService] ⚠️  Failed to attach to target:`, attachErr);
            }
          }
        } catch (parseErr) {
          // URL parsing failed, skip
        }
      }
      
      // If we didn't find a matching target, clean up browserCDP
      if (browserCDP) {
        await browserCDP.detach();
      }
    } catch (err) {
      console.warn(`[ProfileService] ⚠️  Failed to use CDP Target domain:`, err);
      if (browserCDP) {
        try {
          await browserCDP.detach();
        } catch (detachErr) {
          // Ignore detach errors
        }
      }
    }
    
    return null;
  }
  
  async startProfiling(urlOrSessionId: string): Promise<string> {
    console.log(`[ProfileService] 🔍 Starting profiling for: ${urlOrSessionId}`);
    console.log(`[ProfileService] 📋 Currently registered sessions:`, Array.from(this.registeredPages.keys()));
    
    try {
      let page: Page | null = null;
      
      // Check if it's a URL
      let isUrl = false;
      let targetUrl: URL | null = null;
      let sessionId: string | null = null;
      
      try {
        targetUrl = new URL(urlOrSessionId);
        isUrl = true;
        // Extract sessionId from URL if present
        sessionId = targetUrl.searchParams.get("sessionId");
        if (sessionId) {
          console.log(`[ProfileService] 📍 Extracted sessionId from URL: ${sessionId}`);
          // Try to find by registered sessionId first
          page = this.getRegisteredPage(sessionId);
          if (page) {
            console.log(`[ProfileService] ✅ Found registered page by sessionId: ${sessionId}`);
          }
        }
      } catch {
        // Not a URL, treat as sessionId
        sessionId = urlOrSessionId;
        console.log(`[ProfileService] 📍 Treating as sessionId: ${sessionId}`);
        page = this.getRegisteredPage(sessionId);
        if (page) {
          console.log(`[ProfileService] ✅ Found registered page by sessionId: ${sessionId}`);
        } else {
          console.warn(`[ProfileService] ⚠️  SessionId ${sessionId} not found in registered pages`);
          console.warn(`[ProfileService] 💡 Available registered sessions:`, Array.from(this.registeredPages.keys()));
          // Can't find by sessionId and it's not a URL, so we can't find it
          throw new Error(`Page not found for sessionId: ${sessionId}. The page may not be registered yet.`);
        }
      }
      
      // If we have a URL and haven't found the page yet, try URL matching
      if (!page && isUrl && targetUrl) {
        console.log(`[ProfileService] 🔄 Falling back to URL matching: ${targetUrl.href}`);
        console.log(`[ProfileService] 🔄 isUrl=${isUrl}, targetUrl=${targetUrl ? targetUrl.href : "null"}, page=${page ? "found" : "not found"}`);
        page = await this.findPageByUrl(targetUrl.href);
        if (page) {
          console.log(`[ProfileService] ✅ Found page by URL matching: ${page.url()}`);
          // If we found the page and have a sessionId, register it now
          if (sessionId) {
            console.log(`[ProfileService] 📝 Auto-registering page found by URL with sessionId: ${sessionId}`);
            this.registerPage(sessionId, page);
          }
        }
      } else if (!page && !isUrl) {
        console.error(`[ProfileService] ❌ Not a URL and page not found by sessionId`);
        throw new Error(`Page not found: ${urlOrSessionId}`);
      }
      
      // If we still don't have a page, try CDP Target domain as last resort
      let cdp: CDPSession | null = null;
      if (!page && isUrl && targetUrl) {
        console.log(`[ProfileService] 🔄 Trying CDP Target domain as last resort...`);
        cdp = await this.findPageViaCDPTarget(targetUrl.href);
        if (cdp) {
          console.log(`[ProfileService] ✅ Found page via CDP Target domain`);
        }
      }
      
      if (!page && !cdp) {
        console.error(`[ProfileService] ❌ Page not found - isUrl=${isUrl}, targetUrl=${targetUrl ? targetUrl.href : "null"}`);
        throw new Error(`Page not found: ${urlOrSessionId}. Make sure the page is loaded with controlled=true parameter.`);
      }
      
      // Create CDP session - either from Page or use the one we got from CDP Target
      if (!cdp) {
        if (!page) {
          throw new Error(`No page available to create CDP session`);
        }
        console.log(`[ProfileService] ✅ Using page: ${page.url()}`);
        console.log(`[ProfileService] 🔌 Creating CDP session...`);
        cdp = await page.context().newCDPSession(page);
      } else {
        console.log(`[ProfileService] ✅ Using CDP session from Target domain`);
      }
      
      console.log(`[ProfileService] 🎯 Enabling profiler...`);
      // Enable and start profiler
      await cdp.send("Profiler.enable");
      await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
      await cdp.send("Profiler.start");
      
      // Generate unique profiling session ID
      const profilingSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.sessions.set(profilingSessionId, { cdp, page: page || null });
      
      // Store browserCDP reference if we're using CDP Target approach
      if (!page && (cdp as any)._browserCDP) {
        (this.sessions.get(profilingSessionId)! as any)._browserCDP = (cdp as any)._browserCDP;
      }
      
      console.log(`[ProfileService] ✅ Profiling started, profilingSessionId: ${profilingSessionId}`);
      return profilingSessionId;
    } catch (error) {
      console.error(`[ProfileService] ❌ Error in startProfiling:`, error);
      if (error instanceof Error) {
        console.error(`[ProfileService] Error stack:`, error.stack);
      }
      throw error;
    }
  }
  
  async stopProfiling(sessionId: string): Promise<CPUProfile> {
    console.log(`[ProfileService] 🛑 Stopping profiling for sessionId: ${sessionId}`);
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.error(`[ProfileService] ❌ Session not found: ${sessionId}`);
      console.error(`[ProfileService] 💡 Available sessions:`, Array.from(this.sessions.keys()));
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    const { cdp, page } = session;
    
    // If we have a page, verify it's still valid
    if (page && page.isClosed()) {
      console.warn(`[ProfileService] ⚠️  Page is closed, but continuing with CDP session`);
    }
    
    console.log(`[ProfileService] 🛑 Stopping profiler...`);
    // Stop profiler and get results
    const result = await cdp.send("Profiler.stop") as { profile: CPUProfile };
    await cdp.send("Profiler.disable");
    
    console.log(`[ProfileService] ✅ Profiler stopped, profile data received:`);
    console.log(`[ProfileService]    - Nodes: ${result.profile.nodes?.length || 0}`);
    console.log(`[ProfileService]    - Samples: ${result.profile.samples?.length || 0}`);
    console.log(`[ProfileService]    - Start time: ${result.profile.startTime}`);
    console.log(`[ProfileService]    - End time: ${result.profile.endTime}`);
    console.log(`[ProfileService]    - Duration: ${result.profile.endTime - result.profile.startTime}ms`);
    
    // Clean up CDP session if it has a detach method (from CDP Target approach)
    if ((cdp as any).detach) {
      try {
        await (cdp as any).detach();
      } catch (err) {
        console.warn(`[ProfileService] ⚠️  Failed to detach CDP session:`, err);
      }
    }
    
    // Clean up browserCDP if we stored it
    if ((session as any)._browserCDP) {
      try {
        await (session as any)._browserCDP.detach();
      } catch (err) {
        console.warn(`[ProfileService] ⚠️  Failed to detach browserCDP:`, err);
      }
    }
    
    // Clean up session
    this.sessions.delete(sessionId);
    console.log(`[ProfileService] 🗑️  Cleaned up session: ${sessionId}`);
    
    return result.profile;
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      await this.connectToBrowser();
      return true;
    } catch {
      return false;
    }
  }
}

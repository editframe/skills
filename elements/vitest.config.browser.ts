/// <reference types="@vitest/browser/providers/playwright" />

// import "tsconfig-paths/register";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import type { UserConfig } from "vite";
import { defineConfig } from "vitest/config";
import type { BrowserProviderOptions } from "vitest/node";
import { recordReplayProxyPlugin } from "./packages/elements/test/recordReplayProxyPlugin.js";
import { TEST_SERVER_PORT } from "./packages/elements/test/constants.js";

type ViteTestBrowserMode = "connect" | "launch";

interface TestConfiguration {
  server?: UserConfig["server"];
  headless?: boolean;
  browserProvider: BrowserProviderOptions;
}

// Detect CI environment - check multiple indicators
// GITHUB_ACTIONS is set by GitHub Actions, CI is a common CI indicator
// Also check if we're running in ci-runner service (no Traefik)
const isCI =
  Boolean(process.env.GITHUB_ACTIONS) ||
  Boolean(process.env.CI) ||
  process.env.DOCKER_SERVICE === "ci-runner";

function findMonorepoRoot(): string | null {
  // Strategy 1: Use MONOREPO_ROOT environment variable if set by browsertest script
  // This is the most reliable when config is bundled
  // Trust the environment variable - don't verify paths since we might be in Docker
  // where paths are mounted differently
  if (process.env.MONOREPO_ROOT) {
    return process.env.MONOREPO_ROOT;
  }
  
  // Strategy 2: Try git rev-parse from multiple possible locations
  // When config is bundled, we might be in a temp directory, so try from
  // current working directory and also try to find the actual elements directory
  const possibleCwds = [
    process.cwd(),
    __dirname,
    // Try to find elements directory by looking for known files
    ...(process.env.PWD ? [process.env.PWD] : []),
  ];
  
  for (const cwd of possibleCwds) {
    try {
      const { execSync } = require("node:child_process");
      const gitRoot = execSync("git rev-parse --show-toplevel", {
        encoding: "utf-8",
        stdio: "pipe",
        cwd: cwd,
      }).trim();
      
      if (existsSync(path.join(gitRoot, "elements")) && existsSync(path.join(gitRoot, "telecine"))) {
        return gitRoot;
      }
    } catch {
      // Continue to next location
    }
  }
  
  // Strategy 3: Traverse up from multiple starting points
  const startingDirs = [process.cwd(), __dirname];
  if (process.env.PWD) {
    startingDirs.push(process.env.PWD);
  }
  
  for (const startDir of startingDirs) {
    try {
      let currentDir = startDir;
      const rootDir = path.parse(currentDir).root;
      
      while (currentDir !== rootDir) {
        if (existsSync(path.join(currentDir, "elements")) && existsSync(path.join(currentDir, "telecine"))) {
          return currentDir;
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
          break; // Reached filesystem root
        }
        currentDir = parentDir;
      }
    } catch {
      // Continue to next starting directory
    }
  }
  
  // Strategy 4: Look for the .wsEndpoint.json file itself and use its directory
  // This is a last resort - if the file exists, we know where the monorepo root is
  // Try many possible locations since we might be in a bundled temp directory
  const possibleWsPaths = [
    // Current directory and nearby
    path.join(process.cwd(), ".wsEndpoint.json"),
    path.join(__dirname, ".wsEndpoint.json"),
    // Go up several levels (handles temp directories like /packages)
    path.join(process.cwd(), "..", ".wsEndpoint.json"),
    path.join(process.cwd(), "..", "..", ".wsEndpoint.json"),
    path.join(process.cwd(), "..", "..", "..", ".wsEndpoint.json"),
    path.join(process.cwd(), "..", "..", "..", "..", ".wsEndpoint.json"),
    path.join(process.cwd(), "..", "..", "..", "..", "..", ".wsEndpoint.json"),
    path.join(process.cwd(), "..", "..", "..", "..", "..", "..", ".wsEndpoint.json"),
    // Also try from __dirname
    path.join(__dirname, "..", ".wsEndpoint.json"),
    path.join(__dirname, "..", "..", ".wsEndpoint.json"),
    path.join(__dirname, "..", "..", "..", ".wsEndpoint.json"),
    path.join(__dirname, "..", "..", "..", "..", ".wsEndpoint.json"),
    path.join(__dirname, "..", "..", "..", "..", "..", ".wsEndpoint.json"),
  ];
  
  for (const wsPath of possibleWsPaths) {
    try {
      if (existsSync(wsPath)) {
        const dir = path.dirname(wsPath);
        // Verify it's actually the monorepo root
        if (existsSync(path.join(dir, "elements")) && existsSync(path.join(dir, "telecine"))) {
          return dir;
        }
      }
    } catch {
      // Continue to next path
    }
  }
  
  return null;
}

async function loadWebSocketEndpoint(): Promise<string | null> {
  // Strategy 1: Use WS_ENDPOINT environment variable if set by browsertest script
  // This is the most reliable when running in Docker where the monorepo root isn't mounted
  if (process.env.WS_ENDPOINT) {
    return process.env.WS_ENDPOINT;
  }
  
  // Strategy 2: Try to read from file (for cases where we're not in Docker)
  const monorepoRoot = findMonorepoRoot();
  let wsEndpointPath: string | null = null;
  
  if (monorepoRoot) {
    wsEndpointPath = path.join(monorepoRoot, ".wsEndpoint.json");
  } else {
    // Fallback to project root
    wsEndpointPath = path.resolve(__dirname, ".wsEndpoint.json");
  }
  
  if (!wsEndpointPath) {
    console.error("[vitest.config.browser] No wsEndpointPath determined");
    return null;
  }
  
  
  // Retry mechanism: wait up to 2 seconds for file to appear
  // This handles race conditions where vitest starts loading config
  // before the browsertest script finishes starting the browser server
  const maxRetries = 20;
  const retryDelay = 100; // ms
  
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  
  for (let i = 0; i < maxRetries; i++) {
    if (existsSync(wsEndpointPath)) {
      try {
        const content = readFileSync(wsEndpointPath, "utf-8");
        const parsed = JSON.parse(content);
        if (typeof parsed.wsEndpoint === "string" && parsed.wsEndpoint) {
          return parsed.wsEndpoint;
        }
      } catch (error) {
        // File exists but is invalid, wait a bit and retry
        console.error("[vitest.config.browser] Error reading wsEndpoint file:", error);
        if (i < maxRetries - 1) {
          await sleep(retryDelay);
          continue;
        }
      }
    }
    
    // Wait before retrying (except on last iteration)
    if (i < maxRetries - 1) {
      await sleep(retryDelay);
    }
  }
  
  console.error("[vitest.config.browser] Failed to find wsEndpoint after", maxRetries, "retries");
  return null;
}

function createConnectConfig(wsEndpoint: string): TestConfiguration {
  // Get worktree domain from environment
  // This should be set by the browsertest script via worktree-config
  const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";

  return {
    server: {
      port: TEST_SERVER_PORT,
      host: "0.0.0.0",
      // Allow the worktree hostname so Vite can respond to requests with that Host header
      // This is needed for Traefik routing (not needed in CI)
      ...(isCI ? {} : { allowedHosts: [worktreeDomain] }),
    },
    browserProvider: {
      connect: {
        wsEndpoint,
      },
    },
  };
}

function createLaunchConfig(): TestConfiguration {
  // Get worktree domain from environment
  const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";

  return {
    server: {
      port: TEST_SERVER_PORT,
      host: "0.0.0.0",
      // Allow the worktree hostname so Vite can respond to requests with that Host header
      // This is needed for Traefik routing (not needed in CI)
      ...(isCI ? {} : { allowedHosts: [worktreeDomain] }),
    },
    headless: true,
    browserProvider: {
      launch: {
        channel: "chrome",
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-first-run",
        ],
      },
    },
  };
}

async function resolveTestConfiguration(
  mode: ViteTestBrowserMode,
): Promise<TestConfiguration> {
  switch (mode) {
    case "connect": {
      const wsEndpoint = await loadWebSocketEndpoint();
      if (!wsEndpoint) {
        throw new Error(
          "WebSocket endpoint required for connect mode but .wsEndpoint.json not found or invalid",
        );
      }
      return createConnectConfig(wsEndpoint);
    }
    case "launch":
      return createLaunchConfig();
    default:
      throw new Error(`Unknown browser mode: ${mode}`);
  }
}

export default defineConfig(async () => {
  const browserMode: ViteTestBrowserMode =
    process.env.VITEST_BROWSER_MODE === "connect" ? "connect" : "launch";

  const config = await resolveTestConfiguration(browserMode);
  const { vitePluginEditframe } = await import(
    "./packages/vite-plugin/src/index.vitest.js"
  );

  // Get worktree domain for Traefik URL rewriting
  // Test server uses its own Traefik entrypoint (port 4322) to avoid conflict with dev-projects
  const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";
  const traefikUrl = `http://${worktreeDomain}:4322`;

  // Plugin to override server resolvedUrls for browser connections
  // Vitest constructs browser URLs from resolvedUrls.local[0] or resolvedUrls.network[0]
  // We need to override resolvedUrls to use the Traefik URL
  // Use buildStart hook to set it early, before vitest accesses it
  const traefikUrlPlugin = {
    name: "traefik-url-override",
    buildStart() {
      // This runs early, but we don't have access to server here
      // So we'll do it in configureServer
    },
    configureServer(server) {

      // Ensure the server is configured to listen on the correct port
      // Vitest should start the server automatically, but we ensure it's configured correctly
      if (server.config.server) {
        server.config.server.port = TEST_SERVER_PORT;
        server.config.server.host = "0.0.0.0";
        if (!server.config.server.allowedHosts) {
          server.config.server.allowedHosts = [];
        }
        if (!server.config.server.allowedHosts.includes(worktreeDomain)) {
          server.config.server.allowedHosts.push(worktreeDomain);
        }
      }

      // Override resolvedUrls to use Traefik URL
      // Vitest uses: resolvedUrls?.local[0] ?? resolvedUrls?.network[0]
      // We need to ensure both are set to the Traefik URL
      const traefikResolvedUrls = {
        local: [traefikUrl],
        network: [traefikUrl],
      };

      // Set resolvedUrls directly (not just override getter)
      // This ensures vitest gets the Traefik URL even if it accesses it synchronously
      (server as any).resolvedUrls = traefikResolvedUrls;

      // Also override the getter in case Vite tries to recompute it
      Object.defineProperty(server, "resolvedUrls", {
        get() {
          return traefikResolvedUrls;
        },
        set(_value) {
          // Ignore any attempts to set it back
        },
        configurable: true,
        enumerable: true,
      });

      // Also override server.url for consistency
      Object.defineProperty(server, "url", {
        get() {
          return traefikUrl;
        },
        configurable: true,
        enumerable: true,
      });

    },
  };

  // Plugin to inject CI mode flag into browser
  const ciModePlugin = {
    name: "ci-mode-inject",
    transformIndexHtml(html: string) {
      // Inject script that sets CI mode flag in browser
      return html.replace(
        "</head>",
        `<script>window.__CI_MODE__ = ${isCI};</script></head>`,
      );
    },
  };

  const plugins = [
    recordReplayProxyPlugin(),
    vitePluginEditframe({
      root: "./test-assets",
      cacheRoot: "./test-assets",
    }),
    ciModePlugin,
  ];

  // Only add Traefik URL plugin in local development (not in CI)
  if (!isCI) {
    plugins.push(traefikUrlPlugin);
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@editframe/assets": path.resolve(__dirname, "packages/assets/src"),
        "@editframe/cli": path.resolve(__dirname, "packages/cli/src"),
        "@editframe/api": path.resolve(__dirname, "packages/api/src"),
        "@editframe/react": path.resolve(__dirname, "packages/react/src"),
        "@editframe/elements": path.resolve(__dirname, "packages/elements/src"),
        "@editframe/vite-plugin": path.resolve(
          __dirname,
          "packages/vite-plugin/src",
        ),
        TEST: path.resolve(__dirname, "test"),
      },
    },
    // Use single test-assets directory for all test media
    publicDir: "test-assets",
    server: {
      ...config.server,
      strictPort: true, // Fail if port is already in use instead of choosing another
    },
    test: {
      watch: false,
      include: ["**/*.browsertest.ts", "**/*.browsertest.tsx"],
      exclude: ["**/node_modules/**", "**/generated/**"],
      /* Globals MUST be enabled for testing library to automatically cleanup between tests */
      globals: true,
      // Global setup file that runs before every test
      setupFiles: ["./packages/elements/test/setup.ts"],
      // No longer need global setup - proxy is integrated into Vite server
      minWorkers: 1,
      maxWorkers: 1,
      browser: {
        enabled: true,
        provider: "playwright",
        headless: config.headless,
        // Configure the browser API server port
        // In Vitest browser mode, the /__vitest_test__/ endpoint is served by the Vite dev server
        // So browser.api.port should match server.port
        api: {
          port: TEST_SERVER_PORT,
          host: "0.0.0.0",
          strictPort: true, // Fail if port is already in use instead of choosing another
        },
        instances: [
          {
            browser: "chromium",
            ...config.browserProvider,
          },
        ],
      },
      // Reasonable timeout for media loading and processing
      testTimeout: 10000,
    },
  };
});

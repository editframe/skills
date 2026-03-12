import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import type { UserConfig } from "vite";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

type ViteTestBrowserMode = "connect" | "launch";

interface PlaywrightOptions {
  connectOptions?: { wsEndpoint: string };
  launchOptions?: Record<string, any>;
}

interface TestConfiguration {
  server?: UserConfig["server"];
  headless?: boolean;
  playwrightOptions: PlaywrightOptions;
}

// Detect CI environment
const isCI =
  Boolean(process.env.GITHUB_ACTIONS) ||
  Boolean(process.env.CI) ||
  process.env.DOCKER_SERVICE === "ci-runner";

// Default test server port for telecine
// Uses port 4323 (close to elements test port 4322) for consistency
const TEST_SERVER_PORT = 4323;

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
  // current working directory and also try to find the actual telecine directory
  const possibleCwds = [
    process.cwd(),
    __dirname,
    // Try to find telecine directory by looking for known files
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

      if (
        existsSync(path.join(gitRoot, "elements")) &&
        existsSync(path.join(gitRoot, "telecine"))
      ) {
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
        if (
          existsSync(path.join(currentDir, "elements")) &&
          existsSync(path.join(currentDir, "telecine"))
        ) {
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
    // Go up several levels (handles temp directories like /app)
    path.join(process.cwd(), "..", ".wsEndpoint.json"),
    path.join(process.cwd(), "..", "..", ".wsEndpoint.json"),
    path.join(process.cwd(), "..", "..", "..", ".wsEndpoint.json"),
    path.join(process.cwd(), "..", "..", "..", "..", ".wsEndpoint.json"),
    path.join(process.cwd(), "..", "..", "..", "..", "..", ".wsEndpoint.json"),
    path.join(
      process.cwd(),
      "..",
      "..",
      "..",
      "..",
      "..",
      "..",
      ".wsEndpoint.json",
    ),
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
        if (
          existsSync(path.join(dir, "elements")) &&
          existsSync(path.join(dir, "telecine"))
        ) {
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

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

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
        console.error(
          "[vitest.config.browser] Error reading wsEndpoint file:",
          error,
        );
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

  console.error(
    "[vitest.config.browser] Failed to find wsEndpoint after",
    maxRetries,
    "retries",
  );
  return null;
}

function createConnectConfig(wsEndpoint: string): TestConfiguration {
  const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";

  return {
    server: {
      port: TEST_SERVER_PORT,
      host: "0.0.0.0",
      ...(isCI ? {} : { allowedHosts: [worktreeDomain] }),
    },
    playwrightOptions: {
      connectOptions: {
        wsEndpoint,
      },
    },
  };
}

function createLaunchConfig(): TestConfiguration {
  const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";

  return {
    server: {
      port: TEST_SERVER_PORT,
      host: "0.0.0.0",
      ...(isCI ? {} : { allowedHosts: [worktreeDomain] }),
    },
    headless: true,
    playwrightOptions: {
      launchOptions: {
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

  // Get worktree domain for Traefik URL rewriting
  // Test server uses its own Traefik entrypoint (port 4323) to avoid conflict with other services
  const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";
  const traefikUrl = `http://${worktreeDomain}:4323`;

  // Plugin to override server resolvedUrls for browser connections
  // Vitest constructs browser URLs from resolvedUrls.local[0] or resolvedUrls.network[0]
  // We need to override resolvedUrls to use the Traefik URL
  const traefikUrlPlugin = {
    name: "traefik-url-override",
    configureServer(server) {
      // Ensure the server is configured to listen on the correct port
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

  const plugins = [];

  // Only add Traefik URL plugin in local development (not in CI)
  if (!isCI) {
    plugins.push(traefikUrlPlugin);
  }

  return {
    plugins,
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      ...config.server,
      strictPort: true,
    },
    test: {
      watch: false,
      include: ["**/*.browsertest.ts", "**/*.browsertest.tsx"],
      exclude: [
        "**/node_modules/**",
        "**/generated/**",
        "**/lib/packages/**",
        "**/.archive/**",
      ],
      /* Globals MUST be enabled for testing library to automatically cleanup between tests */
      globals: true,
      browser: {
        enabled: true,
        provider: playwright(config.playwrightOptions),
        headless: config.headless,
        api: {
          port: TEST_SERVER_PORT,
          host: "0.0.0.0",
          strictPort: true,
        },
        instances: [
          {
            browser: "chromium",
          },
        ],
      },
    },
  };
});

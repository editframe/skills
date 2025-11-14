/// <reference types="@vitest/browser/providers/playwright" />

import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import type { UserConfig } from "vite";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import type { BrowserProviderOptions } from "vitest/node";
import type { LaunchOptions } from "playwright";

type ViteTestBrowserMode = "connect" | "launch";

interface TestConfiguration {
  server?: UserConfig["server"];
  headless?: boolean;
  browserProvider: BrowserProviderOptions;
}

// Detect CI environment
const isCI =
  Boolean(process.env.GITHUB_ACTIONS) ||
  Boolean(process.env.CI) ||
  process.env.DOCKER_SERVICE === "ci-runner";

// Default test server port for telecine
const TEST_SERVER_PORT = 3001;

function findMonorepoRoot(): string | null {
  try {
    const { execSync } = require("node:child_process");
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    
    if (existsSync(path.join(gitRoot, "elements")) && existsSync(path.join(gitRoot, "telecine"))) {
      return gitRoot;
    }
  } catch {
    // Not in git repo or git command failed
  }
  
  let currentDir = __dirname;
  while (currentDir !== path.dirname(currentDir)) {
    if (existsSync(path.join(currentDir, "elements")) && existsSync(path.join(currentDir, "telecine"))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  return null;
}

function loadWebSocketEndpoint(): string | null {
  // Try monorepo root first
  const monorepoRoot = findMonorepoRoot();
  if (monorepoRoot) {
    const wsEndpointPath = path.join(monorepoRoot, ".wsEndpoint.json");
    if (existsSync(wsEndpointPath)) {
      try {
        const content = readFileSync(wsEndpointPath, "utf-8");
        const parsed = JSON.parse(content);
        return typeof parsed.wsEndpoint === "string" ? parsed.wsEndpoint : null;
      } catch {
        // Continue to fallback
      }
    }
  }
  
  // Fallback to project root
  const wsEndpointPath = path.resolve(__dirname, ".wsEndpoint.json");
  if (!existsSync(wsEndpointPath)) {
    return null;
  }

  try {
    const content = readFileSync(wsEndpointPath, "utf-8");
    const parsed = JSON.parse(content);
    return typeof parsed.wsEndpoint === "string" ? parsed.wsEndpoint : null;
  } catch {
    return null;
  }
}

function createConnectConfig(wsEndpoint: string): TestConfiguration {
  const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";

  return {
    server: {
      port: TEST_SERVER_PORT,
      host: "0.0.0.0",
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
  const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";

  return {
    server: {
      port: TEST_SERVER_PORT,
      host: "0.0.0.0",
      ...(isCI ? {} : { allowedHosts: [worktreeDomain] }),
    },
    headless: true,
    browserProvider: {
      launch: {
        devtools: true,
        channel: "chrome",
        downloadsPath: "/Users/collin/Downloads",
      } satisfies LaunchOptions,
    },
  };
}

function resolveTestConfiguration(
  mode: ViteTestBrowserMode,
): TestConfiguration {
  switch (mode) {
    case "connect": {
      const wsEndpoint = loadWebSocketEndpoint();
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

const browserMode: ViteTestBrowserMode =
  process.env.VITEST_BROWSER_MODE === "connect" ? "connect" : "launch";

const config = resolveTestConfiguration(browserMode);

console.log("browsertest mode", browserMode, config.browserProvider);

export default defineConfig({
  plugins: [tsconfigPaths()],
  server: {
    ...config.server,
    strictPort: true,
  },
  test: {
    include: ["**/*.test.tsx", "**/*.browsertest.ts"],
    /* Globals MUST be enabled for testing library to automatically cleanup between tests */
    globals: true,
    browser: {
      enabled: true,
      provider: "playwright",
      headless: config.headless,
      api: {
        port: TEST_SERVER_PORT,
        host: "0.0.0.0",
        strictPort: true,
      },
      instances: [
        {
          browser: "chromium",
          ...config.browserProvider,
        },
      ],
    },
  },
});

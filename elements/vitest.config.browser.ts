/// <reference types="@vitest/browser/providers/playwright" />

// import "tsconfig-paths/register";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { UserConfig } from "vite";
import { defineConfig } from "vitest/config";
import type { BrowserProviderOptions } from "vitest/node";
import { recordReplayProxyPlugin } from "./packages/elements/test/recordReplayProxyPlugin.js";

type ViteTestBrowserMode = "connect" | "launch";

interface TestConfiguration {
  server?: UserConfig["server"];
  headless?: boolean;
  browserProvider: BrowserProviderOptions;
}

function loadWebSocketEndpoint(): string | null {
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
  return {
    server: {
      port: 63315,
      host: "0.0.0.0",
    },
    browserProvider: {
      connect: {
        wsEndpoint,
      },
    },
  };
}

function createLaunchConfig(): TestConfiguration {
  return {
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

export default defineConfig(async () => {
  console.log("VITEST_BROWSER_MODE", process.env.VITEST_BROWSER_MODE);
  const { vitePluginEditframe } = await import(
    "./packages/vite-plugin/src/index.vitest.js"
  );

  return {
    plugins: [
      recordReplayProxyPlugin(),
      vitePluginEditframe({
        root: "./test-assets",
        cacheRoot: "./test-assets",
      }),
    ],
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
    server: config.server,
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

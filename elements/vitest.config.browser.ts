/// <reference types="@vitest/browser/providers/playwright" />

// import "tsconfig-paths/register";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
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

// Detect CI environment - check multiple indicators
// GITHUB_ACTIONS is set by GitHub Actions, CI is a common CI indicator
// Also check if we're running in ci-runner service (no Traefik)
const isCI =
  Boolean(process.env.GITHUB_ACTIONS) ||
  Boolean(process.env.CI) ||
  process.env.DOCKER_SERVICE === "ci-runner";

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
  // Get worktree domain from environment
  // This should be set by the browsertest script via worktree-config
  const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";

  return {
    server: {
      port: 63315,
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
      port: 63315,
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
      console.log(
        "[Traefik URL Plugin] Configuring server, original port:",
        server.config.server?.port,
      );
      console.log(
        "[Traefik URL Plugin] Overriding server URLs to:",
        traefikUrl,
      );

      // Ensure the server is configured to listen on the correct port
      // Vitest should start the server automatically, but we ensure it's configured correctly
      if (server.config.server) {
        server.config.server.port = 63315;
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
          console.log(
            "[Traefik URL Plugin] resolvedUrls accessed, returning:",
            traefikResolvedUrls,
          );
          return traefikResolvedUrls;
        },
        set(_value) {
          // Ignore any attempts to set it back
          console.log(
            "[Traefik URL Plugin] Attempted to set resolvedUrls, ignoring",
          );
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

      // Log when server is actually listening
      server.httpServer?.once("listening", () => {
        const address = server.httpServer?.address();
        console.log("[Traefik URL Plugin] Server is listening on:", address);
        console.log("[Traefik URL Plugin] Server URL:", server.resolvedUrls);
        console.log(
          "[Traefik URL Plugin] Server middleware count:",
          server.middlewares.stack?.length || 0,
        );
      });

      // Ensure server actually starts listening
      // Vitest browser mode should start the server automatically, but we ensure it's ready
      if (!server.httpServer?.listening) {
        console.log(
          "[Traefik URL Plugin] Server not yet listening, waiting for Vitest to start it...",
        );
      } else {
        console.log("[Traefik URL Plugin] Server is already listening");
      }

      // Add a test endpoint to verify the server is working
      server.middlewares.use("/__test__", (req, res) => {
        console.log("[Traefik URL Plugin] Test endpoint hit:", req.url);
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Server is working");
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
        // So browser.api.port should match server.port (63315)
        api: {
          port: 63315,
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

// import "tsconfig-paths/register";
import * as path from "node:path";
import type { UserConfig } from "vite";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { recordReplayProxyPlugin } from "./packages/elements/test/recordReplayProxyPlugin.js";
import { TEST_SERVER_PORT } from "./packages/elements/test/constants.js";
import debug from "debug";

const log = debug("ef");

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

// Detect CI environment - check multiple indicators
// GITHUB_ACTIONS is set by GitHub Actions, CI is a common CI indicator
// Also check if we're running in ci-runner service (no Traefik)
const isCI =
  Boolean(process.env.GITHUB_ACTIONS) ||
  Boolean(process.env.CI) ||
  process.env.DOCKER_SERVICE === "ci-runner";

function loadWebSocketEndpoint(): string {
  // Strategy 1: Use WS_ENDPOINT environment variable if set by browsertest script
  // This is the most reliable when running in Docker where the monorepo root isn't mounted
  if (!process.env.WS_ENDPOINT) {
    throw new Error("WS_ENDPOINT environment variable is not set");
  }
  return process.env.WS_ENDPOINT;
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
    headless: true,
    playwrightOptions: {
      connectOptions: {
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
log("resolved test configuration", config);

export default defineConfig(async () => {
  log("VITEST_BROWSER_MODE", process.env.VITEST_BROWSER_MODE);
  const { vitePluginEditframe } =
    await import("./packages/vite-plugin/src/index.vitest.js");

  // Get worktree domain for Traefik URL rewriting
  // Test server uses its own Traefik entrypoint (port 4322) to avoid conflict with dev-projects
  const worktreeDomain = process.env.WORKTREE_DOMAIN || "main.localhost";
  const traefikUrl = `https://${worktreeDomain}:4322`;

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
      log(
        "[Traefik URL Plugin] Configuring server, original port:",
        server.config.server?.port,
      );
      log("[Traefik URL Plugin] Overriding server URLs to:", traefikUrl);

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
          log(
            "[Traefik URL Plugin] resolvedUrls accessed, returning:",
            traefikResolvedUrls,
          );
          return traefikResolvedUrls;
        },
        set(_value) {
          // Ignore any attempts to set it back
          log("[Traefik URL Plugin] Attempted to set resolvedUrls, ignoring");
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
        log("[Traefik URL Plugin] Server is listening on:", address);
        log("[Traefik URL Plugin] Server URL:", server.resolvedUrls);
        log(
          "[Traefik URL Plugin] Server middleware count:",
          server.middlewares.stack?.length || 0,
        );
      });

      // Ensure server actually starts listening
      // Vitest browser mode should start the server automatically, but we ensure it's ready
      if (!server.httpServer?.listening) {
        log(
          "[Traefik URL Plugin] Server not yet listening, waiting for Vitest to start it...",
        );
      } else {
        log("[Traefik URL Plugin] Server is already listening");
      }

      // Add a test endpoint to verify the server is working
      server.middlewares.use("/__test__", (req, res) => {
        log("[Traefik URL Plugin] Test endpoint hit:", req.url);
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
    vitePluginEditframe({
      root: "./test-assets",
      cacheRoot: "./test-assets",
    }),
    recordReplayProxyPlugin(),
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
    // Pre-bundle Three.js and other deps that get discovered late and cause reloads
    optimizeDeps: {
      include: ["three"],
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
      // Limit concurrent test files to prevent resource contention from
      // simultaneous FFmpeg processes and CPU-intensive rendering tests
      maxConcurrency: 20,
      // Global setup file that runs before every test
      setupFiles: ["./packages/elements/test/setup.ts"],
      // No longer need global setup - proxy is integrated into Vite server
      browser: {
        enabled: true,
        provider: playwright(config.playwrightOptions),
        headless: config.headless,
        commands: {
          /**
           * Take a true CDP browser screenshot of an element by selector.
           * Returns base64 PNG data URL. This goes through Chrome's compositor,
           * not Canvas APIs like drawElementImage.
           *
           * Note: In vitest browser mode, tests run inside an iframe. We search
           * all frames for the element.
           */
          async captureElementScreenshot(context: any, selector: string) {
            const page = context.page;
            // Search in main frame and all child frames
            for (const frame of page.frames()) {
              try {
                const element = frame.locator(selector).first();
                await element.waitFor({ state: "attached", timeout: 500 });

                // In vitest browser mode, tests run in an iframe alongside the vitest UI panel.
                // The iframe may be narrower than the element, causing clipping.
                // Fix: temporarily expand the iframe to full viewport before screenshotting.
                const frameEl = await frame.frameElement();
                let savedStyle: string | null = null;
                if (frameEl) {
                  savedStyle = await frameEl.evaluate((el: HTMLElement) => {
                    const prev = el.getAttribute("style") || "";
                    el.style.cssText =
                      "position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:999999!important;border:none!important;";
                    return prev;
                  });
                  // Let layout settle after resize
                  await page.waitForTimeout(200);
                }

                const buffer = await element.screenshot({
                  type: "png",
                  timeout: 10000,
                });

                // Restore the iframe's original style
                if (frameEl && savedStyle !== null) {
                  await frameEl.evaluate((el: HTMLElement, s: string) => {
                    el.setAttribute("style", s);
                  }, savedStyle);
                }

                const base64 = buffer.toString("base64");
                return `data:image/png;base64,${base64}`;
              } catch {
                // Element not in this frame, try next
              }
            }
            throw new Error(`Element "${selector}" not found in any frame`);
          },

          /**
           * Prove Worker + OffscreenCanvas continues rendering while the main
           * thread is halted. Uses CDP Debugger.pause to truly stop the main
           * thread V8 isolate — Workers have their own isolates and keep running.
           *
           * Returns timestamped frame data proving:
           * - Worker frames have timestamps DURING the pause (active rendering)
           * - Main thread frames have timestamps AFTER resume (timer catch-up)
           */
          async testWorkerRendersWhileMainThreadFrozen(context: any) {
            const page = context.page;
            const cdp = await page.context().newCDPSession(page);

            // Inject batch rendering infrastructure
            await page.evaluate(() => {
              // Worker that renders frames autonomously with timestamps
              const workerSrc = `
                let results = [];
                self.onmessage = async (e) => {
                  if (e.data.type === 'renderBatch') {
                    results = [];
                    for (const frame of e.data.frames) {
                      const canvas = new OffscreenCanvas(64, 64);
                      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                      if (!gl) { results.push({ frameId: frame.id, error: 'no webgl' }); continue; }
                      gl.clearColor(frame.color[0], frame.color[1], frame.color[2], 1.0);
                      gl.clear(gl.COLOR_BUFFER_BIT);
                      gl.finish();
                      const px = new Uint8Array(4);
                      gl.readPixels(32, 32, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
                      results.push({
                        frameId: frame.id,
                        pixel: { r: px[0], g: px[1], b: px[2], a: px[3] },
                        timestamp: Date.now(),
                      });
                      await new Promise(r => setTimeout(r, 200));
                    }
                    self.postMessage({ type: 'batchComplete', results });
                  }
                };
              `;
              const blob = new Blob([workerSrc], {
                type: "application/javascript",
              });
              (window as any)._testWorker = new Worker(
                URL.createObjectURL(blob),
              );
              (window as any)._workerResults = null;
              (window as any)._workerDone = false;
              (window as any)._testWorker.onmessage = (e: any) => {
                if (e.data.type === "batchComplete") {
                  (window as any)._workerResults = e.data.results;
                  (window as any)._workerDone = true;
                }
              };

              // Main-thread batch rendering with timestamps
              (window as any)._mainResults = [];
              (window as any)._mainDone = false;
              (window as any)._mainRenderBatch = (frames: any[]) => {
                (window as any)._mainResults = [];
                (window as any)._mainDone = false;
                let i = 0;
                function renderNext() {
                  if (i >= frames.length) {
                    (window as any)._mainDone = true;
                    return;
                  }
                  const frame = frames[i++];
                  const canvas = document.createElement("canvas");
                  canvas.width = 64;
                  canvas.height = 64;
                  const gl =
                    canvas.getContext("webgl2", {
                      preserveDrawingBuffer: true,
                    }) ||
                    canvas.getContext("webgl", { preserveDrawingBuffer: true });
                  if (!gl) return;
                  gl.clearColor(
                    frame.color[0],
                    frame.color[1],
                    frame.color[2],
                    1.0,
                  );
                  gl.clear(gl.COLOR_BUFFER_BIT);
                  gl.finish();
                  const px = new Uint8Array(4);
                  gl.readPixels(32, 32, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
                  (window as any)._mainResults.push({
                    frameId: frame.id,
                    pixel: { r: px[0], g: px[1], b: px[2], a: px[3] },
                    timestamp: Date.now(),
                  });
                  setTimeout(renderNext, 200);
                }
                renderNext();
              };
            });

            const frames = [
              { id: 1, color: [1, 0, 0] },
              { id: 2, color: [0, 1, 0] },
              { id: 3, color: [0, 0, 1] },
              { id: 4, color: [1, 1, 0] },
              { id: 5, color: [1, 0, 1] },
            ];

            // Enable the debugger
            await cdp.send("Debugger.enable" as any);

            // Start both batch renders
            const freezeStartTime = await page.evaluate((f: any) => {
              const ts = Date.now();
              (window as any)._testWorker.postMessage({
                type: "renderBatch",
                frames: f,
              });
              (window as any)._mainRenderBatch(f);
              return ts;
            }, frames);

            // PAUSE the main thread V8 isolate
            await cdp.send("Debugger.pause" as any);

            // Wait for Worker to finish (5 * 200ms = 1s + margin)
            await new Promise((r) => setTimeout(r, 3000));

            // RESUME the main thread
            await cdp.send("Debugger.resume" as any);
            await cdp.send("Debugger.disable" as any);

            const unfreezeTime = await page.evaluate(() => Date.now());

            // Wait for main-thread catch-up
            await new Promise((r) => setTimeout(r, 2000));

            const workerResults = await page.evaluate(
              () => (window as any)._workerResults,
            );
            const mainResults = await page.evaluate(
              () => (window as any)._mainResults,
            );

            // Cleanup
            await page.evaluate(() => {
              (window as any)._testWorker?.terminate();
            });

            await cdp.detach();

            return {
              freezeStartTime,
              unfreezeTime,
              pauseDuration: unfreezeTime - freezeStartTime,
              workerResults,
              mainResults,
            };
          },
        },
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
          },
        ],
      },
      // Reasonable timeout for media loading and processing
      testTimeout: 10000,
    },
  };
});

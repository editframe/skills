import { readFile } from "node:fs/promises";
import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import { program } from "commander";
import debug from "debug";
import ora from "ora";
import { launchBrowserAndWaitForSDK } from "../utils/launchBrowserAndWaitForSDK.js";
import {
  spawnViteServer,
  type SpawnedViteServer,
} from "../utils/spawnViteServer.js";
import { patchFragmentedMp4 } from "../utils/patchFragmentedMp4.js";
import { StreamTargetChunk } from "mediabunny";
import { withProfiling } from "../utils/profileRender.js";
import { VERSION } from "../VERSION.js";

declare global {
  interface Window {
    EF_RENDER_DATA: any;
    EF_RENDER: any;
  }
}

const log = debug("ef:cli:render");

export async function sendTelemetry(
  efRenderHost: string,
  token: string | undefined,
  payload: Record<string, unknown>,
): Promise<void> {
  if (process.env.EF_TELEMETRY_ENABLED !== "true") return;
  try {
    await fetch(`${efRenderHost}/api/v1/telemetry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Telemetry must never fail the render — swallow all errors.
  }
}

/**
 * Format milliseconds as MM:SS or HH:MM:SS
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

program
  .command("render [directory]")
  .description("Render a video composition locally")
  .option("-o, --output <path>", "Output file path", "output.mp4")
  .option("--url <url>", "URL to render (bypasses directory/server startup)")
  .option("-d, --data <json>", "Custom render data (JSON string)")
  .option("--data-file <path>", "Custom render data from JSON file")
  .option("--fps <number>", "Frame rate", "30")
  .option("--scale <number>", "Resolution scale (0-1)", "1")
  .option("--include-audio", "Include audio track", true)
  .option("--no-include-audio", "Exclude audio track")
  .option("--from-ms <number>", "Start time in milliseconds")
  .option("--to-ms <number>", "End time in milliseconds")
  .option(
    "--experimental-native-render",
    "Use experimental canvas capture API (faster)",
  )
  .option("--profile", "Enable CPU profiling")
  .option(
    "--profile-output <path>",
    "Profile output path",
    "./render-profile.cpuprofile",
  )
  .action(async (directory = ".", options) => {
    const programOpts = program.opts();
    const token: string | undefined = programOpts.token || process.env.EF_TOKEN;
    const efRenderHost: string =
      programOpts.efRenderHost ||
      process.env.EF_RENDER_HOST ||
      "https://editframe.com";

    // If running from the dev script (via tsx), ORIGINAL_CWD contains the user's actual directory
    const baseCwd = process.env.ORIGINAL_CWD || process.cwd();
    const outputPath = path.resolve(baseCwd, options.output);

    // Parse custom data if provided
    let renderData: Record<string, unknown> | undefined;
    if (options.dataFile) {
      const dataFileContent = await readFile(options.dataFile, "utf-8");
      renderData = JSON.parse(dataFileContent);
      log("Loaded render data from file:", options.dataFile);
    } else if (options.data) {
      renderData = JSON.parse(options.data);
      log("Using render data from --data option");
    }

    // Parse numeric options
    const fps = parseInt(options.fps, 10);
    const scale = parseFloat(options.scale);
    const fromMs = options.fromMs ? parseInt(options.fromMs, 10) : undefined;
    const toMs = options.toMs ? parseInt(options.toMs, 10) : undefined;

    // Single initialization spinner for all setup steps
    const initSpinner = ora("Initializing...").start();

    let renderUrl: string;
    let viteServer: SpawnedViteServer | null = null;
    let renderStarted = false;

    try {
      // Determine URL to render
      if (options.url) {
        // Use provided URL directly
        renderUrl = options.url;
        log("Using provided URL:", renderUrl);
      } else {
        // Spawn Vite dev server as subprocess
        // This allows Vite to run with full config resolution (including Tailwind)
        // while we maintain Playwright control for rendering
        const srcDir = path.resolve(baseCwd, directory);
        viteServer = await spawnViteServer(srcDir);
        renderUrl = viteServer.url;
        log("Vite server spawned at:", renderUrl);
      }

      // Launch browser and load SDK (all within initialization)
      await launchBrowserAndWaitForSDK(
        {
          url: renderUrl,
          headless: true,
          interactive: false,
          efInteractive: false,
          nativeRender: options.experimentalNativeRender === true,
          profile: options.profile === true,
          profileOutput: options.profileOutput,
          silent: true, // Suppress individual spinners since we show unified "Initializing..."
        },
        async (page) => {
          initSpinner.succeed("Ready");

          // Now handle the render
          await withProfiling(
            page,
            {
              enabled: options.profile === true,
              outputPath: options.profileOutput,
            },
            async () => {
              // Ensure output directory exists
              mkdirSync(path.dirname(outputPath), { recursive: true });

              // Open output file for streaming writes
              const outputStream = createWriteStream(outputPath);
              let chunkCount = 0;
              let totalBytes = 0;

              // Expose chunk handler - writes through the stream in order
              await page.exposeFunction(
                "onRenderChunk",
                (chunk: StreamTargetChunk) => {
                  outputStream.write(Buffer.from(chunk.data));
                  chunkCount++;
                  totalBytes += chunk.data.length;
                  log(
                    `Received chunk ${chunkCount}: ${chunk.data.length} bytes (total: ${totalBytes} bytes)`,
                  );
                },
              );

              // Set custom render data if provided
              if (renderData) {
                await page.evaluate((data) => {
                  window.EF_RENDER_DATA = data;
                }, renderData);
                log("Set EF_RENDER_DATA:", renderData);
              }

              // Wait for EF_RENDER API to be available
              await page.waitForFunction(
                () => typeof window.EF_RENDER !== "undefined",
                { timeout: 10_000 },
              );

              // Check if ready
              const isReady = await page.evaluate(() =>
                window.EF_RENDER?.isReady(),
              );
              if (!isReady) {
                throw new Error(
                  "Render API is not ready. No ef-timegroup found.",
                );
              }

              // Create progress spinner
              const progressSpinner = ora("Rendering video...").start();

              // Track last progress for completion message
              let lastProgress: {
                currentFrame: number;
                totalFrames: number;
                renderedMs: number;
                totalDurationMs: number;
                elapsedMs: number;
                speedMultiplier: number;
              } | null = null;

              // Expose progress callback
              await page.exposeFunction(
                "onRenderProgress",
                (progress: {
                  progress: number;
                  currentFrame: number;
                  totalFrames: number;
                  renderedMs: number;
                  totalDurationMs: number;
                  elapsedMs: number;
                  estimatedRemainingMs: number;
                  speedMultiplier: number;
                }) => {
                  const percent = (progress.progress * 100).toFixed(1);
                  const renderedTime = formatTime(progress.renderedMs);
                  const totalTime = formatTime(progress.totalDurationMs);
                  const remainingTime = formatTime(
                    progress.estimatedRemainingMs,
                  );
                  const speed = progress.speedMultiplier.toFixed(2);

                  progressSpinner.text = `Rendering: ${progress.currentFrame}/${progress.totalFrames} frames (${percent}%) | ${renderedTime}/${totalTime} | ${remainingTime} remaining | ${speed}x speed`;

                  // Store last progress for completion message
                  lastProgress = {
                    currentFrame: progress.currentFrame,
                    totalFrames: progress.totalFrames,
                    renderedMs: progress.renderedMs,
                    totalDurationMs: progress.totalDurationMs,
                    elapsedMs: progress.elapsedMs,
                    speedMultiplier: progress.speedMultiplier,
                  };
                },
              );

              // Render with streaming
              renderStarted = true;
              let renderInfo: any = null;
              try {
                const renderOptions: any = {
                  fps,
                  scale,
                  includeAudio: options.includeAudio !== false,
                };

                if (fromMs !== undefined) {
                  renderOptions.fromMs = fromMs;
                }
                if (toMs !== undefined) {
                  renderOptions.toMs = toMs;
                }

                const renderStartTime = Date.now();
                await page.evaluate(async (opts) => {
                  await window.EF_RENDER!.renderStreaming(opts);
                }, renderOptions);
                const renderDurationMs = Date.now() - renderStartTime;

                // Collect render info for telemetry and moov patching
                renderInfo = await page.evaluate(async () => {
                  try {
                    return await window.EF_RENDER!.getRenderInfo();
                  } catch {
                    return null;
                  }
                });

                // Build completion message with performance stats
                if (lastProgress) {
                  const p = lastProgress as {
                    currentFrame: number;
                    totalFrames: number;
                    renderedMs: number;
                    totalDurationMs: number;
                    elapsedMs: number;
                    speedMultiplier: number;
                  };
                  const renderedTime = formatTime(p.renderedMs);
                  const totalTime = formatTime(p.totalDurationMs);
                  const elapsedTime = formatTime(p.elapsedMs);
                  const speed = p.speedMultiplier.toFixed(2);
                  progressSpinner.succeed(
                    `Render complete: ${p.currentFrame}/${p.totalFrames} frames | ${renderedTime}/${totalTime} | ${elapsedTime} elapsed | ${speed}x speed`,
                  );
                } else {
                  progressSpinner.succeed("Render complete");
                }

                // Send telemetry (fire-and-forget)
                void sendTelemetry(efRenderHost, token, {
                  render_path: "cli",
                  duration_ms: renderDurationMs,
                  ...(renderInfo?.width != null && { width: renderInfo.width }),
                  ...(renderInfo?.height != null && {
                    height: renderInfo.height,
                  }),
                  ...(renderInfo?.fps != null && { fps: renderInfo.fps }),
                  feature_usage: {
                    efMediaCount: renderInfo
                      ? Object.keys(renderInfo.assets.efMedia).length
                      : 0,
                    efImageCount: renderInfo?.assets.efImage.length ?? 0,
                    efCaptionsCount: renderInfo?.assets.efCaptions.length ?? 0,
                    efTextCount: 0,
                  },
                  cli_version: VERSION,
                });
              } catch (error) {
                progressSpinner.fail("Render failed");
                throw error;
              }

              // Close the output stream and wait for all chunks to flush
              outputStream.end();
              await new Promise<void>((resolve, reject) => {
                outputStream.on("finish", () => {
                  log(
                    `Render complete: ${chunkCount} chunks, ${totalBytes} bytes written to ${outputPath}`,
                  );
                  resolve();
                });
                outputStream.on("error", reject);
              });

              if (renderInfo?.durationMs) {
                await patchFragmentedMp4(outputPath, renderInfo.durationMs);
              }
            },
          );
        },
      );
    } catch (error) {
      if (!renderStarted) {
        initSpinner.fail("Initialization failed");
      }
      throw error;
    }

    // Clean up spawned Vite process
    if (viteServer) {
      viteServer.kill();
      log("Vite server stopped");
    }

    process.stderr.write(`\nRender complete: ${outputPath}\n`);
  });

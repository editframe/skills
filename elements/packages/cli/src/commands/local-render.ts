import { readFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { program } from "commander";
import debug from "debug";
import { launchBrowserAndWaitForSDK } from "../utils/launchBrowserAndWaitForSDK.js";
import { PreviewServer } from "../utils/startPreviewServer.js";
import { withSpinner } from "../utils/withSpinner.js";
import { withProfiling } from "../utils/profileRender.js";

declare global {
  interface Window {
    EF_RENDER_DATA: any;
    EF_RENDER: any;
  }
}

const log = debug("ef:cli:local-render");

program
  .command("local-render [directory]")
  .description(
    "Render a directory's index.html file as a video locally using Playwright",
  )
  .option("-o, --output <path>", "Output file path", "output.mp4")
  .option("-d, --data <json>", "Custom render data (JSON string)")
  .option("--data-file <path>", "Custom render data from JSON file")
  .option("--fps <number>", "Frame rate", "30")
  .option("--scale <number>", "Resolution scale (0-1)", "1")
  .option("--include-audio", "Include audio track", true)
  .option("--no-include-audio", "Exclude audio track")
  .option("--from-ms <number>", "Start time in milliseconds")
  .option("--to-ms <number>", "End time in milliseconds")
  .option("--profile", "Enable CPU profiling")
  .option(
    "--profile-output <path>",
    "Profile output path",
    "./render-profile.cpuprofile",
  )
  .action(async (directory = ".", options) => {
    // If running from the dev script (via tsx), ORIGINAL_CWD contains the user's actual directory
    const baseCwd = process.env.ORIGINAL_CWD || process.cwd();
    const srcDir = path.resolve(baseCwd, directory);
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

    // Start preview server
    const previewServer = await PreviewServer.start(srcDir);
    log("Preview server started at:", previewServer.url);

    // Launch browser and render
    await launchBrowserAndWaitForSDK(
      {
        url: previewServer.url,
        headless: true,
        interactive: false,
        efInteractive: false,
        profile: options.profile === true,
        profileOutput: options.profileOutput,
      },
      async (page) => {
        await withProfiling(
          page,
          {
            enabled: options.profile === true,
            outputPath: options.profileOutput,
          },
          async () => {
            // Open output file for streaming writes
            const outputStream = createWriteStream(outputPath);
            let chunkCount = 0;
            let totalBytes = 0;

            // Expose chunk handler - writes directly to file
            await page.exposeFunction(
              "onRenderChunk",
              (chunkArray: number[]) => {
                const chunk = Buffer.from(chunkArray);
                outputStream.write(chunk);
                chunkCount++;
                totalBytes += chunk.length;
                log(
                  `Received chunk ${chunkCount}: ${chunk.length} bytes (total: ${totalBytes} bytes)`,
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

            // Render with streaming
            await withSpinner("Rendering video...", async () => {
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

              await page.evaluate(async (opts) => {
                await window.EF_RENDER!.renderStreaming(opts);
              }, renderOptions);
            });

            // Close the output stream
            outputStream.end();

            // Wait for stream to finish
            await new Promise<void>((resolve, reject) => {
              outputStream.on("finish", () => {
                log(
                  `Render complete: ${chunkCount} chunks, ${totalBytes} bytes written to ${outputPath}`,
                );
                resolve();
              });
              outputStream.on("error", reject);
            });
          },
        );
      },
    );

    process.stderr.write(`\nRender complete: ${outputPath}\n`);
  });

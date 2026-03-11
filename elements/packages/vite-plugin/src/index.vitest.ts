import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path, { join } from "node:path";

import { compare as odiffCompare } from "odiff-bin";

import type { IncomingMessage } from "connect";
import type { ServerResponse } from "node:http";
import debug from "debug";
import type { Plugin } from "vite";
import {
  cacheImage,
  findOrCreateCaptions,
  generateTrack,
  generateScrubTrack,
  generateTrackFragmentIndex,
  md5FilePath,
} from "../../assets/src/index.js";

import { forbidRelativePaths } from "./forbidRelativePaths.js";
import { createJitTranscodeMiddleware } from "./jitTranscodeMiddleware.js";
import {
  createAssetsApiMiddleware,
  createLocalFilesApiMiddleware,
  handleClearCache,
} from "./middleware.js";

interface VitePluginEditframeOptions {
  root: string;
  cacheRoot: string;
  /**
   * When true, remote URLs are handled locally via ffprobe/ffmpeg.
   * Use in dev-projects; leave false (default) when using recordReplayProxyPlugin.
   */
  handleRemoteUrls?: boolean;
}

function parseDataUrl(dataUrl: string): {
  buffer: Buffer;
  mimeType: string;
  extension: string;
} {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid data URL format");
  }
  const mimeType = matches[1]!;
  const base64Data = matches[2]!;
  const buffer = Buffer.from(base64Data, "base64");

  let extension = "png";
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    extension = "jpg";
  } else if (mimeType === "image/webp") {
    extension = "webp";
  }

  return { buffer, mimeType, extension };
}

function getSnapshotDir(root: string, testName: string): string {
  return path.resolve(root, "test", "__snapshots__", testName);
}

function getSnapshotPaths(root: string, testName: string, snapshotName: string) {
  const dir = getSnapshotDir(root, testName);
  return {
    dir,
    baseline: join(dir, `${snapshotName}.baseline.png`),
    actual: join(dir, `${snapshotName}.actual.png`),
    diff: join(dir, `${snapshotName}.diff.png`),
  };
}

async function collectJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks).toString("utf-8");
  return JSON.parse(body) as T;
}

export const vitePluginEditframe = (options: VitePluginEditframeOptions) => {
  return {
    name: "vite-plugin-editframe",

    config(_config: unknown, { command }: { command: string }) {
      if (command === "serve") {
        return {
          define: {
            __EF_DEFAULT_API_HOST__: JSON.stringify("http://localhost:5173"),
            __EF_VERSION__: JSON.stringify("test"),
          },
        };
      }
    },

    configResolved(resolvedConfig: {
      define?: Record<string, string>;
      server?: { port?: number };
    }) {
      const port = resolvedConfig.server?.port ?? 5173;
      resolvedConfig.define ??= {};
      resolvedConfig.define["__EF_DEFAULT_API_HOST__"] = JSON.stringify(`http://localhost:${port}`);
      resolvedConfig.define["__EF_VERSION__"] ??= JSON.stringify("test");
    },

    configureServer(server) {
      server.middlewares.use(
        createJitTranscodeMiddleware(
          {
            root: options.root,
            cacheRoot: options.cacheRoot,
            handleRemoteUrls: options.handleRemoteUrls,
          },
          { generateTrack, generateScrubTrack, generateTrackFragmentIndex },
        ),
      );

      server.middlewares.use(
        createAssetsApiMiddleware(options, {
          cacheImage,
          findOrCreateCaptions,
        }),
      );

      server.middlewares.use(
        createLocalFilesApiMiddleware(options, {
          generateTrack,
          generateScrubTrack,
          generateTrackFragmentIndex,
          md5FilePath,
        }),
      );

      server.middlewares.use(async (req, res, next) => {
        const log = debug("ef:vite-plugin");
        if (req.url?.startsWith("/@ef")) {
          forbidRelativePaths(req);
        } else {
          return next();
        }

        log(`Handling ${req.url}`);

        const cacheRoot = options.cacheRoot.replace("dist/", "src/");
        const efPrefix = req.url.split("/")[1];

        switch (efPrefix) {
          case "@ef-clear-cache": {
            await handleClearCache(req, res as ServerResponse, cacheRoot);
            break;
          }
          case "@ef-sign-url": {
            if (req.method !== "POST") {
              res.writeHead(405, { Allow: "POST" });
              res.end();
              break;
            }

            log("Proxying /@ef-sign-url to /api/v1/url-token");

            const requestChunks: Buffer[] = [];
            req.on("data", (chunk) => {
              requestChunks.push(chunk);
            });

            req.on("end", async () => {
              const returnMockResponse = () => {
                const mockToken =
                  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJodHRwOi8vd2ViOjMwMDAvaGVhZC1tb292LTQ4MHAubXA0IiwiZXhwIjo5OTk5OTk5OTk5fQ.mock-signature";
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ token: mockToken }));
              };

              try {
                Buffer.concat(requestChunks);
                log("Returning mock token response (no signing server in CI/cache-only mode)");
                returnMockResponse();
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                log(`Error handling URL signing request: ${errorMessage}`);
                console.error("[Vite Plugin] URL signing error:", errorMessage);
                returnMockResponse();
              }
            });
            break;
          }
          case "@ef-write-snapshot": {
            if (req.method !== "POST") {
              res.writeHead(405, { Allow: "POST" });
              res.end();
              break;
            }

            try {
              const body = await collectJsonBody<{
                testName: string;
                snapshotName: string;
                dataUrl: string;
                isBaseline: boolean;
              }>(req);

              const { testName, snapshotName, dataUrl, isBaseline } = body;
              const paths = getSnapshotPaths(options.root, testName, snapshotName);

              await mkdir(paths.dir, { recursive: true });

              const { buffer } = parseDataUrl(dataUrl);
              const targetPath = isBaseline ? paths.baseline : paths.actual;
              await writeFile(targetPath, buffer);

              log(`Wrote snapshot to ${targetPath}`);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: true, path: targetPath }));
            } catch (error) {
              log(`Error writing snapshot: ${error}`);
              res.writeHead(500, { "Content-Type": "text/plain" });
              res.end(error instanceof Error ? error.message : String(error));
            }
            break;
          }
          case "@ef-compare-snapshot": {
            if (req.method !== "POST") {
              res.writeHead(405, { Allow: "POST" });
              res.end();
              break;
            }

            try {
              const body = await collectJsonBody<{
                testName: string;
                snapshotName: string;
                dataUrl: string;
                threshold?: number;
                antialiasing?: boolean;
                acceptableDiffPercentage?: number;
              }>(req);

              const {
                testName,
                snapshotName,
                dataUrl,
                threshold = 0.1,
                antialiasing = true,
                acceptableDiffPercentage = 1.0,
              } = body;

              const paths = getSnapshotPaths(options.root, testName, snapshotName);

              await mkdir(paths.dir, { recursive: true });

              const { buffer } = parseDataUrl(dataUrl);
              await writeFile(paths.actual, buffer);
              log(`Wrote actual snapshot to ${paths.actual}`);

              if (!existsSync(paths.baseline)) {
                await writeFile(paths.baseline, buffer);
                log(`Created baseline at ${paths.baseline}`);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ match: true, baselineCreated: true }));
                break;
              }

              log(`Comparing ${paths.actual} against ${paths.baseline}`);
              const result = await odiffCompare(paths.baseline, paths.actual, paths.diff, {
                threshold,
                antialiasing,
              });

              if (result.match) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    match: true,
                    diffCount: 0,
                    diffPercentage: 0,
                  }),
                );
              } else if (result.reason === "pixel-diff") {
                const diffPercentage = result.diffPercentage ?? 0;
                const match = diffPercentage <= acceptableDiffPercentage;
                log(
                  `Diff: ${result.diffCount} pixels (${diffPercentage.toFixed(2)}%), match: ${match}`,
                );
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    match,
                    diffCount: result.diffCount,
                    diffPercentage,
                  }),
                );
              } else if (result.reason === "layout-diff") {
                log(`Layout diff detected`);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    match: false,
                    error: "Images have different dimensions",
                  }),
                );
              } else {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    match: false,
                    error: `Comparison failed: ${result.reason}`,
                  }),
                );
              }
            } catch (error) {
              log(`Error comparing snapshot: ${error}`);
              res.writeHead(500, { "Content-Type": "text/plain" });
              res.end(error instanceof Error ? error.message : String(error));
            }
            break;
          }
          case "@ef-compare-two-images": {
            if (req.method !== "POST") {
              res.writeHead(405, { Allow: "POST" });
              res.end();
              break;
            }

            try {
              const body = await collectJsonBody<{
                testName: string;
                comparisonName: string;
                dataUrl1: string;
                dataUrl2: string;
                threshold?: number;
                acceptableDiffPercentage?: number;
              }>(req);

              const {
                testName,
                comparisonName,
                dataUrl1,
                dataUrl2,
                threshold = 0.1,
                acceptableDiffPercentage = 1.0,
              } = body;

              const dir = getSnapshotDir(options.root, testName);
              await mkdir(dir, { recursive: true });

              const image1Path = join(dir, `${comparisonName}.image1.png`);
              const image2Path = join(dir, `${comparisonName}.image2.png`);
              const diffPath = join(dir, `${comparisonName}.diff.png`);

              const { buffer: buffer1 } = parseDataUrl(dataUrl1);
              const { buffer: buffer2 } = parseDataUrl(dataUrl2);
              await writeFile(image1Path, buffer1);
              await writeFile(image2Path, buffer2);

              log(`Comparing two images: ${image1Path} vs ${image2Path}`);

              const result = await odiffCompare(image1Path, image2Path, diffPath, {
                threshold,
                antialiasing: true,
              });

              if (result.match) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    match: true,
                    diffCount: 0,
                    diffPercentage: 0,
                  }),
                );
              } else if (result.reason === "pixel-diff") {
                const diffPercentage = result.diffPercentage ?? 0;
                const match = diffPercentage <= acceptableDiffPercentage;
                log(
                  `Diff: ${result.diffCount} pixels (${diffPercentage.toFixed(2)}%), match: ${match}`,
                );
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    match,
                    diffCount: result.diffCount,
                    diffPercentage,
                  }),
                );
              } else if (result.reason === "layout-diff") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    match: false,
                    error: "Images have different dimensions",
                  }),
                );
              } else {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    match: false,
                    error: `Comparison failed: ${result.reason}`,
                  }),
                );
              }
            } catch (error) {
              log(`Error comparing images: ${error}`);
              res.writeHead(500, { "Content-Type": "text/plain" });
              res.end(error instanceof Error ? error.message : String(error));
            }
            break;
          }
          default:
            log(`Unknown asset type ${efPrefix}`);
            break;
        }
      });
    },
  } satisfies Plugin;
};

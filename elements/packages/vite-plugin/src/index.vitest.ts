import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import type { ServerResponse } from "node:http";
import path, { join } from "node:path";

import { compare as odiffCompare } from "odiff-bin";

import type { IncomingMessage, NextFunction } from "connect";
import debug from "debug";
import type { Plugin } from "vite";
// Direct imports from api package for vitest
// Note: Client and createURLToken removed - @ef-sign-url now proxies through record-replay proxy
// Direct imports from assets package
import {
  cacheImage,
  findOrCreateCaptions,
  generateTrack,
  generateScrubTrack,
  generateTrackFragmentIndex,
  md5FilePath,
} from "../../assets/src/index.js";

// Import sendTaskResult from relative path (type imports are stripped at compile time)
import { sendTaskResult } from "./sendTaskResult.js";
import { forbidRelativePaths } from "./forbidRelativePaths.js";
import { createJitTranscodeMiddleware } from "./jitTranscodeMiddleware.js";

interface VitePluginEditframeOptions {
  root: string;
  cacheRoot: string;
}

/**
 * Parse a data URL and return the buffer, mime type, and file extension.
 */
function parseDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string; extension: string } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid data URL format");
  }
  const mimeType = matches[1]!;
  const base64Data = matches[2]!;
  const buffer = Buffer.from(base64Data, "base64");
  
  // Determine file extension from mime type
  let extension = "png";
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    extension = "jpg";
  } else if (mimeType === "image/webp") {
    extension = "webp";
  }
  
  return { buffer, mimeType, extension };
}

/**
 * Get the snapshot directory path for a test.
 * Uses path.resolve to ensure absolute paths for odiff compatibility.
 */
function getSnapshotDir(root: string, testName: string): string {
  return path.resolve(root, "test", "__snapshots__", testName);
}

/**
 * Get snapshot file paths for a given test and snapshot name.
 */
function getSnapshotPaths(root: string, testName: string, snapshotName: string) {
  const dir = getSnapshotDir(root, testName);
  return {
    dir,
    baseline: join(dir, `${snapshotName}.baseline.png`),
    actual: join(dir, `${snapshotName}.actual.png`),
    diff: join(dir, `${snapshotName}.diff.png`),
  };
}

/**
 * Collect JSON body from an incoming request.
 */
async function collectJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks).toString("utf-8");
  return JSON.parse(body) as T;
}

// In-memory mapping of MD5 -> file path for API route handling
const md5ToFilePathMap = new Map<string, string>();

export const vitePluginEditframe = (options: VitePluginEditframeOptions) => {
  return {
    name: "vite-plugin-editframe",

    configureServer(server) {
      // Register JIT transcode middleware first (shared with production)
      const jitTranscodeMiddleware = createJitTranscodeMiddleware(options, {
        generateTrack,
        generateScrubTrack,
        generateTrackFragmentIndex,
      });
      server.middlewares.use(jitTranscodeMiddleware);

      // Handle local assets API format: /api/v1/assets/local/*
      const assetsLocalApiMiddleware = async (
        req: IncomingMessage,
        res: ServerResponse,
        next: NextFunction,
      ) => {
        const log = debug("ef:vite-plugin:assets");
        const reqUrl = req.url || "";
        
        if (!reqUrl.startsWith("/api/v1/assets/local/")) {
          return next();
        }
        
        const url = new URL(reqUrl, `http://${req.headers.host}`);
        const urlPath = url.pathname;
        const src = url.searchParams.get("src");
        
        if (!src) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "src parameter is required" }));
          return;
        }
        
        // Resolve src to absolute file path
        const absolutePath = src.startsWith("http")
          ? src
          : path.join(options.root, src).replace("dist/", "src/");
        
        log(`Handling local assets API: ${urlPath} for ${absolutePath}`);
        
        try {
          // Handle /api/v1/assets/local/captions - captions/transcriptions
          if (urlPath === "/api/v1/assets/local/captions") {
            log(`Serving captions for ${absolutePath}`);
            const taskResult = await findOrCreateCaptions(options.cacheRoot, absolutePath);
            sendTaskResult(req, res, taskResult);
            return;
          }
          
          // Handle /api/v1/assets/local/image - cached images
          if (urlPath === "/api/v1/assets/local/image") {
            log(`Serving image for ${absolutePath}`);
            const taskResult = await cacheImage(options.cacheRoot, absolutePath);
            sendTaskResult(req, res, taskResult);
            return;
          }
          
          // Unknown endpoint
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unknown assets endpoint" }));
        } catch (error) {
          log(`Error handling assets request: ${error}`);
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("File not found");
          } else {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: (error as Error).message }));
          }
        }
      };
      server.middlewares.use(assetsLocalApiMiddleware);

      // Handle production API format for local files: /api/v1/isobmff_files/local/*
      const isobmffLocalApiMiddleware = async (
        req: IncomingMessage,
        res: ServerResponse,
        next: NextFunction,
      ) => {
        const log = debug("ef:vite-plugin:isobmff");
        const reqUrl = req.url || "";
        
        if (!reqUrl.startsWith("/api/v1/isobmff_files/local/")) {
          return next();
        }
        
        const url = new URL(reqUrl, `http://${req.headers.host}`);
        const urlPath = url.pathname;
        const src = url.searchParams.get("src");
        
        if (!src) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "src parameter is required" }));
          return;
        }
        
        // Resolve src to absolute file path
        const absolutePath = src.startsWith("http")
          ? src
          : path.join(options.root, src).replace("dist/", "src/");
        
        log(`Handling local isobmff API: ${urlPath} for ${absolutePath}`);
        
        try {
          // Handle /api/v1/isobmff_files/local/index - fragment index
          if (urlPath === "/api/v1/isobmff_files/local/index") {
            log(`Serving track fragment index for ${absolutePath}`);
            const taskResult = await generateTrackFragmentIndex(options.cacheRoot, absolutePath);
            sendTaskResult(req, res, taskResult);
            return;
          }
          
          // Handle /api/v1/isobmff_files/local/md5 - get MD5 hash for a file
          if (urlPath === "/api/v1/isobmff_files/local/md5") {
            log(`Getting MD5 for ${absolutePath}`);
            try {
              const md5 = await md5FilePath(absolutePath);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ md5 }));
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("File not found");
              } else {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: (error as Error).message }));
              }
            }
            return;
          }
          
          // Handle /api/v1/isobmff_files/local/track - track segments
          if (urlPath === "/api/v1/isobmff_files/local/track") {
            const trackIdStr = url.searchParams.get("trackId");
            const segmentIdStr = url.searchParams.get("segmentId");
            
            if (!trackIdStr) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "trackId parameter is required" }));
              return;
            }
            
            const trackId = parseInt(trackIdStr, 10);
            
            // For scrub track (trackId -1), use generateScrubTrack
            if (trackId === -1) {
              log(`Serving scrub track for ${absolutePath}`);
              const taskResult = await generateScrubTrack(options.cacheRoot, absolutePath);
              sendTaskResult(req, res, taskResult);
              return;
            }
            
            // For regular tracks, use generateTrack
            log(`Serving track ${trackId} segment ${segmentIdStr || "all"} for ${absolutePath}`);
            const trackUrl = `/@ef-track/${src}?trackId=${trackId}${segmentIdStr ? `&segmentId=${segmentIdStr}` : ""}`;
            const taskResult = await generateTrack(options.cacheRoot, absolutePath, trackUrl);
            sendTaskResult(req, res, taskResult);
            return;
          }
          
          // Unknown endpoint
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unknown isobmff endpoint" }));
        } catch (error) {
          log(`Error handling isobmff request: ${error}`);
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("File not found");
          } else {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: (error as Error).message }));
          }
        }
      };
      server.middlewares.use(isobmffLocalApiMiddleware);

      const middleware = async (
        req: IncomingMessage,
        res: ServerResponse,
        next: NextFunction,
      ) => {
        const log = debug("ef:vite-plugin");
        // Forbid relative paths in any request
        if (req.url?.startsWith("/@ef")) {
          forbidRelativePaths(req);
        } else {
          return next();
        }

        log(`Handling ${req.url}`);

        const requestPath = req.url.replace(/^\/@ef-[^/]+\//, "");
        const assetPath = requestPath.replace(/\?.*$/, "");

        const absolutePath = assetPath.startsWith("http")
          ? assetPath
          : path.join(options.root, assetPath).replace("dist/", "src/");

        options.cacheRoot = options.cacheRoot.replace("dist/", "src/");

        const efPrefix = req.url.split("/")[1];

        switch (efPrefix) {
          case "@ef-clear-cache": {
            if (req.method !== "DELETE") {
              res.writeHead(405, { Allow: "DELETE" });
              res.end();
              break;
            }
            log(`Clearing cache for ${options.cacheRoot}`);
            // Retry cache clearing to handle race conditions with concurrent tests
            const cachePath = join(options.cacheRoot, ".cache");
            const maxRetries = 3;
            for (let attempt = 0; attempt < maxRetries; attempt++) {
              try {
                await rm(cachePath, {
                  recursive: true,
                  force: true,
                });
                break; // Success, exit retry loop
              } catch (error: any) {
                // ENOTEMPTY can happen if files are being written during deletion
                // ENOENT is fine - directory doesn't exist
                if (error.code === "ENOENT") {
                  break; // Already cleared, done
                }
                if (error.code === "ENOTEMPTY" && attempt < maxRetries - 1) {
                  // Wait a bit and retry
                  await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
                  continue;
                }
                // Log but don't fail - cache clearing is best-effort
                log(`Warning: Cache clear attempt ${attempt + 1} failed: ${error.message}`);
                if (attempt === maxRetries - 1) {
                  log(`Cache clear failed after ${maxRetries} attempts, continuing anyway`);
                }
              }
            }
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("Cache cleared");
            break;
          }
          case "@ef-asset": {
            if (req.method !== "HEAD") {
              res.writeHead(405, { Allow: "HEAD" });
              res.end();
            }
            md5FilePath(absolutePath)
              .then((md5) => {
                // Store mapping for production API route handling
                md5ToFilePathMap.set(md5, absolutePath);
                log(`Stored MD5 mapping: ${md5} -> ${absolutePath}`);
                res.writeHead(200, {
                  etag: md5,
                });
                res.end();
              })
              .catch(next);
            break;
          }
          case "@ef-track-fragment-index": {
            log(`Serving track fragment index for ${absolutePath}`);
            generateTrackFragmentIndex(options.cacheRoot, absolutePath)
              .then((taskResult) => sendTaskResult(req, res, taskResult))
              .catch((error) => {
                if (error.code === "ENOENT") {
                  log(`File not found: ${absolutePath}`);
                  res.writeHead(404, { "Content-Type": "text/plain" });
                  res.end("File not found");
                } else {
                  next(error);
                }
              });
            break;
          }
          case "@ef-track": {
            log(`Serving track for ${absolutePath}`);
            generateTrack(options.cacheRoot, absolutePath, req.url)
              .then((taskResult) => sendTaskResult(req, res, taskResult))
              .catch((error) => {
                if (error.code === "ENOENT") {
                  log(`File not found: ${absolutePath}`);
                  res.writeHead(404, { "Content-Type": "text/plain" });
                  res.end("File not found");
                } else {
                  next(error);
                }
              });
            break;
          }
          case "@ef-scrub-track": {
            log(`Serving scrub track for ${absolutePath}`);
            generateScrubTrack(options.cacheRoot, absolutePath)
              .then((taskResult) => sendTaskResult(req, res, taskResult))
              .catch((error) => {
                if (error.code === "ENOENT") {
                  log(`File not found: ${absolutePath}`);
                  res.writeHead(404, { "Content-Type": "text/plain" });
                  res.end("File not found");
                } else {
                  next(error);
                }
              });
            break;
          }
          case "@ef-captions":
            log(`Serving captions for ${absolutePath}`);
            findOrCreateCaptions(options.cacheRoot, absolutePath)
              .then((taskResult) => sendTaskResult(req, res, taskResult))
              .catch((error) => {
                if (error.code === "ENOENT") {
                  log(`File not found: ${absolutePath}`);
                  res.writeHead(404, { "Content-Type": "text/plain" });
                  res.end("File not found");
                } else {
                  next(error);
                }
              });
            break;
          case "@ef-image":
            log(`Serving image file ${absolutePath}`);
            cacheImage(options.cacheRoot, absolutePath)
              .then((taskResult) => sendTaskResult(req, res, taskResult))
              .catch((error) => {
                if (error.code === "ENOENT") {
                  log(`File not found: ${absolutePath}`);
                  res.writeHead(404, { "Content-Type": "text/plain" });
                  res.end("File not found");
                } else {
                  next(error);
                }
              });
            break;
          case "@ef-sign-url": {
            if (req.method !== "POST") {
              res.writeHead(405, { Allow: "POST" });
              res.end();
              break;
            }

            log("Proxying /@ef-sign-url to /api/v1/url-token");

            // Collect request body
            const requestChunks: Buffer[] = [];
            req.on("data", (chunk) => {
              requestChunks.push(chunk);
            });

            req.on("end", async () => {
              // Helper function to return mock response
              const returnMockResponse = () => {
                const mockToken =
                  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJodHRwOi8vd2ViOjMwMDAvaGVhZC1tb292LTQ4MHAubXA0IiwiZXhwIjo5OTk5OTk5OTk5fQ.mock-signature";
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ token: mockToken }));
              };

              try {
                // Consume request body (even though we don't use it)
                Buffer.concat(requestChunks);

                // In CI, there's no signing server, so return mock response directly
                // In cache-only mode (prepare-release), also return mock directly since we rely on cached HTTP responses
                // In local dev, return mock response directly (MSW can't intercept server-side fetch)
                // The record-replay proxy handles caching for /api/v1/transcode/* requests, not URL signing
                log(
                  "Returning mock token response (no signing server in CI/cache-only mode)",
                );
                returnMockResponse();
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                log(`Error handling URL signing request: ${errorMessage}`);
                console.error("[Vite Plugin] URL signing error:", errorMessage);
                // Always fall back to mock response on error
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

              // Ensure directory exists
              await mkdir(paths.dir, { recursive: true });

              // Parse and write the image
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

              // Ensure directory exists
              await mkdir(paths.dir, { recursive: true });

              // Write the actual image
              const { buffer } = parseDataUrl(dataUrl);
              await writeFile(paths.actual, buffer);
              log(`Wrote actual snapshot to ${paths.actual}`);

              // Check if baseline exists
              if (!existsSync(paths.baseline)) {
                // No baseline - create one
                await writeFile(paths.baseline, buffer);
                log(`Created baseline at ${paths.baseline}`);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  match: true,
                  baselineCreated: true,
                }));
                break;
              }

              // Compare using odiff
              log(`Comparing ${paths.actual} against ${paths.baseline}`);
              const result = await odiffCompare(
                paths.baseline,
                paths.actual,
                paths.diff,
                {
                  threshold,
                  antialiasing,
                },
              );

              if (result.match) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  match: true,
                  diffCount: 0,
                  diffPercentage: 0,
                }));
              } else if (result.reason === "pixel-diff") {
                const diffPercentage = result.diffPercentage ?? 0;
                const match = diffPercentage <= acceptableDiffPercentage;
                log(`Diff: ${result.diffCount} pixels (${diffPercentage.toFixed(2)}%), match: ${match}`);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  match,
                  diffCount: result.diffCount,
                  diffPercentage,
                }));
              } else if (result.reason === "layout-diff") {
                log(`Layout diff detected`);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  match: false,
                  error: "Images have different dimensions",
                }));
              } else {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  match: false,
                  error: `Comparison failed: ${result.reason}`,
                }));
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

              // Write both images to temporary files
              const image1Path = join(dir, `${comparisonName}.image1.png`);
              const image2Path = join(dir, `${comparisonName}.image2.png`);
              const diffPath = join(dir, `${comparisonName}.diff.png`);

              const { buffer: buffer1 } = parseDataUrl(dataUrl1);
              const { buffer: buffer2 } = parseDataUrl(dataUrl2);
              await writeFile(image1Path, buffer1);
              await writeFile(image2Path, buffer2);

              log(`Comparing two images: ${image1Path} vs ${image2Path}`);

              // Compare using odiff
              const result = await odiffCompare(
                image1Path,
                image2Path,
                diffPath,
                {
                  threshold,
                  antialiasing: true,
                },
              );

              if (result.match) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  match: true,
                  diffCount: 0,
                  diffPercentage: 0,
                }));
              } else if (result.reason === "pixel-diff") {
                const diffPercentage = result.diffPercentage ?? 0;
                const match = diffPercentage <= acceptableDiffPercentage;
                log(`Diff: ${result.diffCount} pixels (${diffPercentage.toFixed(2)}%), match: ${match}`);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  match,
                  diffCount: result.diffCount,
                  diffPercentage,
                }));
              } else if (result.reason === "layout-diff") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  match: false,
                  error: "Images have different dimensions",
                }));
              } else {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  match: false,
                  error: `Comparison failed: ${result.reason}`,
                }));
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
      };
      server.middlewares.use(middleware);
    },
  } satisfies Plugin;
};

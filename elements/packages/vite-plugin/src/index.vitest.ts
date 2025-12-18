import { rm } from "node:fs/promises";
import type { ServerResponse } from "node:http";
import path, { join } from "node:path";

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

// Inlined forbidRelativePaths function
const forbidRelativePaths = (req: IncomingMessage) => {
  if (req.url?.includes("..")) {
    throw new Error("Relative paths are forbidden");
  }
};

// Import sendTaskResult from relative path (type imports are stripped at compile time)
import { sendTaskResult } from "./sendTaskResult.js";

interface VitePluginEditframeOptions {
  root: string;
  cacheRoot: string;
}

export const vitePluginEditframe = (options: VitePluginEditframeOptions) => {
  return {
    name: "vite-plugin-editframe",

    configureServer(server) {
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
            await rm(join(options.cacheRoot, ".cache"), {
              recursive: true,
              force: true,
            });
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
          default:
            log(`Unknown asset type ${efPrefix}`);
            break;
        }
      };
      server.middlewares.use(middleware);
    },
  } satisfies Plugin;
};

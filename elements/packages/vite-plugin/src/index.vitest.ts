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
  generateTrackFragmentIndex,
  md5FilePath,
} from "../../assets/src/index.js";
import { TEST_SERVER_PORT } from "../../elements/test/constants.js";

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

            // Rewrite the request URL to /api/v1/url-token so the record-replay proxy middleware handles it
            // This allows cached responses to be served in CI
            req.url = "/api/v1/url-token";
            
            // Pass the modified request to the next middleware (record-replay proxy)
            // The proxy middleware will handle the request and response
            next();
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

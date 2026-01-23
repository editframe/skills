import { rm } from "node:fs/promises";
import path, { join } from "node:path";
import { Client, createURLToken } from "@editframe/api";
import {
  cacheImage,
  findOrCreateCaptions,
  generateTrack,
  generateScrubTrack,
  generateTrackFragmentIndex,
  md5FilePath,
} from "@editframe/assets";
import debug from "debug";
import type { Plugin } from "vite";

import { forbidRelativePaths } from "./forbidRelativePaths.js";
import { sendTaskResult } from "./sendTaskResult.js";

interface VitePluginEditframeOptions {
  root: string;
  cacheRoot: string;
}

// In-memory mapping of MD5 -> file path for API route handling
const md5ToFilePathMap = new Map<string, string>();

// Create editframe client instance
const getEditframeClient = () => {
  const token = process.env.EF_TOKEN;
  const efHost = process.env.EF_HOST;
  if (!token) {
    throw new Error("EF_TOKEN environment variable must be set");
  }
  return new Client(token, efHost);
};

export const vitePluginEditframe = (options: VitePluginEditframeOptions) => {
  return {
    name: "vite-plugin-editframe",

    configureServer(server) {
      // Handle local assets API format: /api/v1/assets/local/*
      server.middlewares.use(async (req, res, next) => {
        const log = debug("ef:vite-plugin");
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
      });

      // Handle production API format for local files: /api/v1/isobmff_files/local/*
      server.middlewares.use(async (req, res, next) => {
        const log = debug("ef:vite-plugin");
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
      });
      
      // Handle @ef-* format (legacy)
      server.middlewares.use(async (req, res, next) => {
        const log = debug("ef:vite-plugin");
        // Forbid relative paths in any request
        if (req.url?.startsWith("/@ef")) {
          forbidRelativePaths(req);
        } else {
          return next();
        }

        log(`Handling ${req.url} at ${new Date().toISOString()}`);

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
                // Store mapping for API route handling
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
            const indexStartTime = Date.now();
            log(`Serving track fragment index for ${absolutePath}`);
            generateTrackFragmentIndex(options.cacheRoot, absolutePath)
              .then((taskResult) => {
                const elapsed = Date.now() - indexStartTime;
                log(`Fragment index generated in ${elapsed}ms: ${taskResult.cachePath}`);
                sendTaskResult(req, res, taskResult);
              })
              .catch((error) => {
                const elapsed = Date.now() - indexStartTime;
                log(`Error generating fragment index after ${elapsed}ms:`, error);
                next(error);
              });
            break;
          }
          case "@ef-track": {
            const trackStartTime = Date.now();
            log(`Serving track for ${absolutePath} (cacheRoot: ${options.cacheRoot})`);
            generateTrack(options.cacheRoot, absolutePath, req.url)
              .then((taskResult) => {
                const elapsed = Date.now() - trackStartTime;
                log(`Track generated in ${elapsed}ms: ${taskResult.cachePath}`);
                sendTaskResult(req, res, taskResult);
              })
              .catch((error) => {
                const elapsed = Date.now() - trackStartTime;
                log(`Error generating track after ${elapsed}ms:`, error);
                next(error);
              });
            break;
          }
          case "@ef-scrub-track": {
            log(`Serving scrub track for ${absolutePath}`);
            generateScrubTrack(options.cacheRoot, absolutePath)
              .then((taskResult) => sendTaskResult(req, res, taskResult))
              .catch(next);
            break;
          }
          case "@ef-captions":
            log(`Serving captions for ${absolutePath}`);
            findOrCreateCaptions(options.cacheRoot, absolutePath)
              .then((taskResult) => sendTaskResult(req, res, taskResult))
              .catch(next);
            break;
          case "@ef-image":
            log(`Serving image file ${absolutePath}`);
            cacheImage(options.cacheRoot, absolutePath)
              .then((taskResult) => sendTaskResult(req, res, taskResult))
              .catch(next);
            break;
          case "@ef-sign-url": {
            if (req.method !== "POST") {
              res.writeHead(405, { Allow: "POST" });
              res.end();
              break;
            }

            log("Signing URL token");

            // Parse request body
            let body = "";
            req.on("data", (chunk) => {
              body += chunk.toString();
            });

            req.on("end", async () => {
              try {
                const payload = JSON.parse(body);
                log("Token signing request payload:", payload);

                // Handle both formats: { url } and { url, params }
                const { url, params } = payload;
                if (!url) {
                  res.writeHead(400, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ error: "URL is required" }));
                  return;
                }

                const client = getEditframeClient();

                // createURLToken expects just a string URL
                // For transcode URLs with params, we need to reconstruct the full URL
                let fullUrl = url;
                if (params) {
                  const urlObj = new URL(url);
                  // Add params as query parameters
                  Object.entries(params).forEach(([key, value]) => {
                    urlObj.searchParams.set(key, String(value));
                  });
                  fullUrl = urlObj.toString();
                }

                log("Creating token for full URL:", fullUrl);
                const token = await createURLToken(client, fullUrl);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ token }));
              } catch (error) {
                log(`Error signing URL token: ${error}`);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Failed to sign URL token" }));
              }
            });

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

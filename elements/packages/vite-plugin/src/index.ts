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
import { createJitTranscodeMiddleware } from "./jitTranscodeMiddleware.js";
import { sendTaskResult } from "./sendTaskResult.js";

interface VitePluginEditframeOptions {
  root: string;
  cacheRoot: string;
}

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
      // Register JIT transcode middleware first (shared with vitest)
      const jitTranscodeMiddleware = createJitTranscodeMiddleware(
        { ...options, handleRemoteUrls: true },
        {
          generateTrack,
          generateScrubTrack,
          generateTrackFragmentIndex,
        },
      );
      server.middlewares.use(jitTranscodeMiddleware);

      // Handle assets API: /api/v1/assets/image and /api/v1/assets/captions
      // src= accepts both local file paths and remote http/https URLs.
      // Remote URLs are fetched server-side so the browser receives them as same-origin,
      // preventing canvas CORS taint when drawImage() is called during rendering.
      server.middlewares.use(async (req, res, next) => {
        const log = debug("ef:vite-plugin");
        const reqUrl = req.url || "";

        if (!reqUrl.startsWith("/api/v1/assets/")) {
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

        const isRemote =
          src.startsWith("http://") || src.startsWith("https://");
        const absolutePath = isRemote
          ? src
          : path.join(options.root, src).replace("dist/", "src/");

        log(`Handling assets API: ${urlPath} src=${src}`);

        try {
          if (urlPath === "/api/v1/assets/image") {
            if (isRemote) {
              const response = await fetch(src);
              if (!response.ok) {
                res.writeHead(response.status);
                res.end();
                return;
              }
              const contentType =
                response.headers.get("content-type") ??
                "application/octet-stream";
              const buffer = await response.arrayBuffer();
              res.writeHead(200, { "Content-Type": contentType });
              res.end(Buffer.from(buffer));
            } else {
              const taskResult = await cacheImage(
                options.cacheRoot,
                absolutePath,
              );
              sendTaskResult(req, res, taskResult);
            }
            return;
          }

          if (urlPath === "/api/v1/assets/captions") {
            const taskResult = await findOrCreateCaptions(
              options.cacheRoot,
              absolutePath,
            );
            sendTaskResult(req, res, taskResult);
            return;
          }

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

      // Handle local file API: /api/v1/files/index, /api/v1/files/md5, /api/v1/files/track (src= identifies local source)
      server.middlewares.use(async (req, res, next) => {
        const log = debug("ef:vite-plugin");
        const reqUrl = req.url || "";

        const url = new URL(reqUrl, `http://${req.headers.host}`);
        const urlPath = url.pathname;
        const src = url.searchParams.get("src");

        if (
          !src ||
          (urlPath !== "/api/v1/files/index" &&
            urlPath !== "/api/v1/files/md5" &&
            urlPath !== "/api/v1/files/track")
        ) {
          return next();
        }

        // Resolve src to absolute file path
        const absolutePath = src.startsWith("http")
          ? src
          : path.join(options.root, src).replace("dist/", "src/");

        log(`Handling local file API: ${urlPath} for ${absolutePath}`);

        try {
          if (urlPath === "/api/v1/files/index") {
            log(`Serving track fragment index for ${absolutePath}`);
            const taskResult = await generateTrackFragmentIndex(
              options.cacheRoot,
              absolutePath,
            );
            sendTaskResult(req, res, taskResult);
            return;
          }

          if (urlPath === "/api/v1/files/md5") {
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

          if (urlPath === "/api/v1/files/track") {
            const trackIdStr = url.searchParams.get("trackId");
            const segmentIdStr = url.searchParams.get("segmentId");

            if (!trackIdStr) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({ error: "trackId parameter is required" }),
              );
              return;
            }

            const trackId = parseInt(trackIdStr, 10);

            if (trackId === -1) {
              log(`Serving scrub track for ${absolutePath}`);
              const taskResult = await generateScrubTrack(
                options.cacheRoot,
                absolutePath,
              );
              sendTaskResult(req, res, taskResult);
              return;
            }

            log(
              `Serving track ${trackId} segment ${segmentIdStr || "all"} for ${absolutePath}`,
            );
            const trackUrl = `/@ef-track/${src}?trackId=${trackId}${segmentIdStr ? `&segmentId=${segmentIdStr}` : ""}`;
            const taskResult = await generateTrack(
              options.cacheRoot,
              absolutePath,
              trackUrl,
            );
            sendTaskResult(req, res, taskResult);
            return;
          }
        } catch (error) {
          log(`Error handling local file request: ${error}`);
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
                  await new Promise((resolve) =>
                    setTimeout(resolve, 100 * (attempt + 1)),
                  );
                  continue;
                }
                // Log but don't fail - cache clearing is best-effort
                log(
                  `Warning: Cache clear attempt ${attempt + 1} failed: ${error.message}`,
                );
                if (attempt === maxRetries - 1) {
                  log(
                    `Cache clear failed after ${maxRetries} attempts, continuing anyway`,
                  );
                }
              }
            }
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("Cache cleared");
            break;
          }
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

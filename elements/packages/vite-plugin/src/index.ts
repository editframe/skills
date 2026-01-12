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
      server.middlewares.use(async (req, res, next) => {
        const log = debug("ef:vite-plugin");
        // Forbid relative paths in any request
        if (req.url?.startsWith("/@ef")) {
          forbidRelativePaths(req);
        } else {
          return next();
        }

        console.log(`[ef:vite-plugin] Handling ${req.url} at ${new Date().toISOString()}`);
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
            const indexStartTime = Date.now();
            console.log(`[ef:vite-plugin] Serving track fragment index for ${absolutePath}`);
            log(`Serving track fragment index for ${absolutePath}`);
            generateTrackFragmentIndex(options.cacheRoot, absolutePath)
              .then((taskResult) => {
                const elapsed = Date.now() - indexStartTime;
                console.log(`[ef:vite-plugin] Fragment index generated in ${elapsed}ms: ${taskResult.cachePath}`);
                sendTaskResult(req, res, taskResult);
              })
              .catch((error) => {
                const elapsed = Date.now() - indexStartTime;
                console.error(`[ef:vite-plugin] Error generating fragment index after ${elapsed}ms:`, error);
                next(error);
              });
            break;
          }
          case "@ef-track": {
            const trackStartTime = Date.now();
            console.log(`[ef:vite-plugin] Serving track for ${absolutePath} (cacheRoot: ${options.cacheRoot})`);
            log(`Serving track for ${absolutePath}`);
            generateTrack(options.cacheRoot, absolutePath, req.url)
              .then((taskResult) => {
                const elapsed = Date.now() - trackStartTime;
                console.log(`[ef:vite-plugin] Track generated in ${elapsed}ms: ${taskResult.cachePath}`);
                sendTaskResult(req, res, taskResult);
              })
              .catch((error) => {
                const elapsed = Date.now() - trackStartTime;
                console.error(`[ef:vite-plugin] Error generating track after ${elapsed}ms:`, error);
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

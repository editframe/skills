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

            // Collect request body
            const requestChunks: Buffer[] = [];
            req.on("data", (chunk) => {
              requestChunks.push(chunk);
            });

            req.on("end", async () => {
              try {
                const requestBody = Buffer.concat(requestChunks);

                // Check if we're in CI cache-only mode - if so, proxy through record-replay proxy
                // Otherwise, in local dev with MSW, return mock response directly
                const isCI =
                  Boolean(process.env.GITHUB_ACTIONS) ||
                  Boolean(process.env.CI) ||
                  process.env.DOCKER_SERVICE === "ci-runner";
                const cacheOnlyMode = process.env.EF_CACHE_ONLY === "true";

                if (isCI || cacheOnlyMode) {
                  // In CI/cache-only mode, proxy through record-replay proxy to serve cached responses
                  // Wait for server to be ready if needed
                  if (!server.httpServer?.listening) {
                    await new Promise<void>((resolve) => {
                      if (server.httpServer?.listening) {
                        resolve();
                      } else {
                        server.httpServer?.once("listening", () => resolve());
                      }
                    });
                  }

                  const serverAddress = server.httpServer?.address();
                  const serverPort =
                    (serverAddress &&
                    typeof serverAddress === "object" &&
                    "port" in serverAddress
                      ? serverAddress.port
                      : null) || TEST_SERVER_PORT;
                  const targetUrl = `http://localhost:${serverPort}/api/v1/url-token`;

                  log(`Making internal request to: ${targetUrl}`);

                  const proxyResponse = await fetch(targetUrl, {
                    method: "POST",
                    headers: {
                      "Content-Type":
                        req.headers["content-type"] || "application/json",
                      ...(req.headers.authorization && {
                        authorization: req.headers.authorization,
                      }),
                    },
                    body: requestBody.length > 0 ? requestBody : undefined,
                  });

                  const responseBody = await proxyResponse.text();
                  const responseHeaders: Record<string, string> = {};
                  proxyResponse.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                  });

                  res.writeHead(proxyResponse.status, responseHeaders);
                  res.end(responseBody);

                  if (proxyResponse.ok) {
                    log("✓ URL signing request proxied successfully");
                  } else {
                    log(
                      `✗ URL signing request failed: ${proxyResponse.status} ${proxyResponse.statusText}`,
                    );
                  }
                } else {
                  // In local dev, return mock response directly (MSW can't intercept server-side fetch)
                  // Use the same mock token as MSW handler
                  const mockToken =
                    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJodHRwOi8vd2ViOjMwMDAvaGVhZC1tb292LTQ4MHAubXA0IiwiZXhwIjo5OTk5OTk5OTk5fQ.mock-signature";

                  log("Returning mock token response for local dev");
                  res.writeHead(200, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ token: mockToken }));
                }
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                log(`Error proxying URL signing request: ${errorMessage}`);
                console.error(
                  "[Vite Plugin] URL signing proxy error:",
                  errorMessage,
                );
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    error: "Failed to proxy URL signing request",
                    details: errorMessage,
                  }),
                );
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

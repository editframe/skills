import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TEST_SERVER_PORT } from "./constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "__cache__");
const TARGET_HOST = "host.docker.internal";
const TARGET_PORT = 3000;
// Get worktree domain from environment (set by worktree-config)
const WORKTREE_DOMAIN = process.env.WORKTREE_DOMAIN || "main.localhost";

// Detect CI environment - check multiple indicators
// GITHUB_ACTIONS is set by GitHub Actions, CI is a common CI indicator
// Also check if we're running in ci-runner service (no Traefik)
const isCI =
  Boolean(process.env.GITHUB_ACTIONS) ||
  Boolean(process.env.CI) ||
  process.env.DOCKER_SERVICE === "ci-runner";

// Check if we should run in cache-only mode (for CI/prepare-release)
const CACHE_ONLY_MODE = process.env.EF_CACHE_ONLY === "true";

// Determine the proxy host to use for URL rewriting
// In CI, use localhost:TEST_SERVER_PORT (no Traefik)
// In local dev, use WORKTREE_DOMAIN:4322 (Traefik routing)
function getProxyHost() {
  if (isCI) {
    return `http://localhost:${TEST_SERVER_PORT}`;
  }
  return `http://${WORKTREE_DOMAIN}:4322`;
}

/**
 * Vite plugin that adds record-and-replay proxy middleware
 * This proxy intercepts requests to /api/v1/transcode/*, caches responses to disk,
 * and serves cached responses when the real server is unavailable.
 */
export function recordReplayProxyPlugin() {
  return {
    name: "record-replay-proxy",

    configureServer(server) {
      console.log(
        `[Proxy Plugin] Configuring record-replay proxy middleware... ${CACHE_ONLY_MODE ? "(CACHE-ONLY MODE)" : ""}`,
      );

      // Initialize cache directory
      mkdir(CACHE_DIR, { recursive: true }).catch(console.error);

      // Add middleware to handle /api/v1/transcode/* requests
      server.middlewares.use("/api/v1/transcode", async (req, res, next) => {
        await handleProxyRequest(req, res, next);
      });

      // Add middleware to handle /api/v1/url-token requests (for URL signing)
      server.middlewares.use("/api/v1/url-token", async (req, res, next) => {
        await handleProxyRequest(req, res, next);
      });

      console.log("[Proxy Plugin] Proxy middleware configured");
      console.log(`[Proxy Plugin] Cache directory: ${CACHE_DIR}`);
      if (CACHE_ONLY_MODE) {
        console.log(
          "[Proxy Plugin] ⚠️  Running in CACHE-ONLY mode - no remote fetching",
        );
      }
    },
  };

  // Create cache key from request
  function getCacheKey(method, url, headers) {
    const range = headers.range || "";
    const key = `${method}_${url}_${range}`;
    const hash = crypto.createHash("md5").update(key).digest("hex");
    const sanitized = key.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 100);
    return `${sanitized}_${hash}`; // Returns directory name
  }

  // Serve cached response
  async function serveCachedResponse(res, cacheDir, _req) {
    try {
      const metadataFile = join(cacheDir, "metadata.json");
      const dataFile = join(cacheDir, "data.bin");

      const metadata = JSON.parse(await readFile(metadataFile, "utf-8"));
      let body = await readFile(dataFile);

      // Rewrite URLs in cached JSON/text responses to point back to current proxy
      const responseHeaders = { ...metadata.headers };
      const contentType = responseHeaders["content-type"] || "";
      if (
        contentType.includes("application/json") ||
        contentType.includes("text/")
      ) {
        try {
          const originalHost = `http://${TARGET_HOST}:${TARGET_PORT}`;
          // Determine the correct proxy host to use
          // In CI, use localhost:TEST_SERVER_PORT; in local dev, use Traefik URL
          const proxyHost = getProxyHost();
          const bodyText = body.toString("utf-8");
          // Replace both the original host and localhost:63315 with the proxy host
          let rewrittenText = bodyText.replace(
            new RegExp(
              originalHost.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              "g",
            ),
            proxyHost,
          );
          // Always replace localhost:63315 (cached responses may contain it)
          // Note: Using hardcoded port here for regex matching cached responses
          rewrittenText = rewrittenText.replace(
            /http:\/\/localhost:63315/g,
            proxyHost,
          );
          body = Buffer.from(rewrittenText, "utf-8");

          // Update content-length if it changed
          if (bodyText.length !== rewrittenText.length) {
            responseHeaders["content-length"] = body.length.toString();
          }

          console.log(
            `[Proxy] ✓ Rewrote cached URLs: ${originalHost} → ${proxyHost}`,
          );
        } catch (error) {
          console.warn(
            `[Proxy] Failed to rewrite cached URLs: ${error.message}`,
          );
          // Continue with original body on error
        }
      }

      res.writeHead(metadata.statusCode, responseHeaders);
      res.end(body);
    } catch (error) {
      console.error(
        `[Proxy] Failed to serve cached response: ${error.message}`,
      );
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to read cache" }));
    }
  }

  // Normalize metadata by removing irrelevant dynamic fields
  function normalizeMetadata(metadata) {
    const normalized = { ...metadata };

    // Remove dynamic headers that change on every request but don't affect functionality
    if (normalized.headers) {
      const headers = { ...normalized.headers };
      delete headers.date;
      delete headers["x-total-server-time-ms"];
      delete headers["x-transcode-time-ms"]; // This varies between requests
      delete headers["x-cache"]; // This can vary between HIT/MISS
      normalized.headers = headers;
    }

    // Remove timestamp field since it always changes
    delete normalized.timestamp;

    return normalized;
  }

  // Save response to cache
  async function cacheResponse(
    cacheDir,
    statusCode,
    headers,
    body,
    method,
    url,
    range,
  ) {
    try {
      await mkdir(cacheDir, { recursive: true }); // Create cache directory

      const metadata = {
        statusCode,
        headers,
        url,
        method,
        range: range || null,
        timestamp: new Date().toISOString(),
      };

      // Always write the response to cache - binary content can change even if headers don't
      // Write normalized metadata to disk (without dynamic fields)
      const normalizedMetadata = normalizeMetadata(metadata);

      const metadataFile = join(cacheDir, "metadata.json");
      await writeFile(
        metadataFile,
        JSON.stringify(normalizedMetadata, null, 2),
      );

      const dataFile = join(cacheDir, "data.bin");
      await writeFile(dataFile, body); // Write raw binary data

      console.log("[Proxy] ✓ Cached response");
    } catch (error) {
      console.warn(`[Proxy] Failed to cache: ${error.message}`);
    }
  }

  // Handle proxy request as middleware
  async function handleProxyRequest(req, res, next) {
    // Determine the API path prefix based on the request URL
    // req.url will be like "/transcode/manifest.json" or "/url-token"
    let apiPath;
    if (req.url.startsWith("/transcode")) {
      apiPath = `/api/v1/transcode${req.url}`;
    } else if (req.url.startsWith("/url-token")) {
      apiPath = `/api/v1/url-token${req.url.replace("/url-token", "")}`;
    } else {
      // Fallback: assume transcode if path doesn't match
      apiPath = `/api/v1/transcode${req.url}`;
    }

    const fullPath = apiPath;
    console.log(`[Proxy] → ${req.method} ${fullPath}`);
    if (req.headers.range) {
      console.log(`[Proxy] Range: ${req.headers.range}`);
    }

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Range, Authorization",
    );

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const cacheKey = getCacheKey(req.method, fullPath, req.headers);
    const cacheDir = join(CACHE_DIR, cacheKey);

    // In cache-only mode, try to serve from cache first
    if (CACHE_ONLY_MODE) {
      if (existsSync(cacheDir)) {
        try {
          const metadataFile = join(cacheDir, "metadata.json");
          if (existsSync(metadataFile)) {
            console.log(
              `[Proxy] ✓ CACHE-ONLY: Serving from cache: ${cacheKey}`,
            );
            await serveCachedResponse(res, cacheDir, req);
            return;
          }
        } catch (cacheError) {
          console.error(`[Proxy] Failed to read cache: ${cacheError.message}`);
        }
      }

      console.log(`[Proxy] ✗ CACHE-ONLY: No cache available for ${cacheKey}`);
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Cache-only mode enabled but no cache found",
          cacheKey,
          suggestion: "Run tests locally first to populate cache",
        }),
      );
      return;
    }

    try {
      // Collect request body
      const requestChunks = [];
      req.on("data", (chunk) => {
        requestChunks.push(chunk);
      });

      req.on("end", async () => {
        try {
          const requestBody = Buffer.concat(requestChunks);
          // Use the full path we determined earlier
          const targetUrl = `http://${TARGET_HOST}:${TARGET_PORT}${fullPath}`;

          const fetchOptions = {
            method: req.method,
            headers: req.headers,
            body: requestBody.length > 0 ? requestBody : undefined,
          };

          const response = await fetch(targetUrl, fetchOptions);
          let body = Buffer.from(await response.arrayBuffer());

          const responseHeaders = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          // Rewrite URLs in JSON/text responses to point back to proxy
          const contentType = responseHeaders["content-type"] || "";
          if (
            contentType.includes("application/json") ||
            contentType.includes("text/")
          ) {
            try {
              const originalHost = `http://${TARGET_HOST}:${TARGET_PORT}`;
              // Determine the correct proxy host to use
              // In CI, use localhost:TEST_SERVER_PORT; in local dev, use Traefik URL
              const proxyHost = getProxyHost();
              const bodyText = body.toString("utf-8");
              // Replace both the original host and localhost:63315 with the proxy host
              let rewrittenText = bodyText.replace(
                new RegExp(
                  originalHost.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                  "g",
                ),
                proxyHost,
              );
              // Always replace localhost:63315 (responses may contain it from previous rewrites or cache)
              rewrittenText = rewrittenText.replace(
                /http:\/\/localhost:63315/g,
                proxyHost,
              );
              body = Buffer.from(rewrittenText, "utf-8");

              // Update content-length if it changed
              if (bodyText.length !== rewrittenText.length) {
                responseHeaders["content-length"] = body.length.toString();
              }

              console.log(
                `[Proxy] ✓ Rewrote URLs: ${originalHost} → ${proxyHost}`,
              );
            } catch (error) {
              console.warn(`[Proxy] Failed to rewrite URLs: ${error.message}`);
              // Continue with original body on error
            }
          }

          // If we get a 404, try to serve from cache first
          if (response.status === 404) {
            console.log("[Proxy] ✗ Target server returned 404");
            console.log(`[Proxy] Checking cache: ${cacheKey}`);

            if (existsSync(cacheDir)) {
              try {
                const metadataFile = join(cacheDir, "metadata.json");
                if (existsSync(metadataFile)) {
                  const metadata = JSON.parse(
                    await readFile(metadataFile, "utf-8"),
                  );
                  console.log(
                    `[Proxy] ✓ Serving from cache instead of 404 (${metadata.timestamp})`,
                  );
                  await serveCachedResponse(res, cacheDir, req);
                  return;
                }
              } catch (cacheError) {
                console.error(
                  `[Proxy] Failed to read cache: ${cacheError.message}`,
                );
              }
            }

            console.log("[Proxy] ✗ No cache available, passing through 404");
          }

          res.writeHead(response.status, responseHeaders);
          res.end(body);

          if (response.status >= 200 && response.status < 300) {
            await cacheResponse(
              cacheDir,
              response.status,
              responseHeaders,
              body,
              req.method,
              fullPath,
              req.headers.range,
            );
          }
        } catch (err) {
          console.log(`[Proxy] ✗ Real server failed: ${err.message}`);
          console.log(`[Proxy] Checking cache: ${cacheKey}`);

          if (existsSync(cacheDir)) {
            try {
              const metadataFile = join(cacheDir, "metadata.json");
              if (existsSync(metadataFile)) {
                const metadata = JSON.parse(
                  await readFile(metadataFile, "utf-8"),
                );
                console.log(
                  `[Proxy] ✓ Serving from cache (${metadata.timestamp})`,
                );
                await serveCachedResponse(res, cacheDir, req);
                return;
              }
            } catch (cacheError) {
              console.error(
                `[Proxy] Failed to read cache: ${cacheError.message}`,
              );
            }
          }

          console.log("[Proxy] ✗ No cache available, failing request");
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Server unavailable and no cache found",
              cacheKey,
              originalError: err.message,
            }),
          );
        }
      });
    } catch (error) {
      console.error(`[Proxy] Middleware error: ${error.message}`);
      next();
    }
  }
}

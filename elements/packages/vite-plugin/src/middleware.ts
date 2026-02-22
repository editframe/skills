import { rm } from "node:fs/promises";
import path, { join } from "node:path";
import type { ServerResponse } from "node:http";
import type { IncomingMessage, NextFunction } from "connect";
import debug from "debug";

import { forbidRelativePaths } from "./forbidRelativePaths.js";
import { sendTaskResult } from "./sendTaskResult.js";

type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: NextFunction,
) => void;

interface PluginOptions {
  root: string;
  cacheRoot: string;
}

interface AssetsDeps {
  cacheImage: (cacheRoot: string, src: string) => Promise<any>;
  findOrCreateCaptions: (cacheRoot: string, src: string) => Promise<any>;
}

interface FilesDeps {
  generateTrack: (
    cacheRoot: string,
    src: string,
    trackUrl: string,
  ) => Promise<any>;
  generateScrubTrack: (cacheRoot: string, src: string) => Promise<any>;
  generateTrackFragmentIndex: (
    cacheRoot: string,
    src: string,
  ) => Promise<any>;
  md5FilePath: (src: string) => Promise<string>;
}

export function createAssetsApiMiddleware(
  options: PluginOptions,
  deps: AssetsDeps,
): Middleware {
  const { cacheImage, findOrCreateCaptions } = deps;
  return async (req, res, next) => {
    const log = debug("ef:vite-plugin:assets");
    const reqUrl = req.url || "";

    if (!reqUrl.startsWith("/api/v1/assets/")) {
      return next();
    }

    forbidRelativePaths(req);

    const url = new URL(reqUrl, `http://${req.headers.host}`);
    const urlPath = url.pathname;
    const src = url.searchParams.get("src");

    if (!src) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "src parameter is required" }));
      return;
    }

    const isRemote = src.startsWith("http://") || src.startsWith("https://");
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
            response.headers.get("content-type") ?? "application/octet-stream";
          const buffer = await response.arrayBuffer();
          res.writeHead(200, { "Content-Type": contentType });
          res.end(Buffer.from(buffer));
        } else {
          const taskResult = await cacheImage(options.cacheRoot, absolutePath);
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
  };
}

export function createLocalFilesApiMiddleware(
  options: PluginOptions,
  deps: FilesDeps,
): Middleware {
  const { generateTrack, generateScrubTrack, generateTrackFragmentIndex, md5FilePath } =
    deps;
  return async (req, res, next) => {
    const log = debug("ef:vite-plugin:files");
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

    forbidRelativePaths(req);

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
          res.end(JSON.stringify({ error: "trackId parameter is required" }));
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
  };
}

export async function handleClearCache(
  req: IncomingMessage,
  res: ServerResponse,
  cacheRoot: string,
): Promise<void> {
  const log = debug("ef:vite-plugin");
  if (req.method !== "DELETE") {
    res.writeHead(405, { Allow: "DELETE" });
    res.end();
    return;
  }
  log(`Clearing cache for ${cacheRoot}`);
  const cachePath = join(cacheRoot, ".cache");
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await rm(cachePath, { recursive: true, force: true });
      break;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        break;
      }
      if (error.code === "ENOTEMPTY" && attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * (attempt + 1)),
        );
        continue;
      }
      log(
        `Warning: Cache clear attempt ${attempt + 1} failed: ${error.message}`,
      );
      if (attempt === maxRetries - 1) {
        log(`Cache clear failed after ${maxRetries} attempts, continuing anyway`);
      }
    }
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Cache cleared");
}

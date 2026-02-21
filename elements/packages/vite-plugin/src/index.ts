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

import { createJitTranscodeMiddleware } from "./jitTranscodeMiddleware.js";
import {
  createAssetsApiMiddleware,
  createLocalFilesApiMiddleware,
  handleClearCache,
} from "./middleware.js";
import { forbidRelativePaths } from "./forbidRelativePaths.js";

interface VitePluginEditframeOptions {
  root: string;
  cacheRoot: string;
}

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
      server.middlewares.use(
        createJitTranscodeMiddleware(
          { ...options, handleRemoteUrls: true },
          { generateTrack, generateScrubTrack, generateTrackFragmentIndex },
        ),
      );

      server.middlewares.use(
        createAssetsApiMiddleware(options, { cacheImage, findOrCreateCaptions }),
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

        log(`Handling ${req.url} at ${new Date().toISOString()}`);

        const cacheRoot = options.cacheRoot.replace("dist/", "src/");
        const efPrefix = req.url.split("/")[1];

        switch (efPrefix) {
          case "@ef-clear-cache": {
            await handleClearCache(req, res, cacheRoot);
            break;
          }
          case "@ef-sign-url": {
            if (req.method !== "POST") {
              res.writeHead(405, { Allow: "POST" });
              res.end();
              break;
            }

            log("Signing URL token");

            let body = "";
            req.on("data", (chunk) => {
              body += chunk.toString();
            });

            req.on("end", async () => {
              try {
                const payload = JSON.parse(body);
                log("Token signing request payload:", payload);

                const { url, params } = payload;
                if (!url) {
                  res.writeHead(400, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ error: "URL is required" }));
                  return;
                }

                const client = getEditframeClient();

                let fullUrl = url;
                if (params) {
                  const urlObj = new URL(url);
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
                res.end(
                  JSON.stringify({ error: "Failed to sign URL token" }),
                );
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

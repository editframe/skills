import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path, { basename, join } from "node:path";
import { PassThrough } from "node:stream";
import { inspect } from "node:util";
import { createRender, uploadRender } from "@editframe/api";
import { md5Directory, md5FilePath } from "@editframe/assets";
import { getRenderInfo, RenderInfo } from "@editframe/elements/node";
import { Option, program } from "commander";
import debug from "debug";
import { parse as parseHTML } from "node-html-parser";
import * as tar from "tar";
import { processRenderInfo } from "../operations/processRenderInfo.js";
import { SyncStatus } from "../operations/syncAssetsDirectory/SyncStatus.js";
import { syncAssetDirectory } from "../operations/syncAssetsDirectory.js";
import { createReadableStreamFromReadable } from "../utils/createReadableStreamFromReadable.js";
import { getClient } from "../utils/index.js";
import { launchBrowserAndWaitForSDK } from "../utils/launchBrowserAndWaitForSDK.js";
import { PreviewServer } from "../utils/startPreviewServer.js";
import { validateVideoResolution } from "../utils/validateVideoResolution.js";
import { withSpinner } from "../utils/withSpinner.js";

const log = debug("ef:cli:render");

export const buildAssetId = async (
  srcDir: string,
  src: string,
  basename: string,
) => {
  log(`Building image asset id for ${src}\n`);
  const assetPath = path.join(srcDir, src);
  const assetMd5 = await md5FilePath(assetPath);
  const syncStatus = new SyncStatus(
    join(srcDir, "assets", ".cache", assetMd5, basename),
  );
  const info = await syncStatus.readInfo();
  if (!info) {
    throw new Error(`SyncStatus info is not found for ${syncStatus.infoPath}`);
  }

  return info.id;
};

program
  .command("cloud-render [directory]")
  .description(
    "Render a directory's index.html file as a video in the editframe cloud",
  )
  .addOption(
    new Option("-s, --strategy <strategy>", "Render strategy")
      .choices(["v1"])
      .default("v1"),
  )
  .action(async (directory, options) => {
    directory ??= ".";

    await syncAssetDirectory(
      join(process.cwd(), directory, "src", "assets", ".cache"),
    );

    const srcDir = path.join(directory, "src");
    const distDir = path.join(directory, "dist");
    await withSpinner("Building\n", async () => {
      try {
        await withSpinner("Building\n", async () => {
          spawnSync(
            "npx",
            // biome-ignore format: Grouping CLI arguments
            [
              "vite",
              "build",
              directory,
              "--clearScreen",
              "false",
              "--logLevel",
              "debug",
            ],
            {
              stdio: "inherit",
            },
          );
        });
      } catch (error) {
        console.error("Build failed:", error);
      }
    });

    const previewServer = await PreviewServer.start(distDir);
    process.stderr.write("Preview server started at:");
    process.stderr.write(previewServer.url);
    process.stderr.write("\n");
    await launchBrowserAndWaitForSDK(
      {
        url: previewServer.url,
        efInteractive: false,
        interactive: false,
        headless: true,
      },
      async (page) => {
        const renderInfo = RenderInfo.parse(await page.evaluate(getRenderInfo));

        validateVideoResolution({
          width: renderInfo.width,
          height: renderInfo.height,
        });

        await processRenderInfo(renderInfo);

        const doc = parseHTML(
          await readFile(path.join(distDir, "index.html"), "utf-8"),
        );

        log("Building asset IDs");
        for (const element of doc.querySelectorAll(
          "ef-image, ef-audio, ef-video",
        )) {
          log(`Processing ${element.tagName}`);
          if (element.hasAttribute("asset-id")) {
            log(
              `Asset ID for ${element.tagName} ${element.getAttribute("src")} is ${element.getAttribute("asset-id")}`,
            );
            continue;
          }
          const src = element.getAttribute("src");
          if (!src) {
            log(`No src attribute for ${element.tagName}`);
            continue;
          }

          switch (element.tagName) {
            case "EF-IMAGE":
              element.setAttribute(
                "asset-id",
                await buildAssetId(srcDir, src, basename(src)),
              );
              break;
            case "EF-AUDIO":
            case "EF-VIDEO":
              element.setAttribute(
                "asset-id",
                await buildAssetId(srcDir, src, "isobmff"),
              );
              break;
            default:
              log(`Unknown element type: ${element.tagName}`);
          }
        }

        await writeFile(path.join(distDir, "index.html"), doc.toString());

        const md5 = await md5Directory(distDir);
        const render = await createRender(getClient(), {
          md5,
          width: renderInfo.width,
          height: renderInfo.height,
          fps: renderInfo.fps,
          duration_ms: renderInfo.durationMs,
          work_slice_ms: 4_000,
          strategy: options.strategy,
        });
        if (render?.status !== "created") {
          process.stderr.write(
            `Render is in '${render?.status}' status. It cannot be recreated while in this status.\n`,
          );
          return;
        }
        /**
         * This tar stream is created with the dist directory as the root.
         * This is acheived by setting the cwd option to the dist directory.
         * And the files to be included in the tar stream are all files in the dist directory.
         *
         * The renderer expects to find the index.html file at the root of the tar stream.
         */
        const tarStream = tar.create(
          {
            gzip: true,
            cwd: distDir,
          },
          ["."],
        );
        const readable = new PassThrough();
        tarStream.pipe(readable);

        await uploadRender(
          getClient(),
          render.id,
          createReadableStreamFromReadable(readable),
        );
        process.stderr.write("Render assets uploaded\n");
        process.stderr.write(inspect(render));
        process.stderr.write("\n");
      },
    );
  });

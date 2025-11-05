import { spawnSync } from "node:child_process";
import path from "node:path";
import { getRenderInfo } from "@editframe/elements";
import { program } from "commander";
import { processRenderInfo } from "../operations/processRenderInfo.js";
import { launchBrowserAndWaitForSDK } from "../utils/launchBrowserAndWaitForSDK.js";
import { PreviewServer } from "../utils/startPreviewServer.js";
import { withSpinner } from "../utils/withSpinner.js";

program
  .command("process [directory]")
  .description(
    "Process's a directory's index.html file, analyzing assets and processing them for rendering",
  )
  .action(async (directory) => {
    directory ??= ".";

    const distDir = path.join(directory, "dist");
    await withSpinner("Building\n", async () => {
      spawnSync("npx", ["vite", "build", directory], {
        stdio: "inherit",
      });
    });

    const previewServer = await PreviewServer.start(distDir);
    process.stderr.write("Preview server started at ");
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
        const renderInfo = await page.evaluate(getRenderInfo);
        await processRenderInfo(renderInfo);
      },
    );
  });

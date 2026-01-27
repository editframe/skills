import { spawnSync } from "node:child_process";
import path from "node:path";
import { getRenderInfo } from "@editframe/elements/node";
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

    // If running from the dev script (via tsx), ORIGINAL_CWD contains the user's actual directory
    const baseCwd = process.env.ORIGINAL_CWD || process.cwd();
    const resolvedDirectory = path.resolve(baseCwd, directory);
    
    const distDir = path.join(resolvedDirectory, "dist");
    await withSpinner("Building\n", async () => {
      spawnSync("npx", ["vite", "build", resolvedDirectory], {
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

import path, { join } from "node:path";
import { program } from "commander";
import { syncAssetDirectory } from "../operations/syncAssetsDirectory.js";

program
  .command("sync")
  .description("Sync assets to Editframe servers for rendering")
  .argument("[directory]", "Path to project directory to sync.")
  .action(async (directory = ".") => {
    // If running from the dev script (via tsx), ORIGINAL_CWD contains the user's actual directory
    const baseCwd = process.env.ORIGINAL_CWD || process.cwd();
    const resolvedDirectory = path.resolve(baseCwd, directory);

    await syncAssetDirectory(
      join(resolvedDirectory, "src", "assets", ".cache"),
    );
  });

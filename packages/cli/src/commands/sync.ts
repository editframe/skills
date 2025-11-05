import { join } from "node:path";
import { program } from "commander";
import { syncAssetDirectory } from "../operations/syncAssetsDirectory.js";

program
  .command("sync")
  .description("Sync assets to Editframe servers for rendering")
  .argument("[directory]", "Path to project directory to sync.")
  .action(async (directory = ".") => {
    await syncAssetDirectory(
      join(process.cwd(), directory, "src", "assets", ".cache"),
    );
  });

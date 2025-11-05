import fs from "node:fs/promises";
import path from "node:path";
import { doAssetSync } from "./syncAssetsDirectory/doAssetSync.js";
import { getAssetSync } from "./syncAssetsDirectory/SubAssetSync.js";

export const syncAssetDirectory = async (
  /**
   * Project directory will be used as the base to find an assets directory.
   * Assets will be synced from `<projectDirectory>/src/assets`
   */
  cacheDir: string,
) => {
  const stat = await fs.stat(cacheDir).catch((error) => {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  });

  if (!stat?.isDirectory()) {
    console.error(`No assets cache directory found at ${cacheDir}`);
    return;
  }
  const assets = await fs.readdir(cacheDir);

  process.stderr.write(`Syncing asset dir: ${cacheDir}\n`);

  const errors: Record<string, string[]> = {};

  const reportError = (path: string, message: string) => {
    errors[path] ||= [];
    errors[path].push(message);
    process.stderr.write(` 🚫 ${message}\n`);
  };

  const reportSuccess = (_path: string, message: string) => {
    process.stderr.write(` ✅ ${message}\n`);
  };

  const reportInfo = (_path: string, message: string) => {
    process.stderr.write(` ${message}\n`);
  };

  for (const assetMd5 of assets) {
    reportInfo(assetMd5, `Syncing asset: ${assetMd5}`);
    const assetDir = path.join(cacheDir, assetMd5);
    const stat = await fs.stat(assetDir);
    if (!stat.isDirectory()) {
      reportError(assetMd5, "Invalid asset. Did not find asset directory.");
      return;
    }
    const subAssets = await fs.readdir(assetDir);

    for (const subAsset of subAssets) {
      if (subAsset.endsWith(".info")) {
        // skip .info files, they are not assets
        continue;
      }
      const subAssetPath = path.join(assetDir, subAsset);

      try {
        const assetSync = getAssetSync(subAssetPath, assetMd5);
        for await (const { status, message } of doAssetSync(assetSync)) {
          if (status === "success") {
            reportSuccess(subAsset, message);
          } else if (status === "info") {
            reportInfo(subAsset, message);
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          reportError(subAsset, error.message);
        } else {
          reportError(subAsset, "Unknown error");
        }
      }
    }
  }

  if (Object.keys(errors).length) {
    process.stderr.write("\n\n❌ Encountered errors while syncing assets:\n");
    for (const [asset, messages] of Object.entries(errors)) {
      process.stderr.write(`\n🚫 ${asset}\n`);
      for (const message of messages) {
        process.stderr.write(`  - ${message}\n`);
      }
    }

    throw new Error("Failed to sync assets");
  }
};

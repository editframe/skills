import type { SubAssetSync } from "./SubAssetSync.js";

export const doAssetSync = async function* (
  assetSync: SubAssetSync<unknown>,
): AsyncGenerator<{
  status: "info" | "success";
  message: string;
}> {
  if (await assetSync.syncStatus.isSynced()) {
    yield {
      status: "info",
      message: `Sub-asset has already been synced: ${assetSync.path}`,
    };
    return;
  }

  try {
    await assetSync.prepare();
    await assetSync.validate();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    throw new Error(`Error validating ${assetSync.label}: ${message}`);
  }

  yield {
    status: "info",
    message: `${assetSync.icon}  Syncing ${assetSync.label}: ${assetSync.path}`,
  };

  try {
    await assetSync.create();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    throw new Error(`Error creating ${assetSync.label}: ${message}`);
  }

  if (!assetSync.isComplete()) {
    try {
      await assetSync.upload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      throw new Error(`Error uploading ${assetSync.label}: ${message}`);
    }
  }

  try {
    await assetSync.markSynced();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    throw new Error(`Error marking ${assetSync.label} as synced: ${message}`);
  }

  yield {
    status: "success",
    message: `Synced ${assetSync.label}: ${assetSync.path}`,
  };
  return;
};

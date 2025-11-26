import { logger } from "@/logging";
import { Worker } from "@/queues/Worker";
import { valkey } from "@/valkey/valkey";
import { checkoutRenderSource } from "./source/checkoutRenderSource";
import { RenderFragmentQueue } from "./RenderFragmentQueue";
import { ElectronRPCManager } from "./shared/ElectronRPCManager";
import {
  renderFragmentFilePath,
  renderAssetsMetadataFilePath,
} from "@/util/filePaths";
import { storageProvider } from "@/util/storageProvider.server";
import type { AssetsMetadataBundle } from "./shared/assetMetadata";
import { ProgressTracker } from "@/progress-tracking/ProgressTracker";

export const RenderFragmentWorker = new Worker({
  storage: valkey,
  queue: RenderFragmentQueue,
  close: async () => {
    await ElectronRPCManager.closeRPCClient();
  },
  execute: async ({ payload: { render, fragment } }) => {
    await using renderSource = await checkoutRenderSource(
      render.id,
      render.org_id,
    );

    if (
      render.width === null ||
      render.height === null ||
      render.duration_ms === null ||
      render.fps === null
    ) {
      throw new Error("Render info is missing required fields");
    }

    // Load assets metadata bundle created by RenderInitializer
    logger.debug("Loading assets metadata bundle");
    const metadataFilePath = renderAssetsMetadataFilePath({
      org_id: render.org_id,
      id: render.id,
    });

    const metadataBuffer = await storageProvider.readFile(metadataFilePath);
    const assetsBundle: AssetsMetadataBundle = JSON.parse(
      metadataBuffer.toString("utf-8"),
    );

    logger.debug(
      {
        fragmentIndexCount: Object.keys(assetsBundle.fragmentIndexes).length,
      },
      "Loaded assets metadata bundle",
    );

    logger.debug("Executing job via Electron controller");

    const segmentIndex =
      fragment.segment_id === "init"
        ? "init"
        : Number.parseInt(fragment.segment_id, 10);
    const fps = Number.parseInt(render.fps, 10);

    // Use electronRPC to process fragment in Electron subprocess
    const electronRpc = await ElectronRPCManager.getRPCClient();
    const fragmentBytes = await electronRpc.rpc.call("renderFragment", {
      width: render.width,
      height: render.height,
      location: `file://${renderSource.indexPath}`,
      orgId: render.org_id,
      renderId: render.id,
      segmentDurationMs: render.work_slice_ms,
      segmentIndex,
      durationMs: render.duration_ms,
      fps,
      fileType: "fragment",
      assetsBundle, // Pass the bundle to the render context
    });

    const fragmentPath = renderFragmentFilePath({
      org_id: render.org_id,
      id: render.id,
      segmentId: segmentIndex,
      fileType: "fragment",
    });

    console.log(`Writing ${fragmentBytes.byteLength} bytes to ${fragmentPath}`);

    await storageProvider.writeFile(fragmentPath, Buffer.from(fragmentBytes));

    const progressTracker = new ProgressTracker(`render:${render.id}`);
    progressTracker.incrementCompletion(1);
  },
});

import { OutputConfiguration } from "@editframe/api";

import { logger } from "@/logging";
import { valkey } from "@/valkey/valkey";
import { db } from "@/sql-client.server";
import { Worker } from "../../Worker";
import { RenderWorkflow } from "./Workflow";
import { checkoutRenderSource } from "./source/checkoutRenderSource";
import {
  createFragmentJobs,
  setupProgressTracking,
} from "./shared/renderInitializationOps";
import { RenderInitializerQueue } from "./RenderInitializerQueue";
import { ElectronRPCManager } from "./shared/ElectronRPCManager";
import { createAssetsMetadataBundle } from "./shared/assetMetadata";
import { renderAssetsMetadataFilePath, renderStillFilePath } from "@/util/filePaths";
import { storageProvider } from "@/util/storageProvider.server";

export const RenderInitializerWorker = new Worker({
  storage: valkey,
  queue: RenderInitializerQueue,
  close: async () => {
    await ElectronRPCManager.closeRPCClient();
  },
  execute: async ({ payload: render }) => {
    logger.debug("Checking out render source");
    await using renderSource = await checkoutRenderSource(
      render.id,
      render.org_id,
    );

    logger.debug("Executing initializer via Electron controller");
    const electronRpc = await ElectronRPCManager.getRPCClient();
    const renderInfo = await electronRpc.rpc.call('getRenderInfo', {
      location: `file://${renderSource.indexPath}`,
      orgId: render.org_id,
    });

    logger.debug({ renderInfo }, "Setting render info");
    const updatedRender = {
      ...render,
      height: render.height ?? renderInfo.height,
      width: render.width ?? renderInfo.width,
      duration_ms: render.duration_ms ?? renderInfo.durationMs,
      fps: renderInfo.fps,
    };

    // Create fragment index bundle for parallel workers
    logger.debug("Creating fragment index bundle");
    const assetsMetadata = await createAssetsMetadataBundle(renderInfo.assets, render.org_id);
    const metadataFilePath = renderAssetsMetadataFilePath({
      org_id: render.org_id,
      id: render.id
    });

    await storageProvider.writeFile(
      metadataFilePath,
      Buffer.from(JSON.stringify(assetsMetadata, null, 2)),
      { contentType: 'application/json' }
    );

    logger.debug({
      metadataFilePath,
      fragmentIndexCount: Object.keys(assetsMetadata.fragmentIndexes).length
    }, "Created fragment index bundle");

    logger.debug({ render: updatedRender }, "Updating render info");
    await db
      .updateTable("video2.renders")
      .set({
        width: updatedRender.width,
        height: updatedRender.height,
        duration_ms: updatedRender.duration_ms,
        fps: updatedRender.fps,
      })
      .where("id", "=", render.id)
      .executeTakeFirstOrThrow();

    RenderWorkflow.setWorkflowData(render.id, updatedRender);

    const outputConfig = OutputConfiguration.parse(render.output_config);

    if (outputConfig.isStill) {
      logger.debug("Rendering still image via Electron controller");

      const imageBuffer = await electronRpc.rpc.call('renderStill', {
        width: updatedRender.width,
        height: updatedRender.height,
        location: `file://${renderSource.indexPath}`,
        orgId: render.org_id,
        renderId: render.id,
        durationMs: updatedRender.duration_ms,
        fps: Number(render.fps),
        outputConfig: render.output_config,
        assetsBundle: assetsMetadata,
      });

      const outputPath = renderStillFilePath({
        org_id: render.org_id,
        id: render.id,
        fileType: outputConfig.fileExtension,
      });

      logger.debug({ outputPath }, "Writing still to storage");
      await storageProvider.writeFile(outputPath, Buffer.from(imageBuffer), {
        metadata: {
          contentType: outputConfig.contentType,
        },
      });

      return;
    }

    const jobs = createFragmentJobs(updatedRender);
    setupProgressTracking(render.id, jobs.length);
    RenderWorkflow.enqueueJobs(...jobs);
  },
});

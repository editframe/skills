import type { Selectable } from "kysely";
import type { OutputConfiguration } from "@editframe/api";

import { logger } from "@/logging";
import { ProgressTracker } from "@/progress-tracking/ProgressTracker";
import type { EnqueableJob } from "@/queues/Job";
import { db } from "@/sql-client.server";
import type {
  Video2RenderFragments,
  Video2Renders,
} from "@/sql-client.server/kysely-codegen";
import { createVideoRenderOptionsForSegment } from "@/render/createRenderOptionsForSegment";
import { StillEncoder } from "@/render/StillEncoder";
import { storageProvider } from "@/util/storageProvider.server";
import { renderStillFilePath } from "@/util/filePaths";
import type { RenderEngineContext } from "./renderEngineTypes";
import { RenderFragmentQueue } from "../RenderFragmentQueue";
import { extractFragmentCompletionInfo } from "../fragments/extractFragmentCompletionInfo";
import type { QueuePayload } from "../../../Queue";

interface RenderInfo {
  width: number;
  height: number;
  durationMs: number;
  fps: number;
}

interface RenderContext {
  render: Selectable<Video2Renders>;
  context: RenderEngineContext;
}

interface UpdatedRender extends Selectable<Video2Renders> {
  width: number;
  height: number;
  duration_ms: number;
}

// IMPLEMENTATION GUIDELINES: Separate render info extraction from database operations
// This makes the logic easier to test and understand
export const extractAndUpdateRenderInfo = async (
  render: Selectable<Video2Renders>,
  context: RenderEngineContext
): Promise<UpdatedRender> => {
  logger.debug("Getting render info");
  const renderInfo = await context.getRenderInfo();

  logger.debug({ renderInfo }, "Setting render info");
  const updatedRender = {
    ...render,
    height: render.height ?? renderInfo.height,
    width: render.width ?? renderInfo.width,
    duration_ms: render.duration_ms ?? renderInfo.durationMs,
    fps: renderInfo.fps,
  };

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

  return updatedRender;
};

// IMPLEMENTATION GUIDELINES: Isolate still image rendering as a separate concern
// This keeps the initialization logic focused on its primary responsibility
export const processStillRender = async (
  renderContext: RenderContext,
  outputConfig: OutputConfiguration
): Promise<void> => {
  const { render, context } = renderContext;

  await context.resize(render.width!, render.height!);
  const abortController = new AbortController();

  const renderOptions = createVideoRenderOptionsForSegment({
    segmentDurationMs: render.work_slice_ms!,
    segmentIndex: 1,
    width: render.width!,
    height: render.height!,
    durationMs: render.duration_ms!,
    fps: Number(render.fps),
    strategy: "v1",
  });

  renderOptions.showFrameBox = false;

  const stillEncoder = new StillEncoder({
    renderId: render.id,
    outputConfig,
    engine: context,
    renderOptions,
    abortSignal: abortController.signal,
  });

  const image = await stillEncoder.encode();
  const outputPath = renderStillFilePath({
    org_id: render.org_id,
    id: render.id,
    fileType: outputConfig.fileExtension,
  });

  logger.debug({ outputPath }, "Writing still to storage");
  await storageProvider.writeFile(outputPath, image, {
    metadata: {
      contentType: outputConfig.contentType,
    },
  });
};

// IMPLEMENTATION GUIDELINES: Extract job creation logic to improve readability
// This separates the complex fragment job creation from initialization logic
export const createFragmentJobs = (
  updatedRender: UpdatedRender
): EnqueableJob<any>[] => {
  const { allFragmentIds, completeFragmentIds } =
    extractFragmentCompletionInfo(
      {
        duration_ms: updatedRender.duration_ms,
        work_slice_ms: updatedRender.work_slice_ms!,
      },
      [] as Selectable<Video2RenderFragments>[],
    );

  const jobs: EnqueableJob<any>[] = [];

  for (const fragmentId of allFragmentIds) {
    if (completeFragmentIds.has(fragmentId)) {
      continue;
    }

    jobs.push({
      queue: RenderFragmentQueue.name,
      orgId: updatedRender.org_id,
      workflowId: updatedRender.id,
      jobId: `${updatedRender.id}-${fragmentId}`,
      payload: {
        render: updatedRender,
        fragment: {
          completed_at: null,
          failed_at: null,
          started_at: new Date(),
          attempt_number: 0,
          last_error: null,
          render_id: updatedRender.id,
          segment_id: fragmentId,
        } satisfies Selectable<Video2RenderFragments>,
      } satisfies QueuePayload<typeof RenderFragmentQueue>,
    });
  }

  return jobs;
};

export const setupProgressTracking = (
  renderId: string,
  jobCount: number
): void => {
  const progressTracker = new ProgressTracker(`render:${renderId}`);
  progressTracker.writeSize(jobCount);
}; 
import { OutputConfiguration } from "@editframe/api";
import type { Selectable } from "kysely";

import { Queue } from "@/queues/Queue";
import { Worker } from "@/queues/Worker";
import { ConnectionURLMap } from "@/queues/WorkerConnection";
import type { Video2Renders } from "@/sql-client.server/kysely-codegen";
import { envInt, envString } from "@/util/env";
import {
  renderFinalFilePath,
  renderFragmentComposePrefixPath,
  renderFragmentFilePath,
} from "@/util/filePaths";
import { storageProvider } from "@/util/storageProvider.server";
import { valkey } from "@/valkey/valkey";
import { buildFragmentIds } from "./fragments/buildFragmentIds";

const QUEUE_URL = envString(
  "RENDER_FINALIZER_WEBSOCKET_HOST",
  "ws://localhost:3000",
);
const MAX_WORKER_COUNT = envInt("RENDER_FINALIZER_MAX_WORKER_COUNT", 1);
const WORKER_CONCURRENCY = envInt("RENDER_FINALIZER_WORKER_CONCURRENCY", 1);

export const RenderFinalizerQueue = new Queue<Selectable<Video2Renders>>({
  name: "render-finalizer",
  storage: valkey,
  maxWorkerCount: MAX_WORKER_COUNT,
  workerConcurrency: WORKER_CONCURRENCY,
  processCompletions: async (messages, db) => {
    await db
      .updateTable("video2.renders")
      .set({
        status: "complete",
        completed_at: new Date(),
      })
      .where(
        "id",
        "in",
        messages.map((m) => m.workflowId),
      )
      .execute();
  },
});
ConnectionURLMap.set(RenderFinalizerQueue, QUEUE_URL);

export const RenderFinalizerWorker = new Worker({
  storage: valkey,
  queue: RenderFinalizerQueue,
  execute: async ({ payload: render }) => {
    const outputConfig = OutputConfiguration.parse(render.output_config);
    const isStill =
      outputConfig.container === "jpeg" ||
      outputConfig.container === "png" ||
      outputConfig.container === "webp";

    if (isStill) {
      console.log("is still. Skipping finalizer", render.id);
      return;
    }

    const { duration_ms, work_slice_ms } = render;
    if (duration_ms === null || work_slice_ms === null) {
      throw new Error("Render has no duration or work slice (in finalizer)");
    }

    const allFragmentIds = buildFragmentIds({
      duration_ms: duration_ms,
      work_slice_ms: work_slice_ms,
    });

    console.log("merging fragment paths", allFragmentIds);

    await storageProvider.mergePaths(
      allFragmentIds.map((fragmentId) => {
        return renderFragmentFilePath({
          org_id: render.org_id,
          id: render.id,
          segmentId: fragmentId,
        });
      }),
      renderFragmentComposePrefixPath({
        org_id: render.org_id,
        id: render.id,
      }),
      renderFinalFilePath({
        org_id: render.org_id,
        id: render.id,
      }),
    );
  },
});

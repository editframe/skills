import type { Selectable } from "kysely";

import { ConnectionURLMap } from "@/queues/WorkerConnection";
import { envInt, envString } from "@/util/env";
import { valkey } from "@/valkey/valkey";
import { Queue } from "../../Queue";
import type { Video2Renders } from "@/sql-client.server/kysely-codegen";

const QUEUE_URL = envString(
  "RENDER_INITIALIZER_WEBSOCKET_HOST",
  "ws://localhost:3000",
);
const MAX_WORKER_COUNT = envInt("RENDER_INITIALIZER_MAX_WORKER_COUNT", 1);
const WORKER_CONCURRENCY = envInt("RENDER_INITIALIZER_WORKER_CONCURRENCY", 1);

export const RenderInitializerQueue = new Queue<Selectable<Video2Renders>>({
  name: "render-initializer",
  storage: valkey,
  maxWorkerCount: MAX_WORKER_COUNT,
  workerConcurrency: WORKER_CONCURRENCY,

  processStarts: async (messages, db) => {
    await db
      .updateTable("video2.renders")
      .set({
        started_at: new Date(),
        status: "rendering",
      })
      .where(
        "id",
        "in",
        messages.map((m) => m.workflowId),
      )
      .execute();
  },
});

ConnectionURLMap.set(RenderInitializerQueue, QUEUE_URL);

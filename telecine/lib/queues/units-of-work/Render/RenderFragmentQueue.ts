import type { Selectable } from "kysely";

import { Queue } from "@/queues/Queue";
import { ConnectionURLMap } from "@/queues/WorkerConnection";
import type {
  Video2RenderFragments,
  Video2Renders,
} from "@/sql-client.server/kysely-codegen";
import { envInt, envString } from "@/util/env";
import { valkey } from "@/valkey/valkey";

const QUEUE_URL = envString(
  "RENDER_FRAGMENT_WEBSOCKET_HOST",
  "ws://localhost:3000",
);
const MAX_WORKER_COUNT = envInt("RENDER_FRAGMENT_MAX_WORKER_COUNT", 1);
const WORKER_CONCURRENCY = envInt("RENDER_FRAGMENT_WORKER_CONCURRENCY", 1);

export const RenderFragmentQueue = new Queue<{
  render: Selectable<Video2Renders>;
  fragment: Selectable<Video2RenderFragments>;
}>({
  name: "render-fragment",
  storage: valkey,
  maxWorkerCount: MAX_WORKER_COUNT,
  workerConcurrency: WORKER_CONCURRENCY,
});

ConnectionURLMap.set(RenderFragmentQueue, QUEUE_URL);

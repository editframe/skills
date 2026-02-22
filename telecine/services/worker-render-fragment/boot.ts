import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-render-fragment" });

import { createWebSocketWorkerServer } from "@/queues/createWebSocketWorkerServer";
import { RenderFragmentWorker } from "@/queues/units-of-work/Render/RenderFragment";
import type { Server } from "node:http";

// Workflow MUST be registered
import "@/queues/units-of-work/Render/Workflow";

export const init = (server: Server) => {
  createWebSocketWorkerServer(RenderFragmentWorker, server);
};

import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "maintenance" });

import { logger } from "@/logging";
import { createEagerBootServer } from "@/http/createEagerBootServer";
import { valkey } from "@/valkey/valkey";
import { abortableLoopWithBackoff, RequestSleep } from "@/queues/AbortableLoop";
import type { AbortableLoop } from "@/queues/AbortableLoop";
import { drainLifecycleList } from "@/queues/lifecycle/drainLifecycleList";

// Register all queues and workflows so Queue.byName / Workflow.byName are populated
import "@/queues/units-of-work/Render/RenderInitializerQueue";
import "@/queues/units-of-work/Render/RenderFragmentQueue";
import "@/queues/units-of-work/Render/Finalizer";
import "@/queues/units-of-work/Render/Workflow";
import "@/queues/units-of-work/ProcessHtml/Initializer";
import "@/queues/units-of-work/ProcessHtml/Finalizer";
import "@/queues/units-of-work/ProcessHtml/Workflow";
import "@/queues/units-of-work/ProcessIsobmff";
import "@/queues/units-of-work/IngestImage";

const loops: AbortableLoop[] = [];

function startLifecycleWriter() {
  const loop = abortableLoopWithBackoff({
    spanName: "maintenance.lifecycleWriter",
    backoffMs: 250,
    fn: async () => {
      const drained = await drainLifecycleList(valkey, 500);
      if (drained === 0) return RequestSleep;
    },
  });
  loops.push(loop);
}

createEagerBootServer({
  serviceName: "maintenance",
  createRequestHandler: async () => {
    startLifecycleWriter();
    logger.info("Maintenance lifecycle writer started");

    return (_req, res) => {
      res.statusCode = 404;
      res.end();
    };
  },
  onClose: async () => {
    logger.info("Shutting down maintenance service");
    await Promise.all(loops.map((loop) => loop.abort()));
    logger.info("Maintenance service shut down");
  },
});

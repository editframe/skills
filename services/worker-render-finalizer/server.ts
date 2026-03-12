import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-render-finalizer" });

import { createWorkerServer } from "@/queues/createWorkerServer";
import { RenderFinalizerWorker } from "@/queues/units-of-work/Render/Finalizer";

// Workflow MUST be registered
import "@/queues/units-of-work/Render/Workflow";

createWorkerServer(RenderFinalizerWorker);

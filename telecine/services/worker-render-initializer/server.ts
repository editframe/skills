import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-render-initializer" });

import { createWorkerServer } from "@/queues/createWorkerServer";
import { RenderInitializerWorker } from "@/queues/units-of-work/Render/RenderInitializer";

// Workflow MUST be registered
import "@/queues/units-of-work/Render/Workflow";

createWorkerServer(RenderInitializerWorker);

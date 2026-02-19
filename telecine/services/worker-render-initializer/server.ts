import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-render-initializer" });

import { createDirectWorkerServer } from "@/queues/createDirectWorkerServer";
import { RenderInitializerWorker } from "@/queues/units-of-work/Render/RenderInitializer";

// Workflow MUST be registered
import "@/queues/units-of-work/Render/Workflow";

createDirectWorkerServer(RenderInitializerWorker);

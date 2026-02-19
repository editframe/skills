import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-render-fragment" });

import { createDirectWorkerServer } from "@/queues/createDirectWorkerServer";
import { RenderFragmentWorker } from "@/queues/units-of-work/Render/RenderFragment";

// Workflow MUST be registered
import "@/queues/units-of-work/Render/Workflow";

createDirectWorkerServer(RenderFragmentWorker);

import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-process-html" });

import { createDirectWorkerServer } from "@/queues/createDirectWorkerServer";
import { ProcessHTMLInitializerWorker } from "@/queues/units-of-work/ProcessHtml/Initializer";

// Workflow MUST be registered
import "@/queues/units-of-work/ProcessHtml/Workflow";

createDirectWorkerServer(ProcessHTMLInitializerWorker);

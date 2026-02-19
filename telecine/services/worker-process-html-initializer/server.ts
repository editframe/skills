import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-process-html" });

import { createWorkerServer } from "@/queues/createWorkerServer";
import { ProcessHTMLInitializerWorker } from "@/queues/units-of-work/ProcessHtml/Initializer";

// Workflow MUST be registered
import "@/queues/units-of-work/ProcessHtml/Workflow";

createWorkerServer(ProcessHTMLInitializerWorker);

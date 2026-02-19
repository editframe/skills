import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-process-html-finalizer" });

import { createDirectWorkerServer } from "@/queues/createDirectWorkerServer";
import { ProcessHTMLFinalizerWorker } from "@/queues/units-of-work/ProcessHtml/Finalizer";
// Workflow MUST be registered
import "@/queues/units-of-work/ProcessHtml/Workflow";

createDirectWorkerServer(ProcessHTMLFinalizerWorker);

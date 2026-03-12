import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-test-fast-finalizer" });

import { createDirectWorkerServer } from "@/queues/createDirectWorkerServer";
import { TestFastFinalizerWorker } from "@/queues/units-of-work/TestFast/Finalizer";

import "@/queues/units-of-work/TestFast/Workflow";

createDirectWorkerServer(TestFastFinalizerWorker);

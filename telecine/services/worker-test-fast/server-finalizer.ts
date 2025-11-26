import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-test-fast-finalizer" });

import { createWorkerServer } from "@/queues/createWorkerServer";
import { TestFastFinalizerWorker } from "@/queues/units-of-work/TestFast/Finalizer";

import "@/queues/units-of-work/TestFast/Workflow";

createWorkerServer(TestFastFinalizerWorker);

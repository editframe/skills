import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-test-fast-initializer" });

import { createWorkerServer } from "@/queues/createWorkerServer";
import { TestFastInitializerWorker } from "@/queues/units-of-work/TestFast/Initializer";

import "@/queues/units-of-work/TestFast/Workflow";

createWorkerServer(TestFastInitializerWorker);

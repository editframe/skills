import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-test-fast-initializer" });

import { createDirectWorkerServer } from "@/queues/createDirectWorkerServer";
import { TestFastInitializerWorker } from "@/queues/units-of-work/TestFast/Initializer";

import "@/queues/units-of-work/TestFast/Workflow";

createDirectWorkerServer(TestFastInitializerWorker);

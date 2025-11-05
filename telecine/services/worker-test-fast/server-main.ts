import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-test-fast-main" });

import { createWorkerServer } from "@/queues/createWorkerServer";
import { TestFastMainWorker } from "@/queues/units-of-work/TestFast/Main";

import "@/queues/units-of-work/TestFast/Workflow";

createWorkerServer(TestFastMainWorker);


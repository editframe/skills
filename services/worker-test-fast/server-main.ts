import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-test-fast-main" });

import { createDirectWorkerServer } from "@/queues/createDirectWorkerServer";
import { TestFastMainWorker } from "@/queues/units-of-work/TestFast/Main";

import "@/queues/units-of-work/TestFast/Workflow";

createDirectWorkerServer(TestFastMainWorker);

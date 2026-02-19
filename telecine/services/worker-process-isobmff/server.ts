import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-process-isobmff" });

import { createDirectWorkerServer } from "@/queues/createDirectWorkerServer";
import { ProcessISOBMFFWorker } from "@/queues/units-of-work/ProcessIsobmff";

createDirectWorkerServer(ProcessISOBMFFWorker);

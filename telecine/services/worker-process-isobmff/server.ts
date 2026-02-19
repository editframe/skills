import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-process-isobmff" });

import { createWorkerServer } from "@/queues/createWorkerServer";
import { ProcessISOBMFFWorker } from "@/queues/units-of-work/ProcessIsobmff";

createWorkerServer(ProcessISOBMFFWorker);

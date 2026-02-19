import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-ingest-image" });

import { createWorkerServer } from "@/queues/createWorkerServer";
import { IngestImageWorker } from "@/queues/units-of-work/IngestImage";

createWorkerServer(IngestImageWorker);

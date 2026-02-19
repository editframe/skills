import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "worker-ingest-image" });

import { createDirectWorkerServer } from "@/queues/createDirectWorkerServer";
import { IngestImageWorker } from "@/queues/units-of-work/IngestImage";

createDirectWorkerServer(IngestImageWorker);

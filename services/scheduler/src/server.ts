import { initializeInstrumentation } from "@/tracing/instrumentation";
initializeInstrumentation({ serviceName: "scheduler" });

import { createSchedulerServer } from "@/queues/createSchedulerServer";

createSchedulerServer();

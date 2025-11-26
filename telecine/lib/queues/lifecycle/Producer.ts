import type { Redis as ValKey } from "iovalkey";
import SuperJSON from "superjson";

export type LifecycleEvent = "started" | "completed" | "failed";
export type LifecycleType = "job" | "attempt" | "workflow";

export interface JobLifecycleMessage {
  type: "job" | "attempt";
  event: LifecycleEvent;
  queue: string;
  jobId: string;
  workflow: string;
  workflowId: string;
  timestamp: number;
  attemptNumber: number;
  details?: Record<string, unknown>;
}

export interface WorkflowLifecycleMessage {
  type: "workflow";
  event: LifecycleEvent;
  workflowId: string;
  workflowName: string;
  orgId: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

export type LifecycleMessage = JobLifecycleMessage | WorkflowLifecycleMessage;

export const publishJobLifecycle = async (
  storage: ValKey,
  message: LifecycleMessage,
) => {
  switch (message.type) {
    case "job":
    case "attempt":
      // biome-ignore format: control over line size
      await storage.xadd(
        "lifecycle:jobs",
        "MAXLEN",
        "~",
        10_000,
        "*",
        "jobId",
        message.jobId,
        "attemptNumber",
        message.attemptNumber,
        "type",
        message.type,
        "queue",
        message.queue,
        "workflow",
        message.workflow,
        "workflowId",
        message.workflowId,
        "event",
        message.event,
        "timestamp",
        message.timestamp,
        ...(message.details
          ? ["details", SuperJSON.stringify(message.details)]
          : []),
      );
      break;
    case "workflow":
      // biome-ignore format: control over line size
      await storage.xadd(
        "lifecycle:jobs",
        "MAXLEN",
        "~",
        10_000,
        "*",
        "workflowId",
        message.workflowId,
        "workflowName",
        message.workflowName,
        "orgId",
        message.orgId,
        "event",
        message.event,
        "type",
        message.type,
        "timestamp",
        message.timestamp,
        ...(message.details
          ? ["details", SuperJSON.stringify(message.details)]
          : []),
      );
      break;
  }
};

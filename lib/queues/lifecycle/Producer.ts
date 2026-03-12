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

export const LIFECYCLE_LIST_KEY = "lifecycle:pending";

export const publishJobLifecycle = async (
  storage: ValKey,
  message: LifecycleMessage,
) => {
  await storage.lpush(LIFECYCLE_LIST_KEY, SuperJSON.stringify(message));
};

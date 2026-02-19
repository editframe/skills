import type { Redis as ValKey } from "iovalkey";
import SuperJSON from "superjson";

import { logger } from "@/logging";
import { db } from "@/sql-client.server/database";
import { Queue } from "../Queue";
import { Workflow } from "../Workflow";
import {
  LIFECYCLE_LIST_KEY,
  type LifecycleMessage,
  type JobLifecycleMessage,
  type WorkflowLifecycleMessage,
} from "./Producer";

type JobGroupKey = `${string}:${"job" | "attempt"}:${"started" | "completed" | "failed"}`;

export async function drainLifecycleList(
  storage: ValKey,
  batchSize = 500,
) {
  const raw: string[] = [];
  for (let i = 0; i < batchSize; i++) {
    const item = await storage.rpop(LIFECYCLE_LIST_KEY);
    if (!item) break;
    raw.push(item);
  }

  if (raw.length === 0) return 0;

  const messages: LifecycleMessage[] = raw.map((r) => SuperJSON.parse(r));

  const jobGroups: Record<JobGroupKey, JobLifecycleMessage[]> = {};
  const workflowMessages = new Map<Workflow<unknown>, WorkflowLifecycleMessage[]>();

  for (const msg of messages) {
    switch (msg.type) {
      case "job":
      case "attempt": {
        const key: JobGroupKey = `${msg.queue}:${msg.type}:${msg.event}`;
        jobGroups[key] ??= [];
        jobGroups[key].push(msg);
        break;
      }
      case "workflow": {
        const workflow = Workflow.fromName(msg.workflowName);
        if (!workflow) {
          logger.error({ msg }, "Workflow not found for lifecycle message");
          continue;
        }
        let msgs = workflowMessages.get(workflow);
        if (!msgs) {
          msgs = [];
          workflowMessages.set(workflow, msgs);
        }
        msgs.push(msg);
        break;
      }
    }
  }

  const promises: Promise<unknown>[] = [];
  const queues = Queue.byName;

  for (const [, queue] of queues) {
    const startKey: JobGroupKey = `${queue.name}:job:started`;
    const completedKey: JobGroupKey = `${queue.name}:job:completed`;
    const failedKey: JobGroupKey = `${queue.name}:job:failed`;

    if (queue.processStarts && jobGroups[startKey]) {
      promises.push(queue.processStarts(jobGroups[startKey], db));
    }
    if (queue.processCompletions && jobGroups[completedKey]) {
      promises.push(queue.processCompletions(jobGroups[completedKey], db));
    }
    if (queue.processFailures && jobGroups[failedKey]) {
      promises.push(queue.processFailures(jobGroups[failedKey], db));
    }
  }

  for (const [workflow, msgs] of workflowMessages) {
    if (workflow.processFailures) {
      promises.push(workflow.processFailures(msgs, db));
    }
  }

  const results = await Promise.allSettled(promises);
  for (const result of results) {
    if (result.status === "rejected") {
      logger.error({ error: result.reason }, "Failed to process lifecycle batch");
    }
  }

  return raw.length;
}

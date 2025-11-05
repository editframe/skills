import { logger } from "@/logging";
import { db } from "@/sql-client.server/database";
import type { Queue } from "../Queue";
import type {
  LifecycleMessage,
  LifecycleEvent,
  LifecycleType,
  JobLifecycleMessage,
  WorkflowLifecycleMessage,
} from "./Producer";
import { Workflow } from "../Workflow";

type JobGroupKey = `${string}:${LifecycleType}:${LifecycleEvent}`;

export async function processBatchedJobMessages(
  queues: Queue<unknown>[],
  messages: LifecycleMessage[],
) {
  if (!messages.length) return;

  const jobGroups: Record<JobGroupKey, JobLifecycleMessage[]> = {};

  const workflowMessages = new Map<
    Workflow<unknown>,
    WorkflowLifecycleMessage[]
  >();

  // Sort messages into their respective groups
  for (const msg of messages) {
    switch (msg.type) {
      case "job":
      case "attempt": {
        const key = `${msg.queue}:${msg.type}:${msg.event}` as const;
        logger.info({ key, ...msg }, "Adding message to group");
        jobGroups[key] ??= [];
        jobGroups[key].push(msg);
        break;
      }
      case "workflow": {
        const workflowKey =
          `${msg.workflowId}:${msg.type}:${msg.event}` as const;
        logger.info({ workflowKey, ...msg }, "Adding message to group");
        const workflow = Workflow.fromName(msg.workflowName);
        if (!workflow) {
          logger.error({ workflowKey, msg }, "Workflow not found");
          continue;
        }
        let messages = workflowMessages.get(workflow);
        if (!messages) {
          messages = [];
          workflowMessages.set(workflow, messages);
        }
        messages.push(msg);
        break;
      }
    }
  }

  const promises: Promise<any>[] = [];

  for (const queue of queues) {
    const jobStartedKey: JobGroupKey = `${queue.name}:job:started`;
    const jobCompletedKey: JobGroupKey = `${queue.name}:job:completed`;
    const jobFailedKey: JobGroupKey = `${queue.name}:job:failed`;

    if (queue.processStarts) {
      if (jobGroups[jobStartedKey]) {
        promises.push(queue.processStarts(jobGroups[jobStartedKey], db));
      }
    }
    if (queue.processCompletions) {
      if (jobGroups[jobCompletedKey]) {
        promises.push(queue.processCompletions(jobGroups[jobCompletedKey], db));
      }
    }
    if (queue.processFailures) {
      if (jobGroups[jobFailedKey]) {
        promises.push(queue.processFailures(jobGroups[jobFailedKey], db));
      }
    }
  }
  for (const [workflow, messages] of workflowMessages.entries()) {
    if (workflow.processFailures) {
      logger.info({ workflow: workflow.name, messages }, "Processing workflow failures");
      promises.push(workflow.processFailures(messages, db));
    }
    else {
      logger.info({ workflow: workflow.name, messages }, "No processFailures for workflow");
    }
  }
  await Promise.allSettled(promises).then((results) => {
    for (const result of results) {
      if (result.status === "rejected") {
        logger.error({ error: result.reason }, "Error processing lifecycle update");
      }
    }
  });
}

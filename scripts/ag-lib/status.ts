import { getQueue, listQueues } from "./queue.js";
import { listPlans, getPlan } from "./plan.js";

export function isWorkDone(queueId: string): boolean {
  const queue = getQueue(queueId);
  if (!queue) return false;

  if (queue.status === "completed") return true;
  if (queue.status === "failed") return true;

  // Check if all plans are completed
  const plans = listPlans(queueId);
  if (plans.length === 0) return false;

  const hasIncomplete = plans.some(
    (p) => p.status !== "completed" && p.status !== "failed",
  );

  return !hasIncomplete;
}

export function isPlanComplete(planId: string): boolean {
  const plan = getPlan(planId);
  if (!plan) return false;

  return plan.status === "completed" || plan.status === "failed";
}

export function getQueueStatus(queueId: string): {
  queue: any;
  totalPlans: number;
  readyPlans: number;
  inProgressPlans: number;
  completedPlans: number;
  failedPlans: number;
  isComplete: boolean;
} {
  const queue = getQueue(queueId);
  if (!queue) {
    throw new Error(`Queue ${queueId} not found`);
  }

  const plans = listPlans(queueId);
  const ready = plans.filter((p) => p.status === "ready").length;
  const inProgress = plans.filter(
    (p) => p.status === "in_progress" || p.status === "claimed",
  ).length;
  const completed = plans.filter((p) => p.status === "completed").length;
  const failed = plans.filter((p) => p.status === "failed").length;

  return {
    queue,
    totalPlans: plans.length,
    readyPlans: ready,
    inProgressPlans: inProgress,
    completedPlans: completed,
    failedPlans: failed,
    isComplete: isWorkDone(queueId),
  };
}

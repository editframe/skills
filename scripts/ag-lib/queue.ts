import { getDb } from "./db.js";
import { randomUUID } from "node:crypto";

export interface PlanQueue {
  id: string;
  goal: string;
  status: "planning" | "active" | "paused" | "completed" | "failed";
  branch?: string;
  commit_hash?: string;
  model?: string;
  created_at: number;
  updated_at: number;
}

export function createQueue(
  goal: string,
  options?: { branch?: string; commit?: string; model?: string },
): string {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO plan_queues (id, goal, status, branch, commit_hash, model, created_at, updated_at)
    VALUES (?, ?, 'planning', ?, ?, ?, ?, ?)
  `).run(
    id,
    goal,
    options?.branch || null,
    options?.commit || null,
    options?.model || null,
    now,
    now,
  );

  return id;
}

export function listQueues(): PlanQueue[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM plan_queues ORDER BY created_at DESC")
    .all() as PlanQueue[];
}

export function getQueue(id: string): PlanQueue | null {
  const db = getDb();
  return db
    .prepare("SELECT * FROM plan_queues WHERE id = ?")
    .get(id) as PlanQueue | null;
}

export function updateQueueStatus(
  id: string,
  status: PlanQueue["status"],
): void {
  const db = getDb();
  db.prepare(
    "UPDATE plan_queues SET status = ?, updated_at = ? WHERE id = ?",
  ).run(status, Date.now(), id);
}

export function deleteQueue(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM plan_queues WHERE id = ?").run(id);
}

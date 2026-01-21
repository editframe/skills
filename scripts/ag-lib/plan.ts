import { getDb } from "./db.js";
import { randomUUID } from "node:crypto";

export interface PlanDocument {
  id: string;
  plan_queue_id: string;
  parent_plan_id?: string;
  depth: number;
  status: "draft" | "ready" | "claimed" | "in_progress" | "completed" | "failed";
  title: string;
  description: string;
  plan_content: string;
  requirements?: string;
  dependencies?: string;
  assigned_to?: string;
  created_by?: string;
  claimed_at?: number;
  started_at?: number;
  completed_at?: number;
  execution_result?: string;
  metadata?: string;
  created_at: number;
  updated_at: number;
}

export function createPlan(
  queueId: string,
  title: string,
  description: string,
  options?: {
    parentPlanId?: string;
    depth?: number;
    planContent?: string;
    requirements?: string[];
    dependencies?: string[];
    createdBy?: string;
  }
): string {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  const depth = options?.depth ?? (options?.parentPlanId ? getPlan(options.parentPlanId)?.depth ?? 0 + 1 : 0);

  db.prepare(`
    INSERT INTO plan_documents (
      id, plan_queue_id, parent_plan_id, depth, status, title, description, plan_content,
      requirements, dependencies, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    queueId,
    options?.parentPlanId || null,
    depth,
    title,
    description,
    options?.planContent || "",
    options?.requirements ? JSON.stringify(options.requirements) : null,
    options?.dependencies ? JSON.stringify(options.dependencies) : null,
    options?.createdBy || null,
    now,
    now
  );

  return id;
}

export function getPlan(id: string): PlanDocument | null {
  const db = getDb();
  return db.prepare("SELECT * FROM plan_documents WHERE id = ?").get(id) as PlanDocument | null;
}

export function listPlans(queueId?: string, status?: PlanDocument["status"]): PlanDocument[] {
  const db = getDb();
  if (queueId && status) {
    return db.prepare("SELECT * FROM plan_documents WHERE plan_queue_id = ? AND status = ? ORDER BY created_at ASC").all(queueId, status) as PlanDocument[];
  } else if (queueId) {
    return db.prepare("SELECT * FROM plan_documents WHERE plan_queue_id = ? ORDER BY created_at ASC").all(queueId) as PlanDocument[];
  } else if (status) {
    return db.prepare("SELECT * FROM plan_documents WHERE status = ? ORDER BY created_at ASC").all(status) as PlanDocument[];
  } else {
    return db.prepare("SELECT * FROM plan_documents ORDER BY created_at ASC").all() as PlanDocument[];
  }
}

export function updatePlan(id: string, updates: Partial<Pick<PlanDocument, "plan_content" | "status" | "title" | "description">>): void {
  const db = getDb();
  const setParts: string[] = [];
  const values: any[] = [];

  if (updates.plan_content !== undefined) {
    setParts.push("plan_content = ?");
    values.push(updates.plan_content);
  }
  if (updates.status !== undefined) {
    setParts.push("status = ?");
    values.push(updates.status);
  }
  if (updates.title !== undefined) {
    setParts.push("title = ?");
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    setParts.push("description = ?");
    values.push(updates.description);
  }

  if (setParts.length === 0) return;

  setParts.push("updated_at = ?");
  values.push(Date.now());
  values.push(id);

  db.prepare(`UPDATE plan_documents SET ${setParts.join(", ")} WHERE id = ?`).run(...values);
}

export function claimPlan(id: string, workerId: string): void {
  const db = getDb();
  const now = Date.now();
  db.prepare(`
    UPDATE plan_documents 
    SET status = 'claimed', assigned_to = ?, claimed_at = ?, updated_at = ?
    WHERE id = ? AND status = 'ready'
  `).run(workerId, now, now, id);
}

export function startPlan(id: string): void {
  const db = getDb();
  const now = Date.now();
  db.prepare(`
    UPDATE plan_documents 
    SET status = 'in_progress', started_at = ?, updated_at = ?
    WHERE id = ?
  `).run(now, now, id);
}

export function completePlan(id: string, result: any): void {
  const db = getDb();
  const now = Date.now();
  db.prepare(`
    UPDATE plan_documents 
    SET status = 'completed', completed_at = ?, execution_result = ?, updated_at = ?
    WHERE id = ?
  `).run(now, JSON.stringify(result), now, id);
}

export function failPlan(id: string, reason?: string): void {
  const db = getDb();
  const now = Date.now();
  db.prepare(`
    UPDATE plan_documents 
    SET status = 'failed', completed_at = ?, execution_result = ?, updated_at = ?
    WHERE id = ?
  `).run(now, JSON.stringify({ error: reason }), now, id);
}

export function getNextReadyPlan(queueId?: string): PlanDocument | null {
  const db = getDb();
  if (queueId) {
    return db.prepare("SELECT * FROM plan_documents WHERE plan_queue_id = ? AND status = 'ready' ORDER BY created_at ASC LIMIT 1").get(queueId) as PlanDocument | null;
  } else {
    return db.prepare("SELECT * FROM plan_documents WHERE status = 'ready' ORDER BY created_at ASC LIMIT 1").get() as PlanDocument | null;
  }
}

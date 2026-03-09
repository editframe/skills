import { getDb } from "./db.js";
import { randomUUID } from "node:crypto";

export type OutputType =
  | "summary"
  | "findings"
  | "plan"
  | "code_changes"
  | "analysis"
  | "decision"
  | "execution_result";

export interface AgentOutput {
  id: string;
  plan_document_id?: string;
  agent_id: string;
  parent_agent_id?: string;
  depth: number;
  output_type: OutputType;
  content: string;
  created_at: number;
}

export function writeOutput(options: {
  planDocumentId?: string;
  agentId: string;
  parentAgentId?: string;
  depth: number;
  outputType: OutputType;
  content: string;
}): string {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO agent_outputs (
      id, plan_document_id, agent_id, parent_agent_id, depth, output_type, content, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    options.planDocumentId || null,
    options.agentId,
    options.parentAgentId || null,
    options.depth,
    options.outputType,
    options.content,
    now,
  );

  return id;
}

export function readOutputs(
  planDocumentId?: string,
  outputType?: OutputType,
): AgentOutput[] {
  const db = getDb();
  if (planDocumentId && outputType) {
    return db
      .prepare(`
      SELECT * FROM agent_outputs 
      WHERE plan_document_id = ? AND output_type = ?
      ORDER BY created_at ASC
    `)
      .all(planDocumentId, outputType) as AgentOutput[];
  } else if (planDocumentId) {
    return db
      .prepare(`
      SELECT * FROM agent_outputs 
      WHERE plan_document_id = ?
      ORDER BY created_at ASC
    `)
      .all(planDocumentId) as AgentOutput[];
  } else {
    return db
      .prepare("SELECT * FROM agent_outputs ORDER BY created_at ASC")
      .all() as AgentOutput[];
  }
}

export function listOutputs(planDocumentId?: string): AgentOutput[] {
  return readOutputs(planDocumentId);
}

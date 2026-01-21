import Database from "better-sqlite3";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const AG_DIR = ".ag";
const DB_PATH = join(process.cwd(), AG_DIR, "agent.db");

export function getDb(): Database.Database {
  // Ensure .ag directory exists
  const agDir = join(process.cwd(), AG_DIR);
  if (!existsSync(agDir)) {
    mkdirSync(agDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL"); // Better concurrency

  // Initialize schema
  initSchema(db);

  return db;
}

function initSchema(db: Database.Database) {
  // Plan Queues
  db.exec(`
    CREATE TABLE IF NOT EXISTS plan_queues (
      id TEXT PRIMARY KEY,
      goal TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('planning', 'active', 'paused', 'completed', 'failed')),
      branch TEXT,
      commit_hash TEXT,
      model TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Plan Documents (created by Planners, executed by Workers)
  db.exec(`
    CREATE TABLE IF NOT EXISTS plan_documents (
      id TEXT PRIMARY KEY,
      plan_queue_id TEXT NOT NULL REFERENCES plan_queues(id),
      parent_plan_id TEXT REFERENCES plan_documents(id),
      depth INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK(status IN ('draft', 'ready', 'claimed', 'in_progress', 'completed', 'failed')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      plan_content TEXT NOT NULL,
      requirements TEXT,
      dependencies TEXT,
      assigned_to TEXT,
      created_by TEXT,
      claimed_at INTEGER,
      started_at INTEGER,
      completed_at INTEGER,
      execution_result TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Recursive Agent Communication (prevents context pollution)
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_outputs (
      id TEXT PRIMARY KEY,
      plan_document_id TEXT REFERENCES plan_documents(id),
      agent_id TEXT NOT NULL,
      parent_agent_id TEXT,
      depth INTEGER NOT NULL,
      output_type TEXT NOT NULL CHECK(output_type IN ('summary', 'findings', 'plan', 'code_changes', 'analysis', 'decision', 'execution_result')),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // Agent Execution Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      plan_document_id TEXT REFERENCES plan_documents(id),
      action TEXT NOT NULL,
      details TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  // Indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_plan_docs_queue_status ON plan_documents(plan_queue_id, status);
    CREATE INDEX IF NOT EXISTS idx_plan_docs_parent ON plan_documents(parent_plan_id);
    CREATE INDEX IF NOT EXISTS idx_plan_docs_ready ON plan_documents(status) WHERE status = 'ready';
    CREATE INDEX IF NOT EXISTS idx_agent_outputs_plan ON agent_outputs(plan_document_id);
    CREATE INDEX IF NOT EXISTS idx_agent_outputs_parent ON agent_outputs(parent_agent_id);
  `);
}

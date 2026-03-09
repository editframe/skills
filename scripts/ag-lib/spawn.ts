import { spawn } from "node:child_process";
import { join } from "node:path";
import { getPlan } from "./plan.js";
import { randomUUID } from "node:crypto";

const SPAWN_PROCESSES = new Map<string, { process: any; startTime: number }>();

export async function spawnPlanner(
  planId: string,
  options: { model?: string; workspace?: string },
): Promise<string> {
  const plan = getPlan(planId);
  if (!plan) {
    throw new Error(`Plan document ${planId} not found`);
  }

  const agentId = randomUUID();
  const workspace = options.workspace || process.cwd();
  const model = "auto";

  const prompt = `You are a planning agent. Your goal is to work on plan document ${planId}.

Plan Title: ${plan.title}
Plan Description: ${plan.description}

Your tasks:
1. Analyze the codebase related to this plan
2. Write your analysis and findings to the database using: ag output write --plan-id ${planId} analysis "<your analysis>"
3. Write your findings using: ag output write --plan-id ${planId} findings "<your findings>"
4. Update the plan document with your plan: ag plan update ${planId} --content "<your plan content>"
5. Mark the plan as ready: ag plan update ${planId} --status ready

Do NOT wait for user feedback - work autonomously. Write all outputs to the database using 'ag output write' commands.`;

  return spawnAgent("planner", planId, agentId, workspace, model, prompt);
}

export async function spawnWorker(
  planId: string,
  options: { model?: string; workspace?: string },
): Promise<string> {
  const plan = getPlan(planId);
  if (!plan) {
    throw new Error(`Plan document ${planId} not found`);
  }

  const agentId = randomUUID();
  const workspace = options.workspace || process.cwd();
  const model = "auto";

  const prompt = `You are a worker agent. Your goal is to execute plan document ${planId}.

Plan Title: ${plan.title}
Plan Description: ${plan.description}
Plan Content: ${plan.plan_content}

Your tasks:
1. Read the plan document: ag plan show ${planId}
2. Execute the plan (make code changes, implement features, etc.)
3. Write execution results to the database using: ag output write --plan-id ${planId} execution_result "<result>"
4. Write code changes using: ag output write --plan-id ${planId} code_changes "<list of files changed>"
5. Complete the plan: ag worker complete ${planId} --result '{"success": true, "files": [...]}'

Do NOT wait for user feedback - work autonomously. Write all outputs to the database using 'ag output write' commands.`;

  return spawnAgent("worker", planId, agentId, workspace, model, prompt);
}

function spawnAgent(
  type: "planner" | "worker",
  planId: string,
  agentId: string,
  workspace: string,
  model: string,
  prompt: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Find cursor agent command
    const cursorAgent = "cursor"; // Assumes cursor is in PATH

    const args = [
      "agent",
      "--print",
      "--workspace",
      workspace,
      "--model",
      model,
      "--force",
      prompt,
    ];

    const proc = spawn(cursorAgent, args, {
      cwd: workspace,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, AG_AGENT_ID: agentId, AG_PLAN_ID: planId },
    });

    SPAWN_PROCESSES.set(planId, { process: proc, startTime: Date.now() });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
      // Optionally stream output
      if (process.env.AG_VERBOSE) {
        process.stdout.write(data);
      }
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
      // Optionally stream errors
      if (process.env.AG_VERBOSE) {
        process.stderr.write(data);
      }
    });

    proc.on("exit", (code) => {
      SPAWN_PROCESSES.delete(planId);
      if (code === 0) {
        // Process completed successfully
      } else {
        // Process failed, but we still resolve with agentId
        // The error is logged but doesn't fail the spawn operation
        console.error(`Agent ${agentId} exited with code ${code}`);
      }
    });

    proc.on("error", (err) => {
      SPAWN_PROCESSES.delete(planId);
      reject(err);
      return;
    });

    // Resolve immediately with agentId, process runs in background
    resolve(agentId);
  });
}

export function waitForAgent(planId: string, timeout?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const entry = SPAWN_PROCESSES.get(planId);
    if (!entry) {
      // Process already completed or never started
      resolve();
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (!SPAWN_PROCESSES.has(planId)) {
        clearInterval(checkInterval);
        resolve();
        return;
      }

      if (timeout && Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error(`Timeout waiting for agent ${planId}`));
      }
    }, 1000);

    entry.process.on("exit", () => {
      clearInterval(checkInterval);
      resolve();
    });
  });
}

export function getAgentStatus(planId: string): {
  running: boolean;
  startTime?: number;
} {
  const entry = SPAWN_PROCESSES.get(planId);
  return {
    running: !!entry,
    startTime: entry?.startTime,
  };
}

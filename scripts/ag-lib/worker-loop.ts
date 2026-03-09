import { spawn } from "node:child_process";
import * as plan from "./plan.js";
import * as status from "./status.js";
import chalk from "chalk";
import { sleep } from "./util.js";

export async function startWorkerLoop(options: {
  queueId?: string;
  model?: string;
  workspace?: string;
}) {
  const workspace = options.workspace || process.cwd();
  const model = "auto";
  const queueId = options.queueId;

  console.log(chalk.cyan("🔧 Starting worker loop..."));
  console.log(chalk.gray(`Model: auto`));
  console.log(chalk.gray(`Workspace: ${workspace}`));
  if (queueId) {
    console.log(chalk.gray(`Queue ID: ${queueId}`));
  }
  console.log(chalk.gray("Press Ctrl+C to stop\n"));

  let consecutiveNoPlans = 0;
  const MAX_NO_PLANS = 10; // Stop after 10 consecutive checks with no plans

  while (true) {
    try {
      // Try to claim a plan
      const nextPlan = plan.getNextReadyPlan(queueId);

      if (!nextPlan) {
        consecutiveNoPlans++;

        if (consecutiveNoPlans >= MAX_NO_PLANS) {
          console.log(
            chalk.yellow(
              "\nNo plans available for a while. Exiting worker loop.",
            ),
          );
          break;
        }

        if (consecutiveNoPlans === 1) {
          console.log(chalk.gray("No ready plans available. Waiting..."));
        }

        await sleep(5000); // Wait 5 seconds before checking again
        continue;
      }

      consecutiveNoPlans = 0; // Reset counter when we find a plan

      const workerId = `worker-${Date.now()}`;
      plan.claimPlan(nextPlan.id, workerId);
      plan.startPlan(nextPlan.id);

      console.log(chalk.green(`\n📋 Claimed plan: ${nextPlan.title}`));
      console.log(chalk.gray(`Plan ID: ${nextPlan.id}`));
      console.log(chalk.gray(`Description: ${nextPlan.description}\n`));

      // Spawn worker agent to execute the plan
      try {
        await executePlan(nextPlan.id, workerId, workspace, model);
      } catch (error: any) {
        console.error(chalk.red(`Error executing plan: ${error.message}`));
        plan.failPlan(nextPlan.id, error.message);
      }

      // Check if all work is done
      if (queueId) {
        const isDone = status.isWorkDone(queueId);
        if (isDone) {
          console.log(chalk.green("\n✅ All work is complete!"));
          break;
        }
      }
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error in worker loop: ${error.message}`));
      await sleep(5000); // Wait before retrying
    }
  }

  console.log(chalk.cyan("\n👋 Worker loop stopped."));
}

async function executePlan(
  planId: string,
  workerId: string,
  workspace: string,
  model: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const planDoc = plan.getPlan(planId);
    if (!planDoc) {
      reject(new Error(`Plan ${planId} not found`));
      return;
    }

    const prompt = `You are a worker agent executing plan document ${planId}.

Plan Title: ${planDoc.title}
Plan Description: ${planDoc.description}
Plan Content: ${planDoc.plan_content}

Your tasks:
1. Read the plan: ag plan show ${planId}
2. Execute the plan (make code changes, implement features, etc.)
3. Write execution results: ag output write --plan-id ${planId} execution_result "<result>"
4. Write code changes: ag output write --plan-id ${planId} code_changes "<list of files>"
5. Complete the plan: ag worker complete ${planId} --result '{"success": true, "files": [...]}'

Do NOT wait for user feedback - work autonomously. Write all outputs to the database using 'ag output write' commands.`;

    console.log(chalk.cyan(`🚀 Starting execution of plan ${planId}...`));

    const proc = spawn(
      "cursor",
      [
        "agent",
        "--print",
        "--workspace",
        workspace,
        "--model",
        model,
        "--force",
        prompt,
      ],
      {
        cwd: workspace,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, AG_AGENT_ID: workerId, AG_PLAN_ID: planId },
      },
    );

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      // Stream output
      process.stdout.write(text);
    });

    proc.stderr?.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    proc.on("exit", (code) => {
      if (code === 0) {
        console.log(chalk.green(`\n✅ Plan ${planId} execution completed`));
        resolve();
      } else {
        console.error(
          chalk.red(`\n❌ Plan ${planId} execution failed with code ${code}`),
        );
        plan.failPlan(planId, `Execution failed: ${stderr}`);
        resolve(); // Continue loop even on failure
      }
    });

    proc.on("error", (err) => {
      console.error(chalk.red(`\n❌ Error executing plan: ${err.message}`));
      plan.failPlan(planId, err.message);
      reject(err);
    });
  });
}

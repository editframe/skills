#!/usr/bin/env node

import { parseArgs } from "node:util";
import chalk from "chalk";

// Import command modules
import * as queue from "./queue.js";
import * as plan from "./plan.js";
import * as output from "./output.js";
import * as spawn from "./spawn.js";
import * as status from "./status.js";
import { startInteractivePlanner } from "./interactive.js";
import { startWorkerLoop } from "./worker-loop.js";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
${chalk.bold("ag")} - Agent coordination CLI

Usage: ag <command> [options]

Commands:
  ${chalk.cyan("plan")}      Start interactive planning session
  ${chalk.cyan("work")}       Start worker loop (pulls and executes plans)
  ${chalk.cyan("queue")}      Manage plan queues
  ${chalk.cyan("status")}     Check work status

Run 'ag <command> --help' for command-specific help.
`);
  process.exit(0);
}

const [command, ...rest] = args;

try {
  switch (command) {
    case "queue":
      handleQueue(rest);
      break;
    case "plan":
      if (
        rest.length === 0 ||
        (rest.length === 1 && (rest[0] === "--help" || rest[0] === "-h"))
      ) {
        // Interactive planning mode (or help)
        if (rest.length === 0) {
          startInteractivePlanner();
        } else {
          console.log(`
${chalk.bold("ag plan")} - Start interactive planning session

Usage: ag plan

Starts an interactive conversation with a planning agent to create plan documents.
The agent will help you break down goals into actionable plans.

You can also use subcommands:
  ag plan create <queue-id> <title> <description>  Create plan document directly
  ag plan list [queue-id]                          List plan documents
  ag plan show <plan-id>                           Show plan document
  ag plan update <plan-id> [options]                Update plan document
`);
        }
      } else {
        handlePlan(rest);
      }
      break;
    case "work": {
      // Start worker loop
      const { values } = parseArgs({
        args: rest,
        options: {
          "queue-id": { type: "string" },
          workspace: { type: "string" },
        },
        allowPositionals: true,
      });
      // Run async worker loop (always uses auto model)
      startWorkerLoop({
        queueId: values["queue-id"],
        workspace: values.workspace,
      })
        .then(() => {
          process.exit(0);
        })
        .catch((error: any) => {
          console.error(chalk.red(`Error: ${error.message}`));
          process.exit(1);
        });
      break;
    }
    case "worker":
      handleWorker(rest);
      break;
    case "output":
      handleOutput(rest);
      break;
    case "spawn":
      handleSpawn(rest);
      break;
    case "status":
      handleStatus(rest);
      break;
    default:
      console.error(chalk.red(`Unknown command: ${command}`));
      process.exit(1);
  }
} catch (error: any) {
  console.error(chalk.red(`Error: ${error.message}`));
  process.exit(1);
}

function handleQueue(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help || args.length === 0) {
    console.log(`
${chalk.bold("ag queue")} - Manage plan queues

Commands:
  create <goal>              Create new plan queue
  list                       List all queues
  show <queue-id>            Show queue details
  pause <queue-id>           Pause a queue
  resume <queue-id>          Resume a queue
  delete <queue-id>          Delete a queue
`);
    return;
  }

  const [subcommand, ...subargs] = args;

  switch (subcommand) {
    case "create": {
      const goal = subargs.join(" ");
      if (!goal) {
        console.error(chalk.red("Error: goal is required"));
        process.exit(1);
      }
      const id = queue.createQueue(goal);
      console.log(chalk.green(`Created queue: ${id}`));
      console.log(`Goal: ${goal}`);
      break;
    }
    case "list": {
      const queues = queue.listQueues();
      if (queues.length === 0) {
        console.log("No queues found.");
      } else {
        queues.forEach((q) => {
          console.log(`${chalk.cyan(q.id)} - ${q.goal} [${q.status}]`);
        });
      }
      break;
    }
    case "show": {
      const id = subargs[0];
      if (!id) {
        console.error(chalk.red("Error: queue-id is required"));
        process.exit(1);
      }
      const q = queue.getQueue(id);
      if (!q) {
        console.error(chalk.red(`Queue ${id} not found`));
        process.exit(1);
      }
      console.log(JSON.stringify(q, null, 2));
      break;
    }
    case "pause": {
      const id = subargs[0];
      if (!id) {
        console.error(chalk.red("Error: queue-id is required"));
        process.exit(1);
      }
      queue.updateQueueStatus(id, "paused");
      console.log(chalk.green(`Queue ${id} paused`));
      break;
    }
    case "resume": {
      const id = subargs[0];
      if (!id) {
        console.error(chalk.red("Error: queue-id is required"));
        process.exit(1);
      }
      queue.updateQueueStatus(id, "active");
      console.log(chalk.green(`Queue ${id} resumed`));
      break;
    }
    case "delete": {
      const id = subargs[0];
      if (!id) {
        console.error(chalk.red("Error: queue-id is required"));
        process.exit(1);
      }
      queue.deleteQueue(id);
      console.log(chalk.green(`Queue ${id} deleted`));
      break;
    }
    default:
      console.error(chalk.red(`Unknown queue command: ${subcommand}`));
      process.exit(1);
  }
}

function handlePlan(args: string[]) {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
${chalk.bold("ag plan")} - Manage plan documents

Commands:
  create <queue-id> <title> <description>  Create plan document
  list [queue-id] [--status <status>]       List plan documents
  show <plan-id>                            Show plan document
  update <plan-id> [--content <content>] [--status <status>]  Update plan
`);
    return;
  }

  const [subcommand, ...subargs] = args;

  switch (subcommand) {
    case "create": {
      const [queueId, title, ...descParts] = subargs;
      if (!queueId || !title) {
        console.error(chalk.red("Error: queue-id and title are required"));
        process.exit(1);
      }
      const description = descParts.join(" ") || "";
      const id = plan.createPlan(queueId, title, description);
      console.log(chalk.green(`Created plan: ${id}`));
      break;
    }
    case "list": {
      const { values: listValues, positionals } = parseArgs({
        args: subargs,
        options: {
          status: { type: "string" },
        },
        allowPositionals: true,
      });
      const queueId = positionals[0];
      const plans = plan.listPlans(queueId, listValues.status as any);
      if (plans.length === 0) {
        console.log("No plans found.");
      } else {
        plans.forEach((p) => {
          console.log(`${chalk.cyan(p.id)} - ${p.title} [${p.status}]`);
        });
      }
      break;
    }
    case "show": {
      const id = subargs[0];
      if (!id) {
        console.error(chalk.red("Error: plan-id is required"));
        process.exit(1);
      }
      const p = plan.getPlan(id);
      if (!p) {
        console.error(chalk.red(`Plan ${id} not found`));
        process.exit(1);
      }
      console.log(JSON.stringify(p, null, 2));
      break;
    }
    case "update": {
      // Manual parsing for update command to handle --content and --status
      const id = subargs[0];
      if (!id) {
        console.error(chalk.red("Error: plan-id is required"));
        process.exit(1);
      }

      const updates: any = {};
      for (let i = 1; i < subargs.length; i++) {
        if (subargs[i] === "--content" && i + 1 < subargs.length) {
          updates.plan_content = subargs[i + 1];
          i++;
        } else if (subargs[i] === "--status" && i + 1 < subargs.length) {
          updates.status = subargs[i + 1];
          i++;
        } else if (subargs[i] === "--title" && i + 1 < subargs.length) {
          updates.title = subargs[i + 1];
          i++;
        } else if (subargs[i] === "--description" && i + 1 < subargs.length) {
          updates.description = subargs[i + 1];
          i++;
        }
      }

      plan.updatePlan(id, updates);
      console.log(chalk.green(`Plan ${id} updated`));
      break;
    }
    default:
      console.error(chalk.red(`Unknown plan command: ${subcommand}`));
      process.exit(1);
  }
}

function handleWorker(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help || args.length === 0) {
    console.log(`
${chalk.bold("ag worker")} - Worker operations

Commands:
  claim [--queue-id <queue-id>]  Claim next ready plan document
  complete <plan-id> [--result <json>]  Mark plan execution complete
  fail <plan-id> [--reason <reason>]  Mark plan execution failed
`);
    return;
  }

  const [subcommand, ...subargs] = args;

  switch (subcommand) {
    case "claim": {
      const { values: claimValues } = parseArgs({
        args: subargs,
        options: {
          "queue-id": { type: "string" },
        },
        allowPositionals: true,
      });
      const nextPlan = plan.getNextReadyPlan(claimValues["queue-id"]);
      if (!nextPlan) {
        console.log("No ready plans available.");
        process.exit(1);
      }
      const workerId = process.env.AG_AGENT_ID || `worker-${Date.now()}`;
      plan.claimPlan(nextPlan.id, workerId);
      plan.startPlan(nextPlan.id);
      // Get updated plan
      const claimedPlan = plan.getPlan(nextPlan.id);
      console.log(chalk.green(`Claimed plan: ${nextPlan.id}`));
      console.log(JSON.stringify(claimedPlan, null, 2));
      break;
    }
    case "complete": {
      const { values: completeValues, positionals } = parseArgs({
        args: subargs,
        options: {
          result: { type: "string" },
        },
        allowPositionals: true,
      });
      const id = positionals[0];
      if (!id) {
        console.error(chalk.red("Error: plan-id is required"));
        process.exit(1);
      }
      const result = completeValues.result
        ? JSON.parse(completeValues.result)
        : { success: true };
      plan.completePlan(id, result);
      console.log(chalk.green(`Plan ${id} completed`));
      break;
    }
    case "fail": {
      const { values: failValues, positionals } = parseArgs({
        args: subargs,
        options: {
          reason: { type: "string" },
        },
        allowPositionals: true,
      });
      const id = positionals[0];
      if (!id) {
        console.error(chalk.red("Error: plan-id is required"));
        process.exit(1);
      }
      plan.failPlan(id, failValues.reason);
      console.log(chalk.yellow(`Plan ${id} failed`));
      break;
    }
    default:
      console.error(chalk.red(`Unknown worker command: ${subcommand}`));
      process.exit(1);
  }
}

function handleOutput(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help || args.length === 0) {
    console.log(`
${chalk.bold("ag output")} - Recursive agent communication

Commands:
  write [--plan-id <plan-id>] <type> <content>  Write structured output
  read [--plan-id <plan-id>] [--type <type>]    Read outputs
  list [--plan-id <plan-id>]                     List all outputs
`);
    return;
  }

  const [subcommand, ...subargs] = args;

  switch (subcommand) {
    case "write": {
      const { values: writeValues, positionals } = parseArgs({
        args: subargs,
        options: {
          "plan-id": { type: "string" },
        },
        allowPositionals: true,
      });
      const [type, ...contentParts] = positionals;
      if (!type) {
        console.error(chalk.red("Error: output type is required"));
        process.exit(1);
      }
      const content = contentParts.join(" ");
      if (!content) {
        console.error(chalk.red("Error: content is required"));
        process.exit(1);
      }
      const agentId = process.env.AG_AGENT_ID || `agent-${Date.now()}`;
      const parentAgentId = process.env.AG_PARENT_AGENT_ID;
      const depth = parseInt(process.env.AG_DEPTH || "0");
      const id = output.writeOutput({
        planDocumentId: writeValues["plan-id"],
        agentId,
        parentAgentId,
        depth,
        outputType: type as any,
        content,
      });
      console.log(chalk.green(`Output written: ${id}`));
      break;
    }
    case "read": {
      const { values: readValues } = parseArgs({
        args: subargs,
        options: {
          "plan-id": { type: "string" },
          type: { type: "string" },
        },
        allowPositionals: true,
      });
      const outputs = output.readOutputs(
        readValues["plan-id"],
        readValues.type as any,
      );
      if (outputs.length === 0) {
        console.log("No outputs found.");
      } else {
        console.log(JSON.stringify(outputs, null, 2));
      }
      break;
    }
    case "list": {
      const { values: listValues } = parseArgs({
        args: subargs,
        options: {
          "plan-id": { type: "string" },
        },
        allowPositionals: true,
      });
      const outputs = output.listOutputs(listValues["plan-id"]);
      if (outputs.length === 0) {
        console.log("No outputs found.");
      } else {
        outputs.forEach((o) => {
          console.log(`${chalk.cyan(o.id)} - ${o.output_type} [${o.agent_id}]`);
        });
      }
      break;
    }
    default:
      console.error(chalk.red(`Unknown output command: ${subcommand}`));
      process.exit(1);
  }
}

function handleSpawn(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help || args.length === 0) {
    console.log(`
${chalk.bold("ag spawn")} - Spawn sub-agents

Commands:
  planner <plan-id> [--workspace <path>]  Spawn sub-planner (uses auto model)
  worker <plan-id> [--workspace <path>]   Spawn sub-worker (uses auto model)
  wait <plan-id>                                             Wait for agent to complete
  status <plan-id>                                            Check agent status
`);
    return;
  }

  const [subcommand, ...subargs] = args;

  switch (subcommand) {
    case "planner": {
      const { values: spawnValues, positionals } = parseArgs({
        args: subargs,
        options: {
          workspace: { type: "string" },
        },
        allowPositionals: true,
      });
      const planId = positionals[0];
      if (!planId) {
        console.error(chalk.red("Error: plan-id is required"));
        process.exit(1);
      }
      (async () => {
        try {
          const agentId = await spawn.spawnPlanner(planId, {
            workspace: spawnValues.workspace,
          });
          console.log(chalk.green(`Spawned planner agent: ${agentId}`));
          console.log(`Plan ID: ${planId}`);
        } catch (err: any) {
          console.error(chalk.red(`Error spawning planner: ${err.message}`));
          process.exit(1);
        }
      })();
      break;
    }
    case "worker": {
      const { values: spawnValues, positionals } = parseArgs({
        args: subargs,
        options: {
          workspace: { type: "string" },
        },
        allowPositionals: true,
      });
      const planId = positionals[0];
      if (!planId) {
        console.error(chalk.red("Error: plan-id is required"));
        process.exit(1);
      }
      (async () => {
        try {
          const agentId = await spawn.spawnWorker(planId, {
            workspace: spawnValues.workspace,
          });
          console.log(chalk.green(`Spawned worker agent: ${agentId}`));
          console.log(`Plan ID: ${planId}`);
        } catch (err: any) {
          console.error(chalk.red(`Error spawning worker: ${err.message}`));
          process.exit(1);
        }
      })();
      break;
    }
    case "wait": {
      const planId = subargs[0];
      if (!planId) {
        console.error(chalk.red("Error: plan-id is required"));
        process.exit(1);
      }
      console.log(`Waiting for agent ${planId}...`);
      (async () => {
        try {
          await spawn.waitForAgent(planId);
          console.log(chalk.green(`Agent ${planId} completed`));
        } catch (err: any) {
          console.error(chalk.red(`Error waiting for agent: ${err.message}`));
          process.exit(1);
        }
      })();
      break;
    }
    case "status": {
      const planId = subargs[0];
      if (!planId) {
        console.error(chalk.red("Error: plan-id is required"));
        process.exit(1);
      }
      const agentStatus = spawn.getAgentStatus(planId);
      console.log(JSON.stringify(agentStatus, null, 2));
      break;
    }
    default:
      console.error(chalk.red(`Unknown spawn command: ${subcommand}`));
      process.exit(1);
  }
}

function handleStatus(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help || args.length === 0) {
    console.log(`
${chalk.bold("ag status")} - Check work status

Commands:
  queue <queue-id>    Check if queue work is done
  plan <plan-id>      Check if plan is complete
  show <queue-id>     Show detailed queue status
`);
    return;
  }

  const [subcommand, ...subargs] = args;

  switch (subcommand) {
    case "queue": {
      const queueId = subargs[0];
      if (!queueId) {
        console.error(chalk.red("Error: queue-id is required"));
        process.exit(1);
      }
      const done = status.isWorkDone(queueId);
      console.log(
        done ? chalk.green("Work is done") : chalk.yellow("Work is not done"),
      );
      process.exit(done ? 0 : 1);
    }
    case "plan": {
      const planId = subargs[0];
      if (!planId) {
        console.error(chalk.red("Error: plan-id is required"));
        process.exit(1);
      }
      const complete = status.isPlanComplete(planId);
      console.log(
        complete
          ? chalk.green("Plan is complete")
          : chalk.yellow("Plan is not complete"),
      );
      process.exit(complete ? 0 : 1);
    }
    case "show": {
      const queueId = subargs[0];
      if (!queueId) {
        console.error(chalk.red("Error: queue-id is required"));
        process.exit(1);
      }
      const queueStatus = status.getQueueStatus(queueId);
      console.log(JSON.stringify(queueStatus, null, 2));
      break;
    }
    default:
      console.error(chalk.red(`Unknown status command: ${subcommand}`));
      process.exit(1);
  }
}

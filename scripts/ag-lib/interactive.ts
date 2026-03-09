import { spawn, execSync } from "node:child_process";
import chalk from "chalk";
import * as queue from "./queue.js";
import * as plan from "./plan.js";
import * as readline from "node:readline";

export async function startInteractivePlanner() {
  const workspace = process.cwd();
  const model = "auto";

  // Get or create a default queue
  const queues = queue.listQueues();
  let queueId: string;

  if (queues.length === 0) {
    console.log(chalk.cyan("No plan queue found. Creating a new one..."));
    queueId = queue.createQueue("Default Planning Queue");
    console.log(chalk.green(`Created queue: ${queueId}`));
  } else {
    queueId = queues[0].id;
    console.log(chalk.cyan(`Using existing queue: ${queueId}`));
  }

  const initialPrompt = `You are a planning agent helping the user create plan documents.

You have access to the 'ag' CLI tool to manage plans. Here's what you can do:

1. Create plan documents: Use 'ag plan create <queue-id> <title> <description>'
2. List existing plans: Use 'ag plan list'
3. Update plans: Use 'ag plan update <plan-id> --content "<content>" --status ready'
4. Check status: Use 'ag status queue <queue-id>' to see if work is done

Current queue ID: ${queueId}

Start by asking the user what they want to plan. Help them break down their goals into actionable plan documents. 
When a plan is ready, mark it with 'ag plan update <plan-id> --status ready' so workers can execute it.

Be conversational and helpful. Ask clarifying questions. Help the user think through their planning.`;

  console.log(chalk.cyan("\n🤖 Starting interactive planning session..."));
  console.log(chalk.gray(`Queue ID: ${queueId}`));
  console.log(chalk.gray("Type 'exit' to end the session\n"));

  // Create a chat session
  let chatId: string;
  try {
    const chatIdOutput = execSync("cursor agent create-chat", {
      encoding: "utf-8",
      cwd: workspace,
    });
    chatId = chatIdOutput.trim();
    console.log(chalk.gray(`Chat ID: ${chatId}\n`));
  } catch (error: any) {
    console.error(chalk.red(`Error creating chat: ${error.message}`));
    process.exit(1);
  }

  // Set up readline for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  // First, send initial prompt to start the conversation
  console.log(chalk.gray("Initializing agent...\n"));

  let agentOutput = "";
  let agentError = "";

  try {
    const args = [
      "agent",
      "--print",
      "--workspace",
      workspace,
      "--model",
      model,
      "--resume",
      chatId,
      initialPrompt,
    ];

    const proc = spawn("cursor", args, {
      cwd: workspace,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, AG_QUEUE_ID: queueId },
    });

    await new Promise<void>((resolve, reject) => {
      proc.stdout?.on("data", (data) => {
        agentOutput += data.toString();
      });

      proc.stderr?.on("data", (data) => {
        agentError += data.toString();
      });

      proc.on("exit", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Agent exited with code ${code}: ${agentError}`));
        }
      });

      proc.on("error", (err) => {
        reject(err);
      });
    });

    // Display agent's initial greeting
    if (agentOutput.trim()) {
      console.log(chalk.cyan("\n--- Agent ---"));
      console.log(agentOutput.trim());
      console.log(chalk.cyan("--- End Agent ---\n"));
    } else {
      console.log(chalk.gray("(No initial response from agent)\n"));
    }
  } catch (error: any) {
    console.error(chalk.red(`Error initializing agent: ${error.message}`));
    if (agentError) {
      console.error(chalk.red(`Agent error: ${agentError}`));
    }
    process.exit(1);
  }

  // Now start the interactive loop
  try {
    while (true) {
      // Ask user for input
      const userInput = await question(
        chalk.yellow("Your feedback (or 'exit' to quit): "),
      );

      if (userInput.trim().toLowerCase() === "exit") {
        break;
      }

      if (!userInput.trim()) {
        console.log(chalk.gray("(Empty input, continuing conversation...)"));
        continue;
      }

      // Call cursor agent --print to get agent response
      let agentOutput = "";
      let agentError = "";

      try {
        const args = [
          "agent",
          "--print",
          "--workspace",
          workspace,
          "--model",
          model,
          "--resume",
          chatId,
          userInput,
        ];

        console.log(chalk.gray("Thinking...\n"));

        const proc = spawn("cursor", args, {
          cwd: workspace,
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, AG_QUEUE_ID: queueId },
        });

        await new Promise<void>((resolve, reject) => {
          proc.stdout?.on("data", (data) => {
            agentOutput += data.toString();
          });

          proc.stderr?.on("data", (data) => {
            agentError += data.toString();
          });

          proc.on("exit", (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(
                new Error(`Agent exited with code ${code}: ${agentError}`),
              );
            }
          });

          proc.on("error", (err) => {
            reject(err);
          });
        });

        // Display agent output
        if (agentOutput.trim()) {
          console.log(chalk.cyan("\n--- Agent ---"));
          console.log(agentOutput.trim());
          console.log(chalk.cyan("--- End Agent ---\n"));
        } else {
          console.log(chalk.gray("(No response from agent)\n"));
        }
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}`));
        const continueOnError = await question(
          chalk.yellow("Continue? (y/n): "),
        );
        if (continueOnError.toLowerCase() !== "y") {
          break;
        }
      }
    }
  } finally {
    rl.close();
    console.log(chalk.cyan("\n\nPlanning session ended."));
  }
}

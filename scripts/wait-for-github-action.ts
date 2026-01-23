#!/usr/bin/env node

import { execSync } from "node:child_process";
import ora from "ora";
import chalk from "chalk";

interface WorkflowStatus {
  status: "queued" | "in_progress" | "completed";
  conclusion: string | null;
  title: string;
  jobs: Job[];
}

interface Step {
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: string | null;
  number: number;
}

interface Job {
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: string | null;
  steps: Step[];
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${mins}m ${secs}s`;
  }
}

function getJobIcon(status: string, conclusion: string | null): string {
  switch (status) {
    case "queued":
      return "⏳";
    case "in_progress":
      return "🔄";
    case "completed":
      if (conclusion === "success") return "✅";
      if (conclusion === "failure" || conclusion === "cancelled") return "❌";
      return "⚠️";
    default:
      return "❓";
  }
}

function getStatusIcon(status: string, conclusion: string | null): string {
  switch (status) {
    case "queued":
      return "⏳";
    case "in_progress":
      return "🔄";
    case "completed":
      if (conclusion === "success") return "✅";
      if (conclusion === "failure" || conclusion === "cancelled") return "❌";
      return "⚠️";
    default:
      return "❓";
  }
}

async function checkGhInstalled(): Promise<void> {
  try {
    execSync("gh --version", { stdio: "ignore" });
  } catch {
    console.error(chalk.red("Error: GitHub CLI (gh) is required but not installed."));
    console.error("Install it from: https://cli.github.com/");
    process.exit(1);
  }
}

async function checkGhAuthenticated(): Promise<void> {
  try {
    execSync("gh auth status", { stdio: "ignore" });
  } catch {
    console.error(chalk.red("Error: GitHub CLI is not authenticated."));
    console.error("Run: gh auth login");
    process.exit(1);
  }
}

async function getRunId(
  repo: string,
  workflowFile?: string,
): Promise<{ runId: string; workflowFile: string }> {
  if (workflowFile) {
    const output = execSync(
      `gh run list --workflow="${workflowFile}" --limit=1 --json databaseId --jq '.[0].databaseId' --repo="${repo}"`,
      { encoding: "utf-8" },
    ).trim();

    if (!output || output === "null") {
      console.error(
        chalk.red(`Error: Could not find workflow run for ${workflowFile}`),
      );
      console.error(
        `Check the workflow status at: https://github.com/${repo}/actions/workflows/${workflowFile}`,
      );
      process.exit(1);
    }

    return { runId: output, workflowFile };
  } else {
    // Get most recent active run (queued or in_progress)
    const output = execSync(
      `gh run list --limit=10 --json databaseId,status,workflowName --jq '[.[] | select(.status == "queued" or .status == "in_progress")] | .[0] | {id: .databaseId, status: .status, workflow: .workflowName}' --repo="${repo}"`,
      { encoding: "utf-8" },
    ).trim();

    if (!output || output === "null") {
      // Fallback to most recent run if no active runs found
      const fallbackOutput = execSync(
        `gh run list --limit=1 --json databaseId,status,workflowName --jq '.[0] | {id: .databaseId, status: .status, workflow: .workflowName}' --repo="${repo}"`,
        { encoding: "utf-8" },
      ).trim();

      if (!fallbackOutput || fallbackOutput === "null") {
        console.error(chalk.red("Error: Could not find any workflow runs"));
        process.exit(1);
      }

      const data = JSON.parse(fallbackOutput);
      console.log(
        chalk.yellow(
          `Warning: No active runs found. Watching most recent run (status: ${data.status})`,
        ),
      );
      return { runId: data.id, workflowFile: data.workflow };
    }

    const data = JSON.parse(output);
    return { runId: data.id, workflowFile: data.workflow };
  }
}

async function getStatus(repo: string, runId: string): Promise<WorkflowStatus> {
  try {
    const output = execSync(
      `gh run view ${runId} --repo="${repo}" --json status,conclusion,displayTitle,jobs --jq '{status: .status, conclusion: .conclusion, title: .displayTitle, jobs: [.jobs[]? | {name: .name, status: .status, conclusion: .conclusion, steps: [.steps[]? | {name: .name, status: .status, conclusion: .conclusion, number: .number}]}]}'`,
      { encoding: "utf-8" },
    ).trim();

    return JSON.parse(output);
  } catch {
    return {
      status: "unknown",
      conclusion: null,
      title: "",
      jobs: [],
    };
  }
}

function getStepIcon(status: string, conclusion: string | null): string {
  switch (status) {
    case "queued":
      return "⏳";
    case "in_progress":
      return "🔄";
    case "completed":
      if (conclusion === "success") return "✅";
      if (conclusion === "failure" || conclusion === "cancelled") return "❌";
      if (conclusion === "skipped") return "⏭️";
      return "⚠️";
    default:
      return "❓";
  }
}

function displayJobs(jobs: Job[], spinnerChar: string, lastJobCount: number): number {
  const showSteps = jobs.length === 1; // Only show steps if there's a single job

  // Calculate total lines needed
  let totalLines = 1; // "Jobs:" header
  for (const job of jobs) {
    totalLines += 1; // Job line
    if (showSteps && job.steps && job.steps.length > 0) {
      totalLines += job.steps.length; // Step lines
    }
  }

  // Write jobs section (no clearing needed - caller handles it)
  process.stdout.write("Jobs:\n");

  for (const job of jobs) {
    const icon = getJobIcon(job.status, job.conclusion);
    if (job.status === "in_progress" || job.status === "queued") {
      process.stdout.write(`  ${icon} ${spinnerChar} ${job.name}\n`);
    } else {
      process.stdout.write(`  ${icon}   ${job.name}\n`);
    }

    // Display steps only if there's a single job
    if (showSteps && job.steps && job.steps.length > 0) {
      // Sort steps by number to show in order
      const sortedSteps = [...job.steps].sort((a, b) => a.number - b.number);
      
      for (const step of sortedSteps) {
        const stepIcon = getStepIcon(step.status, step.conclusion);
        if (step.status === "in_progress" || step.status === "queued") {
          process.stdout.write(`    ${stepIcon} ${spinnerChar} ${step.name}\n`);
        } else {
          process.stdout.write(`    ${stepIcon}   ${step.name}\n`);
        }
      }
    }
  }

  return totalLines;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log("Usage: wait-for-github-action <repo> [workflow-file] [timeout-seconds]");
    console.log("Example: wait-for-github-action editframe/elements release.yaml");
    console.log("Example: wait-for-github-action editframe/telecine deploy.yaml 1800");
    console.log("Example: wait-for-github-action editframe/elements  (gets most recent active run)");
    process.exit(1);
  }

  const repo = args[0];
  const workflowFile = args[1] || undefined;
  const timeoutSeconds = args[2] ? parseInt(args[2], 10) || 3600 : 3600;

  await checkGhInstalled();
  await checkGhAuthenticated();

  if (workflowFile) {
    console.log(
      chalk.blue(`Waiting for workflow '${workflowFile}' to be triggered in ${repo}...`),
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } else {
    console.log(
      chalk.blue(`Finding most recent active workflow run in ${repo}...`),
    );
  }

  const { runId, workflowFile: detectedWorkflow } = await getRunId(repo, workflowFile);
  const workflowUrl = `https://github.com/${repo}/actions/runs/${runId}`;

  console.log("");
  console.log(
    chalk.gray(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ),
  );
  console.log(chalk.bold("Watching workflow run"));
  console.log(
    chalk.gray(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ),
  );
  console.log(`Run ID: ${runId}`);
  console.log(`Workflow: ${detectedWorkflow}`);
  console.log(`URL: ${workflowUrl}`);
  console.log("");

  const startTime = Date.now();
  let lastStatus: string | null = null;
  let lastJobStatuses: Map<string, { status: string; conclusion: string | null }> = new Map();

  while (true) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    // Check timeout
    if (elapsed >= timeoutSeconds) {
      console.error(
        chalk.red(
          `Error: Workflow watch timed out after ${formatElapsed(elapsed)} (${formatElapsed(timeoutSeconds)} limit)`,
        ),
      );
      console.error(`Check the workflow status at: ${workflowUrl}`);
      process.exit(124);
    }

    const status = await getStatus(repo, runId);

    // Print status changes only
    if (status.status !== lastStatus) {
      const statusIcon = getStatusIcon(status.status, status.conclusion);
      let statusText: string;

      switch (status.status) {
        case "queued":
          statusText = "Queued";
          break;
        case "in_progress":
          statusText = "In Progress";
          break;
        case "completed":
          if (status.conclusion === "success") {
            statusText = "Completed";
          } else if (
            status.conclusion === "failure" ||
            status.conclusion === "cancelled"
          ) {
            statusText = "Failed";
          } else {
            statusText = `Completed (${status.conclusion})`;
          }
          break;
        default:
          statusText = status.status;
      }

      const titleText = status.title ? ` | ${status.title}` : "";
      console.log(
        `${statusIcon} ${statusText} | Elapsed: ${formatElapsed(elapsed)}${titleText}`,
      );
      lastStatus = status.status;
    }

    // Print job status changes
    for (const job of status.jobs) {
      const jobKey = job.name;
      const lastJobStatus = lastJobStatuses.get(jobKey);
      
      if (
        !lastJobStatus ||
        lastJobStatus.status !== job.status ||
        lastJobStatus.conclusion !== job.conclusion
      ) {
        const jobIcon = getJobIcon(job.status, job.conclusion);
        let jobStatusText = job.status;
        if (job.status === "completed" && job.conclusion) {
          jobStatusText = job.conclusion;
        }
        console.log(`  ${jobIcon} ${job.name}: ${jobStatusText}`);
        lastJobStatuses.set(jobKey, {
          status: job.status,
          conclusion: job.conclusion,
        });
      }
    }

    // Check if workflow is complete
    if (status.status === "completed") {
      console.log("");
      if (status.conclusion === "success") {
        console.log(chalk.green("✅ GitHub Actions workflow completed successfully"));
        console.log(`   Total time: ${formatElapsed(elapsed)}`);
        process.exit(0);
      } else {
        console.error(chalk.red("❌ GitHub Actions workflow failed!"));
        console.error(`   Conclusion: ${status.conclusion}`);
        console.error(`   Total time: ${formatElapsed(elapsed)}`);
        console.error(`   Check the workflow status at: ${workflowUrl}`);
        process.exit(1);
      }
    }

    // Sleep before next check (check every 5 seconds to reduce output)
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

main().catch((error) => {
  console.error(chalk.red("Error:"), error);
  process.exit(1);
});


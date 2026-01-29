import { execa } from "execa";
import ora, { type Ora } from "ora";
import chalk from "chalk";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/**
 * Detect which package manager was used to invoke the create script.
 * Uses the npm_config_user_agent environment variable set by package managers.
 */
export function getUserPkgManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent;

  if (userAgent) {
    if (userAgent.startsWith("yarn")) return "yarn";
    if (userAgent.startsWith("pnpm")) return "pnpm";
    if (userAgent.startsWith("bun")) return "bun";
  }

  return "npm"; // Default fallback
}

/**
 * Execute a package manager command with a spinner for progress indication.
 */
async function execWithSpinner(
  projectDir: string,
  pkgManager: PackageManager,
  options: {
    args?: string[];
    stdout?: "pipe" | "ignore" | "inherit";
    onDataHandle?: (spinner: Ora) => (data: Buffer) => void;
  }
) {
  const { onDataHandle, args = ["install"], stdout = "pipe" } = options;

  const spinner = ora(`Running ${pkgManager} install...`).start();
  const subprocess = execa(pkgManager, args, { cwd: projectDir, stdout });

  await new Promise<void>((res, rej) => {
    if (onDataHandle) {
      subprocess.stdout?.on("data", onDataHandle(spinner));
    }

    void subprocess.on("error", (e) => rej(e));
    void subprocess.on("close", () => res());
  });

  return spinner;
}

/**
 * Run the appropriate install command for the detected package manager.
 */
async function runInstallCommand(
  pkgManager: PackageManager,
  projectDir: string
): Promise<Ora | null> {
  switch (pkgManager) {
    // npm has built-in progress bar, inherit stderr to show it
    case "npm":
      await execa(pkgManager, ["install"], {
        cwd: projectDir,
        stderr: "inherit",
      });
      return null;

    // pnpm outputs progress to stdout with "Progress" prefix
    case "pnpm":
      return execWithSpinner(projectDir, pkgManager, {
        onDataHandle: (spinner) => (data) => {
          const text = data.toString();
          if (text.includes("Progress")) {
            spinner.text = text.includes("|")
              ? (text.split(" | ")[1] ?? "")
              : text;
          }
        },
      });

    // yarn outputs progress to stdout
    case "yarn":
      return execWithSpinner(projectDir, pkgManager, {
        onDataHandle: (spinner) => (data) => {
          spinner.text = data.toString().trim();
        },
      });

    // bun is fast, just show a spinner
    case "bun":
      return execWithSpinner(projectDir, pkgManager, { stdout: "ignore" });
  }
}

/**
 * Install dependencies in the project directory.
 */
export async function installDependencies(projectDir: string): Promise<boolean> {
  const pkgManager = getUserPkgManager();

  try {
    const installSpinner = await runInstallCommand(pkgManager, projectDir);

    // If the spinner was used, succeed it; otherwise create a new one
    (installSpinner ?? ora()).succeed(
      chalk.green("Successfully installed dependencies!")
    );

    return true;
  } catch (error) {
    process.stderr.write(chalk.yellow("\n⚠ Dependency installation failed\n"));
    process.stderr.write(chalk.dim("You can install manually:\n"));
    process.stderr.write(chalk.cyan(`  cd ${projectDir.split("/").pop()}\n`));
    process.stderr.write(chalk.cyan(`  ${pkgManager} install\n\n`));
    return false;
  }
}

/**
 * Install AI agent skills using the ai-agent-skills CLI.
 */
export async function installAgentSkills(
  projectDir: string,
  agent: string
): Promise<boolean> {
  const spinner = ora("Installing AI agent skills...").start();

  try {
    const agentFlag = agent === "all" ? [] : ["--agent", agent];

    await execa(
      "npx",
      ["ai-agent-skills", "install", "editframe/skills", ...agentFlag],
      { cwd: projectDir }
    );

    spinner.succeed(chalk.green(`AI agent skills installed for ${agent}!`));
    return true;
  } catch (error) {
    spinner.fail(chalk.yellow("Failed to install agent skills"));
    process.stderr.write(chalk.dim("\nYou can install manually:\n"));
    process.stderr.write(
      chalk.cyan(
        `  npx ai-agent-skills install editframe/skills --agent ${agent}\n\n`
      )
    );
    return false;
  }
}

/**
 * Get the appropriate dev command for the package manager.
 */
export function getDevCommand(pkgManager: PackageManager): string {
  return pkgManager === "npm" ? "npm run dev" : `${pkgManager} dev`;
}

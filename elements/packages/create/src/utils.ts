import { execa } from "execa";
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
 * Run the appropriate install command for the detected package manager.
 * Shows full output to the user so they can see progress.
 */
async function runInstallCommand(
  pkgManager: PackageManager,
  projectDir: string
): Promise<void> {
  // Show all output directly to user - no hiding behind spinners
  await execa(pkgManager, ["install"], {
    cwd: projectDir,
    stdout: "inherit",
    stderr: "inherit",
  });
}

/**
 * Install dependencies in the project directory.
 */
export async function installDependencies(projectDir: string): Promise<boolean> {
  const pkgManager = getUserPkgManager();

  try {
    process.stderr.write(chalk.bold(`\nInstalling dependencies with ${pkgManager}...\n\n`));
    
    await runInstallCommand(pkgManager, projectDir);

    process.stderr.write(chalk.green("\n✓ Dependencies installed successfully!\n"));

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
  try {
    process.stderr.write(chalk.bold(`\nInstalling AI agent skills for ${agent}...\n\n`));
    
    const agentFlag = agent === "all" ? [] : ["--agent", agent];

    await execa(
      "npx",
      ["ai-agent-skills", "install", "editframe/skills", ...agentFlag],
      { 
        cwd: projectDir,
        stdout: "inherit",
        stderr: "inherit",
      }
    );

    process.stderr.write(chalk.green(`\n✓ Agent skills installed for ${agent}!\n`));
    return true;
  } catch (error) {
    process.stderr.write(chalk.yellow("\n⚠ Failed to install agent skills\n"));
    process.stderr.write(chalk.dim("You can install manually:\n"));
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

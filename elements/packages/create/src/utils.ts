import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
async function runInstallCommand(pkgManager: PackageManager, projectDir: string): Promise<void> {
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
  } catch (_error) {
    process.stderr.write(chalk.yellow("\n⚠ Dependency installation failed\n"));
    process.stderr.write(chalk.dim("You can install manually:\n"));
    process.stderr.write(chalk.cyan(`  cd ${projectDir.split("/").pop()}\n`));
    process.stderr.write(chalk.cyan(`  ${pkgManager} install\n\n`));
    return false;
  }
}

/**
 * Install AI agent skills by copying bundled skill files into the project.
 * Writes to both .claude/skills/ and .agents/skills/ for broad agent compatibility.
 */
export async function installAgentSkills(projectDir: string): Promise<boolean> {
  try {
    process.stderr.write(chalk.bold("\nInstalling AI agent skills...\n\n"));

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const skillsSource = path.join(__dirname, "skills");
    const skills = await readdir(skillsSource);

    for (const destBase of [".claude/skills", ".agents/skills"]) {
      await mkdir(path.join(projectDir, destBase), { recursive: true });
      for (const skill of skills) {
        await cp(path.join(skillsSource, skill), path.join(projectDir, destBase, skill), {
          recursive: true,
        });
      }
    }

    process.stderr.write(chalk.green("\n✓ AI agent skills installed!\n"));
    return true;
  } catch (_error) {
    process.stderr.write(chalk.yellow("\n⚠ Failed to install agent skills\n"));
    return false;
  }
}

/**
 * Get the appropriate start command for the package manager.
 */
export function getStartCommand(pkgManager: PackageManager): string {
  return pkgManager === "npm" ? "npm start" : `${pkgManager} start`;
}

#!/usr/bin/env node

import { access, cp, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import chalk from "chalk";
import prompts from "prompts";
import {
  getUserPkgManager,
  installDependencies,
  installAgentSkills,
  getDevCommand,
} from "./utils.js";
import { getAgentChoices } from "./detectAgent.js";

function showHelp(templates: string[]) {
  const usage = `
${chalk.bold("Usage:")}
  npm create @editframe -- [template] [options]

${chalk.bold("Options:")}
  -d, --directory <name>    Project directory name
  --skip-install           Skip dependency installation
  --skip-skills            Skip agent skills installation
  --agent <name>           Specify AI agent (cursor, claude, vscode, etc.)
  -y, --yes                Skip all prompts, use defaults
  -h, --help               Show this help message

${chalk.bold("Available Templates:")}
${templates.map((t) => `  - ${t}`).join("\n")}

${chalk.bold("Examples:")}
  ${chalk.dim("# Interactive mode (recommended)")}
  npm create @editframe

  ${chalk.dim("# Specify template")}
  npm create @editframe -- react

  ${chalk.dim("# Full non-interactive")}
  npm create @editframe -- react -d my-app --agent cursor -y

  ${chalk.dim("# Skip auto-installation")}
  npm create @editframe -- react --skip-install --skip-skills
`;

  process.stdout.write(usage);
}

async function checkDirectoryExists(path: string) {
  try {
    await access(path);
    return true;
  } catch (_error) {
    return false;
  }
}

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // List of available starter templates
  const templates = await readdir(path.join(__dirname, "templates"));

  // Parse command line arguments
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
      directory: {
        type: "string",
        short: "d",
      },
      skipInstall: {
        type: "boolean",
        default: false,
      },
      skipSkills: {
        type: "boolean",
        default: false,
      },
      agent: {
        type: "string",
      },
      yes: {
        type: "boolean",
        short: "y",
        default: false,
      },
    },
    allowPositionals: true,
  });

  // Show help if requested
  if (values.help) {
    showHelp(templates);
    process.exit(0);
  }

  // Extract CLI arguments
  const cliTemplate = positionals[0];
  const cliDirectory = values.directory;
  const skipInstall = values.skipInstall;
  const skipSkills = values.skipSkills;
  const cliAgent = values.agent;
  const nonInteractive = values.yes;

  // Validate template if provided
  if (cliTemplate && !templates.includes(cliTemplate)) {
    process.stderr.write(
      chalk.red(`Error: Template "${cliTemplate}" does not exist.\n\n`),
    );
    process.stderr.write(chalk.bold("Available templates:\n"));
    for (const t of templates) {
      process.stderr.write(`  - ${t}\n`);
    }
    process.stderr.write(
      chalk.dim("\nRun with --help for more information.\n"),
    );
    process.exit(1);
  }

  // Build prompts array - ask ALL questions upfront before any network calls
  const promptQuestions: prompts.PromptObject[] = [];

  if (!cliDirectory && !nonInteractive) {
    promptQuestions.push({
      type: "text",
      name: "directoryName",
      message: "Enter the name of the directory to generate into:",
      initial: "my-project",
    });
  }

  if (!cliTemplate && !nonInteractive) {
    promptQuestions.push({
      type: "select",
      name: "templateName",
      message: "Choose a starter template:",
      choices: templates.map((template) => ({
        title: template,
        value: template,
      })),
    });
  }

  // Ask about agent skills upfront (unless skipped via CLI)
  if (!skipSkills && !cliAgent && !nonInteractive) {
    // Get agent choices sorted by detection
    const agentChoices = await getAgentChoices();
    
    promptQuestions.push({
      type: "confirm",
      name: "installSkills",
      message: "Install AI agent skills for better coding assistance?",
      initial: true,
    });
    
    promptQuestions.push({
      type: (_prev, values) => (values.installSkills ? "select" : null),
      name: "agent",
      message: "Which AI coding agent are you using?",
      choices: agentChoices,
      initial: 0,
    });
  }

  // Prompt for all missing information at once
  const answers =
    promptQuestions.length > 0 ? await prompts(promptQuestions) : {};

  // Handle user cancellation
  if (
    (!cliDirectory && !nonInteractive && !answers.directoryName) ||
    (!cliTemplate && !nonInteractive && !answers.templateName)
  ) {
    process.stderr.write(chalk.red("\nCancelled\n"));
    process.exit(1);
  }

  // Use CLI args or prompted values (with defaults for non-interactive mode)
  const directoryName =
    cliDirectory || answers.directoryName || "my-project";
  const templateName = cliTemplate || answers.templateName || templates[0];
  
  // Determine agent selection from CLI or prompts
  let selectedAgent = cliAgent || answers.agent;
  
  // Default to cursor in non-interactive mode if skills not skipped
  if (!skipSkills && !selectedAgent && nonInteractive) {
    selectedAgent = "cursor";
  }

  const targetDir = path.join(process.cwd(), directoryName);
  const templateDir = path.join(__dirname, "templates", templateName);

  const exists = await checkDirectoryExists(targetDir);

  if (exists) {
    process.stderr.write(
      chalk.yellow(`Directory ${targetDir} already exists.\n`),
    );
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: "Directory already exists. Do you want to overwrite it?",
      initial: false,
    });

    if (!overwrite) {
      process.stderr.write(chalk.red("Aborting...\n"));
      process.exit(1);
    }
  }

  process.stderr.write(`\nCreating project in directory: ${targetDir}\n`);
  process.stderr.write(`Using template: ${templateName}\n\n`);

  // Copy the selected template to the target directory
  await cp(templateDir, targetDir, { recursive: true });

  const pkgManager = getUserPkgManager();
  let depsInstalled = false;
  let skillsInstalled = false;

  // All questions have been asked - now do the work
  
  // Install dependencies unless skipped
  if (!skipInstall) {
    depsInstalled = await installDependencies(targetDir);
  }

  // Install agent skills if an agent was selected
  if (!skipSkills && selectedAgent && selectedAgent !== "skip") {
    skillsInstalled = await installAgentSkills(targetDir, selectedAgent);
  }

  // Success message
  process.stderr.write(chalk.green.bold("\n✓ Project created successfully!\n"));

  if (depsInstalled) {
    process.stderr.write(chalk.green("✓ Dependencies installed\n"));
  }

  if (skillsInstalled) {
    process.stderr.write(
      chalk.green(`✓ Agent skills installed (${selectedAgent})\n`)
    );
  }

  process.stderr.write(chalk.bold("\nYour project is ready! 🎉\n\n"));

  // Next steps
  process.stderr.write(chalk.bold("Next steps:\n"));
  process.stderr.write(chalk.cyan(`  cd ${directoryName}\n`));

  if (!depsInstalled) {
    process.stderr.write(chalk.cyan(`  ${pkgManager} install\n`));
  }

  process.stderr.write(chalk.cyan(`  ${getDevCommand(pkgManager)}\n`));

  // Skills info
  if (skillsInstalled) {
    process.stderr.write(chalk.bold("\nAI Agent Skills installed:\n"));
    process.stderr.write(
      chalk.dim("  • elements-composition - HTML/Web Components\n")
    );
    process.stderr.write(
      chalk.dim("  • react-composition - React components\n")
    );
    process.stderr.write(
      chalk.dim("  • motion-design - Animation principles\n")
    );

    process.stderr.write(chalk.bold("\nTry asking your AI agent:\n"));
    process.stderr.write(
      chalk.dim('  "Create a 5-second video with fade-in text"\n')
    );
    process.stderr.write(chalk.dim('  "Add a waveform visualization"\n'));
    process.stderr.write(
      chalk.dim('  "Animate this element with spring physics"\n')
    );
  }

  process.stderr.write(
    chalk.dim("\nDocumentation: https://editframe.com/docs\n")
  );
  process.stderr.write(chalk.dim("Happy coding! 🎬\n\n"));
}

main();

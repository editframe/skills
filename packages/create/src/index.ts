#!/usr/bin/env node

import { access, cp, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import chalk from "chalk";
import prompts from "prompts";

function showHelp(templates: string[]) {
  const usage = `
${chalk.bold("Usage:")}
  npm create @editframe/elements -- [template] [options]

${chalk.bold("Options:")}
  -d, --directory <name>    Project directory name (default: prompts for input)
  -h, --help               Show this help message

${chalk.bold("Available Templates:")}
${templates.map((t) => `  - ${t}`).join("\n")}

${chalk.bold("Examples:")}
  ${chalk.dim("# Interactive mode (prompts for all inputs)")}
  npm create @editframe/elements

  ${chalk.dim("# Specify template, prompt for directory")}
  npm create @editframe/elements -- react-demo

  ${chalk.dim("# Specify both template and directory")}
  npm create @editframe/elements -- react-demo --directory my-app
  npm create @editframe/elements -- react-demo -d my-app

  ${chalk.dim("# Show help")}
  npm create @editframe/elements -- --help
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

  // Build prompts array based on what CLI args were provided
  const promptQuestions: prompts.PromptObject[] = [];

  if (!cliDirectory) {
    promptQuestions.push({
      type: "text",
      name: "directoryName",
      message: "Enter the name of the directory to generate into:",
      initial: "my-project",
    });
  }

  if (!cliTemplate) {
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

  // Prompt for missing information
  const answers =
    promptQuestions.length > 0 ? await prompts(promptQuestions) : {};

  // Use CLI args or prompted values
  const directoryName = cliDirectory || answers.directoryName;
  const templateName = cliTemplate || answers.templateName;

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

  process.stderr.write(`Creating project in directory: ${targetDir}\n`);
  process.stderr.write(`Using template: ${templateName}\n`);

  // Copy the selected template to the target directory
  await cp(templateDir, targetDir, { recursive: true });

  process.stderr.write(chalk.green("\nProject created successfully.\n\n"));

  process.stderr.write(chalk.green("Next steps:\n"));

  process.stderr.write(`  cd ${directoryName}\n`);
  process.stderr.write("  npm install\n");
  process.stderr.write("  npm start\n\n");

  process.stderr.write("Happy hacking!\n");
}

main();

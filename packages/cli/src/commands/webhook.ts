import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { Option, program } from "commander";
import debug from "debug";
import ora from "ora";

import { getClient } from "../utils/index.js";

const log = debug("ef:cli:auth");

export interface APITestWebhhokResult {
  message: string;
}
const topics = [
  "render.created",
  "render.rendering",
  "render.pending",
  "render.failed",
  "render.completed",
];

export const testWebhookURL = async ({
  webhookURL,
  topic,
}: {
  webhookURL: string;
  topic: string;
}) => {
  const response = await getClient().authenticatedFetch(
    "/api/v1/test_webhook",
    {
      method: "POST",
      body: JSON.stringify({
        webhookURL,
        topic,
      }),
    },
  );
  return response.json() as Promise<APITestWebhhokResult>;
};

const webhookCommand = program
  .command("webhook")
  .description("Test webhook URL with a topic")
  .option("-u, --webhookURL <webhookURL>", "Webhook URL")
  .addOption(new Option("-t, --topic <topic>", "Topic").choices(topics))
  .action(async () => {
    const options = webhookCommand.opts();
    log("Options:", options);
    let { webhookURL, topic } = options;

    if (!webhookURL) {
      const answer = await input({ message: "Enter a webhook URL:" });
      webhookURL = answer;
    }

    if (!topic) {
      const answer = await select({
        message: "Select a topic:",
        choices: [...topics.map((topic) => ({ title: topic, value: topic }))],
      });
      topic = answer;
    }

    const spinner = ora("Testing...").start();
    try {
      const apiData = await testWebhookURL({ webhookURL, topic });
      spinner.succeed("Webhook URL is working! 🎉");
      process.stderr.write(chalk.green(`${apiData.message}\n`));
    } catch (error: any) {
      spinner.fail("Webhook URL is not working!");
      process.stderr.write(error?.message);
      process.stderr.write("\n");
      log("Error:", error);
    }
  });

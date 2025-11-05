import chalk from "chalk";
import { program } from "commander";
import debug from "debug";
import ora from "ora";

import { getClient } from "../utils/index.js";

const log = debug("ef:cli:auth");

export interface APIOrgResult {
  apiKeyName: string;
  id: string;
  org_id: string;
  created_at: unknown;
  updated_at: unknown;
  displayName: string;
}

export const getApiData = async () => {
  const response = await getClient().authenticatedFetch("/api/v1/organization");
  return response.json() as Promise<APIOrgResult>;
};

const authCommand = program
  .command("auth")
  .description("Fetch organization data using API token")
  .action(async () => {
    const options = authCommand.opts();
    log("Options:", options);

    const spinner = ora("Loading...").start();

    try {
      const apiData = await getApiData();
      spinner.succeed("You are authenticated! 🎉");
      process.stderr.write(
        chalk.green(`You're using ${apiData.apiKeyName} API key 🚀\n`),
      );
      process.stderr.write(
        chalk.blue(`Welcome to ${apiData.displayName} organization 🎉\n`),
      );
    } catch (error: any) {
      spinner.fail("Authentication failed!");
      log("Error:", error);
    }
  });

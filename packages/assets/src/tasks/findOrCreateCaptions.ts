import { basename } from "node:path";
import { promisify } from "node:util";
import { exec } from "node:child_process";

import debug from "debug";

import { idempotentTask } from "../idempotentTask.js";

const execPromise = promisify(exec);

const log = debug("ef:generateCaptions");

export const generateCaptionDataFromPath = async (absolutePath: string) => {
  const command = `whisper_timestamped --language en --efficient --output_format vtt ${absolutePath}`;
  log(`Running command: ${command}`);
  const { stdout } = await execPromise(command);
  return stdout;
};

const generateCaptionDataTask = idempotentTask({
  label: "captions",
  filename: (absolutePath) => `${basename(absolutePath)}.captions.json`,
  runner: generateCaptionDataFromPath,
});

export const findOrCreateCaptions = async (
  cacheRoot: string,
  absolutePath: string,
) => {
  try {
    return await generateCaptionDataTask(cacheRoot, absolutePath);
  } catch (error) {
    console.trace("Error finding or creating captions", error);
    throw error;
  }
};

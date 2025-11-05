import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { logger } from "@/logging";

export const tempFile = async () => {
  const tempPath = path.join(os.tmpdir(), `${Date.now()}-${Math.random()}`);
  logger.trace({ tempPath }, "Creating temp file");
  const dispose = async () => {
    logger.trace({ tempPath }, "Disposing of temp file");
    await fs.rm(tempPath, { force: true });
  };
  return {
    path: tempPath,
    [Symbol.asyncDispose]: dispose,
    dispose,
  };
};

export const mkTempDir = async (rootDir: string = os.tmpdir()) => {
  const tempPath = path.join(rootDir, `${Date.now()}-${Math.random()}`);
  logger.trace({ tempPath }, "Creating temp directory");
  const dispose = async () => {
    logger.trace({ tempPath }, "Disposing of temp directory");
    await fs.rm(tempPath, { force: true, recursive: true });
  };
  await fs.mkdir(tempPath, { recursive: true });
  return {
    path: tempPath,
    [Symbol.asyncDispose]: dispose,
    dispose,
  };
};
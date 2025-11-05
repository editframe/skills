import { idempotentTask } from "../idempotentTask.js";
import { createReadStream } from "node:fs";

import path from "node:path";

const cacheImageTask = idempotentTask({
  label: "image",
  filename: (absolutePath: string) => path.basename(absolutePath),
  runner: async (absolutePath) => {
    return createReadStream(absolutePath);
  },
});

export const cacheImage = async (cacheRoot: string, absolutePath: string) => {
  try {
    return await cacheImageTask(cacheRoot, absolutePath);
  } catch (error) {
    console.error(error);
    console.trace("Error caching image", error);
    throw error;
  }
};

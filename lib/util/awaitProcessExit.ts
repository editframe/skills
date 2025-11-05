import type { ChildProcess } from "node:child_process";

export const awaitProcessExit = async (
  process: ChildProcess,
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    process.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(code);
      }
    });
    process.once("error", reject);
  });
};

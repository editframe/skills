import type { IncomingMessage } from "connect";

export const forbidRelativePaths = (req: IncomingMessage) => {
  if (req.url?.includes("..")) {
    throw new Error("Relative paths are forbidden");
  }
};

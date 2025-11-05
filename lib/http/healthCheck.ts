import type { IncomingMessage, ServerResponse } from "node:http";

export const healthCheck = (
  req: IncomingMessage,
  res: ServerResponse,
): boolean => {
  if (req.url?.startsWith("/health")) {
    res.end("OK");
    return true;
  }
  return false;
};

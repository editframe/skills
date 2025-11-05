import type { IncomingMessage, ServerResponse } from "node:http";

export const requireActionSecret = (
  req: Request | IncomingMessage,
  res: ServerResponse,
) => {
  const header =
    req instanceof Request
      ? req.headers.get("X-ACTION-SECRET")
      : req.headers["x-action-secret"];
  if (header !== process.env.ACTION_SECRET) {
    res.writeHead(401, { "Content-Type": "text/plain" });
    res.end("Unauthorized");
    return true;
  }
  return false;
};

export const requireActionSecretOrThrow = (req: Request | IncomingMessage) => {
  const header =
    req instanceof Request
      ? req.headers.get("X-ACTION-SECRET")
      : req.headers["x-action-secret"];
  if (header !== process.env.ACTION_SECRET) {
    throw new Response("Unauthorized", { status: 401 });
  }
};

import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

function secretsMatch(provided: string | undefined | null): boolean {
  const expected = process.env.ACTION_SECRET;
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export const requireActionSecret = (
  req: Request | IncomingMessage,
  res: ServerResponse,
) => {
  const header =
    req instanceof Request
      ? req.headers.get("X-ACTION-SECRET")
      : req.headers["x-action-secret"];
  if (!secretsMatch(header as string | undefined)) {
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
  if (!secretsMatch(header as string | undefined)) {
    throw new Response("Unauthorized", { status: 401 });
  }
};

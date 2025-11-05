import type { IncomingMessage } from "node:http";

export async function parseJson(req: IncomingMessage) {
  const body = await new Promise<string>((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

  return JSON.parse(body);
}

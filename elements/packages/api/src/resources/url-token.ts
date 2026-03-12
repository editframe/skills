import debug from "debug";
import { z } from "zod";

import type { Client } from "../client.js";

const log = debug("ef:api:url-token");

export const signingRequestSchema = z.object({
  url: z.string().url(),
  params: z.record(z.string()).optional(),
});

export type SigningRequest = z.infer<typeof signingRequestSchema>;

export interface URLTokenResult {
  token: string;
}

export const createURLToken = async (client: Client, payload: SigningRequest) => {
  log("Creating signed url for", payload.url);
  const response = await client.authenticatedFetch("/api/v1/url-token", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create signed url: ${response.status} ${response.statusText} ${await response.text()}`,
    );
  }

  return ((await response.json()) as URLTokenResult).token;
};

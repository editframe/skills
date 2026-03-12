import debug from "debug";

import type { Client } from "../client.js";

const log = debug("ef:api:url-token");

export interface URLTokenResult {
  token: string;
}

export const createURLToken = async (client: Client, url: string) => {
  log("Creating signed url for", url);
  const response = await client.authenticatedFetch("/api/v1/url-token", {
    method: "POST",
    body: JSON.stringify({
      url,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create signed url: ${response.status} ${response.statusText} ${await response.text()}`,
    );
  }

  return ((await response.json()) as URLTokenResult).token;
};

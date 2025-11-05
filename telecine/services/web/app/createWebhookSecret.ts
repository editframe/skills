import jwt from "jsonwebtoken";

import { db } from "@/sql-client.server";
import { logger } from "@/logging";

export async function createWebhookSigningSecret(token: string, keyId: string) {
  const encodedToken = jwt.sign(
    {
      data: token,
    },
    process.env.HASURA_JWT_SECRET as string,
    { algorithm: "HS256" },
  );

  const maybeApiKey = await db
    .updateTable("identity.api_keys")
    .set({ webhook_secret: encodedToken })
    .where("id", "=", keyId)
    .returningAll()
    .executeTakeFirst();

  return maybeApiKey;
}

export async function updateWebhookSigningSecret(id: string, token: string) {
  const encodedToken = jwt.sign(
    {
      data: token,
    },
    process.env.HASURA_JWT_SECRET as string,
    { algorithm: "HS256" },
  );

  const maybeApiKey = await db
    .updateTable("identity.api_keys")
    .set({ webhook_secret: encodedToken })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();

  if (!maybeApiKey) {
    logger.error("Failed to update API key");
    throw new Error("Failed to update API key");
  }

  return maybeApiKey;
}

export async function getWebhookSigningSecret(
  id: string,
): Promise<string | null> {
  if (!process.env.HASURA_JWT_SECRET) {
    throw new Error("HASURA_JWT_SECRET is not set");
  }
  const maybeApiKey = await db
    .selectFrom("identity.api_keys")
    .where("id", "=", id)
    .select("webhook_secret")
    .executeTakeFirstOrThrow();

  const secret = jwt.verify(
    maybeApiKey.webhook_secret,
    process.env.HASURA_JWT_SECRET,
  );
  if (typeof secret !== "object" || !secret.data) {
    throw new Error("Invalid webhook secret");
  }
  return secret.data;
}

export default getWebhookSigningSecret;

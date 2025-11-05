import { generateApiToken } from "@/util/scryptPromise.server";
import { db } from "@/sql-client.server";
import { logger } from "@/logging";

interface CreateAPIKeyOptions {
  token: string;
  webhookSecret: string;
  name: string;
  orgId: string;
  userId: string;
  webhookUrl: string | null;
  webhookEvents: string[] | [] | undefined;
  expired_at: Date | undefined | null;
}

export async function createApiKey({
  token,
  webhookSecret,
  name,
  orgId,
  userId,
  webhookUrl,
  webhookEvents,
  expired_at,
}: CreateAPIKeyOptions) {
  const [key, salt] = await generateApiToken(token);

  const maybeApiKey = await db
    .insertInto("identity.api_keys")
    .values({
      name,
      org_id: orgId,
      salt,
      hash: key,
      webhook_secret: webhookSecret,
      user_id: userId,
      webhook_url: webhookUrl,
      webhook_events: webhookEvents ?? [],
      expired_at: expired_at || null,
    })
    .returningAll()
    .executeTakeFirst();

  if (!maybeApiKey) {
    logger.error("Failed to create API key");
    throw new Error("Failed to create API key");
  }

  return maybeApiKey;
}

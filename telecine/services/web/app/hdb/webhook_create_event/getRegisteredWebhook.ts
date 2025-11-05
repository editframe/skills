import { db } from "@/sql-client.server";

export type RegisteredWebhook = {
  org_id: string;
  webhook_events: string[];
  webhook_url: string;
  api_key_id: string;
};

export const getRegisteredWebhook = async (
  apiKeyId: string,
): Promise<RegisteredWebhook | undefined> => {
  return db
    .selectFrom("identity.api_keys")
    .where("id", "=", apiKeyId)
    .select([
      "identity.api_keys.org_id",
      "identity.api_keys.id as api_key_id",
      "identity.api_keys.webhook_url",
      "identity.api_keys.webhook_events",
    ])
    .where("identity.api_keys.webhook_url", "is not", null)
    .where("identity.api_keys.webhook_events", "is not", null)
    .$narrowType<{ webhook_url: string; webhook_events: string[] }>()
    .executeTakeFirst();
};

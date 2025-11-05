import { db } from "@/sql-client.server";
import type { RegisteredWebhook } from "./getRegisteredWebhook";
import type { HookedTable, WebhookPayload } from "./webhookBuilders";

interface InsertWebhookEventParams {
  eventId: string;
  tableInfo: HookedTable;
  recordId: string;
  registeredWebhook: RegisteredWebhook;
  payload: WebhookPayload<any, any>;
}

export const insertWebhookEvent = async ({
  eventId,
  tableInfo,
  recordId,
  registeredWebhook,
  payload,
}: InsertWebhookEventParams): Promise<{ id: string }> => {
  const qualifiedTable = `${tableInfo.schema}.${tableInfo.name}` as const;

  return db
    .insertInto("api.webhook_events")
    .values({
      id: eventId,
      org_id: registeredWebhook.org_id,
      qualified_table: qualifiedTable,
      record_id: recordId,
      api_key_id: registeredWebhook.api_key_id,
      json_payload: JSON.stringify(payload),
      url: registeredWebhook.webhook_url,
      topic: payload.topic,
    })
    .onConflict((oc) =>
      oc.column("id").doUpdateSet({
        qualified_table: qualifiedTable,
        record_id: recordId,
        api_key_id: registeredWebhook.api_key_id,
        json_payload: JSON.stringify(payload),
        url: registeredWebhook.webhook_url,
      }),
    )
    .returning(["id"])
    .executeTakeFirstOrThrow();
};

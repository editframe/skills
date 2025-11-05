import { executeSpan } from "@/tracing";
import { getRegisteredWebhook } from "./getRegisteredWebhook";
import { insertWebhookEvent } from "./insertWebhookEvent";
import type { HookedTable, WebhookPayload } from "./webhookBuilders";
import { logger } from "@/logging";

interface CreateWebhookEventParams {
  eventId: string;
  tableInfo: HookedTable;
  recordId: string;
  webhookBuilder: (newData: any, oldData?: any) => WebhookPayload<any, any>;
  newData: any;
  oldData?: any;
}

export const createWebhookEvent = async ({
  eventId,
  tableInfo,
  webhookBuilder,
  newData,
  oldData,
}: CreateWebhookEventParams) => {
  return executeSpan("createWebhookEvent", async (span) => {
    if (!("api_key_id" in newData && typeof newData.api_key_id === "string")) {
      throw new Error("api_key_id is required in webhook data payload");
    }

    const registeredWebhook = await getRegisteredWebhook(
      newData.api_key_id as string,
    );

    if (!registeredWebhook) {
      logger.info("No matching webhooks found");
      return { message: "No matching webhooks found" };
    }

    const payload = webhookBuilder(newData, oldData);

    span.setAttributes({
      registeredWebhook: JSON.stringify(registeredWebhook),
      payload: JSON.stringify(payload),
    });

    if (!registeredWebhook.webhook_events.includes(payload.topic)) {
      logger.info(`No webhooks matching topic: ${payload.topic} found`);
      return { message: `No webhooks matching topic: ${payload.topic} found` };
    }

    const insertedEvent = await insertWebhookEvent({
      eventId,
      tableInfo,
      recordId: newData.id,
      registeredWebhook,
      payload,
    });

    span.setAttributes({
      insertedEvent: JSON.stringify(insertedEvent),
    });

    return {
      message: "webhook_events inserted",
      event: insertedEvent,
    };
  });
};

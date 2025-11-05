import type { Selectable } from "kysely";
import type { ApiWebhookEvents } from "@/sql-client.server/kysely-codegen";
import { WebhookDeliveryController } from "./WebhookDeliveryController";
import { executeSpan } from "@/tracing";
import type { Route } from "./+types/index";

export const action = async ({ request }: Route.ActionArgs) => {
  return executeSpan("webhook_deliver_event", async (span) => {
    const payload = await request.json() as HasuraEvent<Selectable<ApiWebhookEvents>>;
    span.setAttributes({
      payload: JSON.stringify(payload),
    });

    const controller = new WebhookDeliveryController(
      payload.delivery_info,
      payload.event.data.new,
    );

    await controller.execute();

    return { delivered_webhook: true };
  });
};

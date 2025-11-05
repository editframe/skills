import { createWebhookEvent } from "./createWebhookEvent";
import { webhookBuilders } from "./webhookBuilders";
import { hookedTables, opSchema } from "./webhookBuilders";
import { logger } from "@/logging";
import { executeSpan } from "@/tracing";
import type { Video2Renders } from "@/sql-client.server/kysely-codegen";
import type { Selectable } from "kysely";

import type { Route } from "./+types/index";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  return executeSpan("webhook_create_event", async (span) => {
    logger.info("webhook_create_event");

    const payload = await request.json() as HasuraEvent<Selectable<Video2Renders>>;
    const NEW = payload.event.data.new;
    const OLD = payload.event.data.old;

    const op = opSchema.parse(payload.event.op.toLowerCase());
    const tableInfo = hookedTables.parse(payload.table);
    const id = payload.id;

    const webhookName = `${tableInfo.schema}.${tableInfo.name}.${op}` as const;
    span.setAttributes({
      webhookName,
      op,
      id,
      table: JSON.stringify(tableInfo),
      payload: JSON.stringify(payload),
    });
    const webhookBuilder = webhookBuilders[webhookName];

    if (!webhookBuilder) {
      throw new Error(`Unsupported webhook name: ${webhookName}`);
    }

    return createWebhookEvent({
      tableInfo,
      eventId: id,
      recordId: NEW.id ?? "No id",
      webhookBuilder: webhookBuilder,
      newData: NEW,
      oldData: OLD,
    });
  });
};

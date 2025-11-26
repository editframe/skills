import { data } from "react-router";

import { db } from "@/sql-client.server";
import { getWebhookSigningSecret } from "~/createWebhookSecret";
import crypto from "node:crypto";
import { logger } from "@/logging";
import type { Route } from "./+types/test_webhook_url";
import { requireActionSecretOrThrow } from "@/http/requireActionSecret";

export const action = async ({ request }: Route.ActionArgs) => {
  requireActionSecretOrThrow(request);
  const payload = await request.json();
  const { id, webhook_url, org_id } = payload.event.data.new;
  logger.info(payload, "testing webhook");
  const api_key = await db
    .selectFrom("identity.api_keys")
    .where("id", "=", id)
    .select(["id", "webhook_url", "org_id", "webhook_events", "name"])
    .executeTakeFirst();

  if (!api_key) {
    return data(
      {
        message: "API Key not found",
      },
      { status: 404 },
    );
  }
  if (!api_key.webhook_url) {
    return data(
      {
        message: "Webhook URL is not set",
      },
      { status: 200 },
    );
  }
  const playload = {
    topic: "webhook.test",
    data: {
      id,
      org_id,
    },
  };

  try {
    const webhookSecret = await getWebhookSigningSecret(id);
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (webhookSecret) {
      const hmac = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(playload))
        .digest("hex");
      headers = {
        ...headers,
        "X-Webhook-Signature": hmac,
      };
    }
    const res = await fetch(webhook_url, {
      method: "POST",
      headers,
      body: JSON.stringify(playload),
    });
    const statusCode = res.status;

    if (statusCode !== 200) {
      return data(
        {
          message: "Webhook URL is not reachable",
        },
        { status: statusCode },
      );
    }
    return {};
  } catch (e) {
    logger.error(e, "Failed to send webhook");
    throw new Response("Failed to send webhook", { status: 500 });
  }
};

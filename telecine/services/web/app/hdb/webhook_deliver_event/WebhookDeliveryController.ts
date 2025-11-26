import crypto from "node:crypto";
import { db } from "@/sql-client.server";
import type { ApiWebhookEvents } from "@/sql-client.server/kysely-codegen";
import { type Selectable, sql } from "kysely";
import { logger } from "@/logging";

export class WebhookDeliveryController {
  constructor(
    private readonly deliveryInfo: {
      current_retry: number;
      max_retries: number;
    },
    private readonly webhookEvent: Selectable<ApiWebhookEvents>,
  ) {}

  async generateSignature() {
    const webhookSecret = await this.getWebhookSecret();

    return crypto
      .createHmac("sha256", webhookSecret.webhook_secret)
      .update(this.webhookEvent.json_payload)
      .digest("hex");
  }

  async execute() {
    const headers: HeadersInit = {};

    try {
      Object.assign(headers, {
        "Content-Type": "application/json",
        "X-Webhook-Signature": await this.generateSignature(),
      });

      const response = await fetch(this.webhookEvent.url, {
        method: "POST",
        headers,
        body: this.webhookEvent.json_payload,
      });
      if (!response.ok) {
        throw response;
      }

      await this.recordDeliverySuccess(
        headers,
        response,
        this.deliveryInfo.current_retry,
      );

      return { delivered_webhook: true };
    } catch (error) {
      if (error instanceof Response) {
        logger.error(
          {
            webhook_event_id: this.webhookEvent.id,
            status: error.status,
            statusText: error.statusText,
          },
          "Webhook delivery failed",
        );
        await this.recordDeliveryFailure(
          headers,
          error,
          this.deliveryInfo.current_retry,
        );
      } else {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        logger.error({ error }, "Error sending webhook request");
        await this.recordDeliveryFailure(
          {},
          new Response(null, {
            status: 500,
            statusText: `System error: ${message}`,
          }),
          this.deliveryInfo.current_retry,
        );
      }
    }

    if (this.deliveryInfo.current_retry >= this.deliveryInfo.max_retries) {
      logger.error(
        { webhook_event_id: this.webhookEvent.id },
        "Webhook delivery failed after max retries",
      );
      await this.recordEventFailure();
    }
  }

  recordEventFailure() {
    return db
      .updateTable("api.webhook_events")
      .where("id", "=", this.webhookEvent.id)
      .set({
        failed_at: sql`now()`,
      })
      .execute();
  }

  async recordDeliveryFailure(
    headers: Record<string, string>,
    response: Response,
    current_retry: number,
  ) {
    return db
      .insertInto("api.webhook_event_deliveries")
      .values({
        webhook_event_id: this.webhookEvent.id,
        request_headers: JSON.stringify(headers),
        response_status: response.status,
        response_headers: JSON.stringify(response.headers),
        response_text: await response.text(),
        status: "failure",
        attempt_number: current_retry,
      })
      .execute();
  }

  async recordDeliverySuccess(
    headers: Record<string, string>,
    response: Response,
    current_retry: number,
  ) {
    await db
      .insertInto("api.webhook_event_deliveries")
      .values({
        webhook_event_id: this.webhookEvent.id,
        request_headers: JSON.stringify(headers),
        response_status: response.status,
        response_headers: JSON.stringify(
          Object.fromEntries(response.headers.entries()),
        ),
        response_text: await response.text(),
        status: "success",
        attempt_number: current_retry,
      })
      .execute();

    await db
      .updateTable("api.webhook_events")
      .where("id", "=", this.webhookEvent.id)
      .set({
        delivered_at: sql`now()`,
      })
      .execute();
  }

  getWebhookSecret() {
    return db
      .selectFrom("identity.api_keys")
      .where("id", "=", this.webhookEvent.api_key_id)
      .select("webhook_secret")
      .executeTakeFirstOrThrow();
  }
}

import crypto from "node:crypto";
import { describe, test, expect } from "vitest";
import { WebhookDeliveryController } from "./WebhookDeliveryController";

import { apiKey, org } from "TEST/@editframe/api/client";
import { db } from "@/sql-client.server";
import { useMSW } from "TEST/util/useMSW";
import { http, HttpResponse } from "msw";
import type {
  ApiWebhookEventDeliveries,
  ApiWebhookEvents,
} from "@/sql-client.server/kysely-codegen";
import type { Insertable, Selectable } from "kysely";

function createWebhookEvent(
  values: Partial<Insertable<"api.webhook_events">> = {},
) {
  return db
    .insertInto("api.webhook_events")
    .values({
      url: "https://example.com",
      json_payload: JSON.stringify({ test: "test" }),
      api_key_id: apiKey.id,
      qualified_table: "test.webhook",
      record_id: "test-id1",
      topic: "render.created",
      org_id: org.id,
      ...values,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

function webhookDelivery(
  event: Selectable<ApiWebhookEvents>,
  delivery: Partial<ApiWebhookEventDeliveries>,
) {
  return {
    attempt_number: 1,
    created_at: expect.any(Date),
    id: expect.any(String),
    request_headers: expect.stringMatching(
      /{"Content-Type":"application\/json","X-Webhook-Signature":"[a-f0-9]{64}"}/,
    ),
    response_headers: "{}",
    response_status: 200,
    response_text: "{}",
    status: "success",
    webhook_event_id: event.id,
    ...delivery,
  };
}

describe("WebhookDeliverController", () => {
  const server = useMSW();
  test("records successful delivery of a webhook", async () => {
    server.use(
      http.post("https://example.com", () =>
        HttpResponse.json(
          { test: "response" },
          { status: 201, headers: { "x-test": "test" } },
        ),
      ),
    );

    const webhookEvent = await createWebhookEvent();

    const controller = new WebhookDeliveryController(
      { current_retry: 1, max_retries: 3 },
      webhookEvent,
    );

    await controller.execute();

    await expect(
      db
        .selectFrom("api.webhook_events")
        .where("id", "=", webhookEvent.id)
        .selectAll()
        .executeTakeFirstOrThrow(),
    ).resolves.toEqual({
      ...webhookEvent,
      updated_at: expect.any(Date),
      delivered_at: expect.any(Date),
    });

    await expect(
      db
        .selectFrom("api.webhook_event_deliveries")
        .where("webhook_event_id", "=", webhookEvent.id)
        .orderBy("attempt_number", "asc")
        .selectAll()
        .execute(),
    ).resolves.toEqual([
      webhookDelivery(webhookEvent, {
        response_status: 201,
        response_text: '{"test":"response"}',
        response_headers:
          '{"content-length":"19","content-type":"application/json","x-test":"test"}',
      }),
    ]);
  });

  test("records delivery retries", async () => {
    server.use(
      http.post(
        "https://example.com",
        () => HttpResponse.json({ test: "response" }, { status: 500 }),
        { once: true },
      ),
      http.post("https://example.com", () =>
        HttpResponse.json({ test: "response" }, { status: 200 }),
      ),
    );

    const webhookEvent = await createWebhookEvent();

    const controller = new WebhookDeliveryController(
      { current_retry: 1, max_retries: 3 },
      webhookEvent,
    );

    await controller.execute();

    const controller2 = new WebhookDeliveryController(
      { current_retry: 2, max_retries: 3 },
      webhookEvent,
    );

    await controller2.execute();

    await expect(
      db
        .selectFrom("api.webhook_events")
        .where("id", "=", webhookEvent.id)
        .selectAll()
        .executeTakeFirstOrThrow(),
    ).resolves.toEqual({
      ...webhookEvent,
      updated_at: expect.any(Date),
      delivered_at: expect.any(Date),
    });

    await expect(
      db
        .selectFrom("api.webhook_event_deliveries")
        .where("webhook_event_id", "=", webhookEvent.id)
        .orderBy("attempt_number", "asc")
        .selectAll()
        .execute(),
    ).resolves.toEqual([
      webhookDelivery(webhookEvent, {
        attempt_number: 1,
        status: "failure",
        response_status: 500,
        response_headers: "{}",
        response_text: '{"test":"response"}',
      }),
      webhookDelivery(webhookEvent, {
        attempt_number: 2,
        status: "success",
        response_status: 200,
        response_text: '{"test":"response"}',
        response_headers:
          '{"content-length":"19","content-type":"application/json"}',
      }),
    ]);
  });

  test("records retry exhaustion", async () => {
    server.use(
      http.post("https://example.com", () =>
        HttpResponse.json({ test: "response" }, { status: 500 }),
      ),
    );

    const webhookEvent = await createWebhookEvent();

    const controller = new WebhookDeliveryController(
      { current_retry: 1, max_retries: 1 },
      webhookEvent,
    );

    await controller.execute();

    await expect(
      db
        .selectFrom("api.webhook_events")
        .where("id", "=", webhookEvent.id)
        .selectAll()
        .executeTakeFirstOrThrow(),
    ).resolves.toEqual({
      ...webhookEvent,
      updated_at: expect.any(Date),
      delivered_at: null,
      failed_at: expect.any(Date),
    });

    await expect(
      db
        .selectFrom("api.webhook_event_deliveries")
        .where("webhook_event_id", "=", webhookEvent.id)
        .orderBy("attempt_number", "asc")
        .selectAll()
        .execute(),
    ).resolves.toEqual([
      webhookDelivery(webhookEvent, {
        attempt_number: 1,
        status: "failure",
        response_status: 500,
        response_headers: "{}",
        response_text: '{"test":"response"}',
      }),
    ]);
  });

  test("creates webhooks that can be verified by signature", async () => {
    const webhookEvent = await createWebhookEvent();

    const controller = new WebhookDeliveryController(
      { current_retry: 1, max_retries: 3 },
      webhookEvent,
    );

    const secret = await controller.getWebhookSecret();
    const signature = await controller.generateSignature();

    const hash = crypto
      .createHmac("sha256", secret.webhook_secret)
      .update(JSON.stringify(JSON.parse(webhookEvent.json_payload)))
      .digest("hex");

    expect(signature).toBe(hash);
  });

  test("records delivery failure when fetch throws an error", async () => {
    server.use(
      http.post("https://example.com", () => {
        return new Response(null, { status: 0, statusText: "Failed ot fetch" });
      }),
    );

    const webhookEvent = await createWebhookEvent({
      url: "BAD_URL",
    });

    const controller = new WebhookDeliveryController(
      { current_retry: 1, max_retries: 1 },
      webhookEvent,
    );

    await controller.execute();

    const event = await db
      .selectFrom("api.webhook_events")
      .where("id", "=", webhookEvent.id)
      .selectAll()
      .executeTakeFirstOrThrow();

    expect(event).toEqual({
      ...webhookEvent,
      updated_at: expect.any(Date),
      failed_at: expect.any(Date),
      delivered_at: null,
    });

    const deliveries = await db
      .selectFrom("api.webhook_event_deliveries")
      .where("webhook_event_id", "=", webhookEvent.id)
      .orderBy("attempt_number", "asc")
      .selectAll()
      .execute();

    expect(deliveries).toEqual([
      {
        id: expect.any(String),
        created_at: expect.any(Date),
        response_status: 500,
        response_text: "",
        response_headers: "{}",
        request_headers: "{}",
        status: "failure",
        webhook_event_id: webhookEvent.id,
        attempt_number: 1,
      },
    ]);
  });
});

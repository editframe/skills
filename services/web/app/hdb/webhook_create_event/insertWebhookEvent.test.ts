import { describe } from "node:test";
import { apiKey, org } from "TEST/@editframe/api/client";
import { insertWebhookEvent } from "./insertWebhookEvent";
import { expect, test } from "vitest";
import { uuidv4 } from "lib0/random.js";
import { db } from "@/sql-client.server";

describe("insertWebhookEvent", () => {
  test("inserts a webhook event into the database", async () => {
    const eventId = uuidv4();
    await expect(
      insertWebhookEvent({
        eventId,
        tableInfo: {
          schema: "video2",
          name: "renders",
        },
        recordId: "1",
        registeredWebhook: {
          org_id: org.id,
          webhook_events: ["users.created"],
          webhook_url: "https://example.com",
          api_key_id: apiKey.id,
        },
        payload: {
          data: {
            name: "John Doe",
            email: "john.doe@example.com",
          },
          topic: "render.created",
        } as any,
      }),
    ).resolves.toEqual({
      id: eventId,
    });
  });

  test("Gracefully handles creating a duplicate webhook event", async () => {
    const eventId = uuidv4();
    const eventParams = {
      eventId,
      tableInfo: {
        schema: "video2" as const,
        name: "renders" as const,
      },
      recordId: "1",
      registeredWebhook: {
        org_id: org.id,
        webhook_events: ["users.created"],
        webhook_url: "https://example.com",
        api_key_id: apiKey.id,
      },
      payload: {
        data: {
          name: "John Doe",
          email: "john.doe@example.com",
        },
        topic: "render.created",
      } as any,
    };
    await expect(insertWebhookEvent(eventParams)).resolves.toEqual({
      id: eventId,
    });
    await expect(insertWebhookEvent(eventParams)).resolves.toEqual({
      id: eventId,
    });
    await expect(
      db
        .selectFrom("api.webhook_events")
        .selectAll()
        .where("id", "=", eventId)
        .executeTakeFirstOrThrow(),
    ).resolves.toEqual({
      api_key_id: apiKey.id,
      delivered_at: null,
      failed_at: null,
      created_at: expect.any(Date),
      updated_at: expect.any(Date),
      id: eventId,
      org_id: org.id,
      json_payload: JSON.stringify(eventParams.payload),
      qualified_table: "video2.renders",
      record_id: "1",
      topic: "render.created",
      url: "https://example.com",
    });
  });
});

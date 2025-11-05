import { describe, test, expect, vi } from "vitest";
import * as routeModule from "./index";
import * as getRegisteredWebhookModule from "./getRegisteredWebhook";
import * as insertWebhookEventModule from "./insertWebhookEvent";
import { ZodError } from "zod";

interface MakeRequestOptions {
  id?: string;
  schema?: string;
  table?: string;
  op?: string;
  newData?: any;
  oldData?: any;
}
const makeRequest = ({
  id,
  schema,
  table,
  op,
  newData,
  oldData,
}: MakeRequestOptions = {}) => {
  return {
    headers: new Headers({
      "x-action-secret": process.env.ACTION_SECRET!,
      "content-type": "application/json",
    }),
    json: async () => ({
      id: id ?? "123",
      table: { schema: schema ?? "video2", name: table ?? "renders" },
      data: {
        op: op ?? "INSERT",
        new: {
          id: "render-123",
          api_key_id: "test-api-key-id",
          status: "created",
          duration_ms: 1000,
          height: 1920,
          width: 1080,
          fps: 30,
          ...newData,
        },
        old: oldData,
      },
    }),
  } as Request;
};

describe.skip("webhook_create_event", () => {
  test("Responds okay with a message if no registered webhooks are found", async () => {
    // Mock the createWebhookEvent function
    vi.spyOn(
      getRegisteredWebhookModule,
      "getRegisteredWebhook",
    ).mockResolvedValue(undefined);

    // Call the function with the mock request
    await expect(
      routeModule.action({ request: makeRequest() } as any),
    ).resolves.toEqual({ message: "No matching webhooks found" });
  });

  test("Returns okay if webhook is registered, but doesn't match topic", async () => {
    vi.spyOn(
      getRegisteredWebhookModule,
      "getRegisteredWebhook",
    ).mockResolvedValue({
      org_id: "test-org-id",
      webhook_events: ["renders.deleted"],
      webhook_url: "test-webhook-url",
      api_key_id: "test-api-key-id",
    });

    await expect(
      routeModule.action({ request: makeRequest() } as any),
    ).resolves.toEqual({
      message: "No webhooks matching topic: render.created found",
    });
  });

  test("Throws if getRegisteredWebhook throws", async () => {
    vi.spyOn(
      getRegisteredWebhookModule,
      "getRegisteredWebhook",
    ).mockRejectedValue(new Error("Failed to get registered webhook"));

    await expect(
      routeModule.action({ request: makeRequest() } as any),
    ).rejects.toThrow("Failed to get registered webhook");
  });

  test("Throws if insertWebhookEvent throws", async () => {
    vi.spyOn(
      getRegisteredWebhookModule,
      "getRegisteredWebhook",
    ).mockResolvedValue({
      org_id: "test-org-id",
      webhook_events: ["render.created"],
      webhook_url: "test-webhook-url",
      api_key_id: "test-api-key-id",
    });
    vi.spyOn(insertWebhookEventModule, "insertWebhookEvent").mockRejectedValue(
      new Error("Failed to insert webhook event"),
    );

    await expect(
      routeModule.action({ request: makeRequest() } as any),
    ).rejects.toThrow("Failed to insert webhook event");
  });

  test("Throws error if webhook name is not supported", async () => {
    await expect(
      routeModule.action({
        request: makeRequest({ table: "bad_table" }),
      } as any),
    ).rejects.toThrow(ZodError);
  });

  test("Throws if operation is not supported", async () => {
    await expect(
      routeModule.action({
        request: makeRequest({ op: "BAD_OP" }),
      } as any),
    ).rejects.toThrow(ZodError);
  });

  test("Throws if valid webhook is not registered", async () => {
    await expect(
      routeModule.action({
        request: makeRequest({
          schema: "video2",
          table: "renders",
          op: "delete",
        }),
      } as any),
    ).rejects.toThrow("Unsupported webhook name: video2.renders.delete");
  });

  test("Throws if api_key_id is not present", async () => {
    await expect(
      routeModule.action({
        request: makeRequest({
          newData: {
            api_key_id: undefined,
          },
        }),
      } as any),
    ).rejects.toThrow("api_key_id is required in webhook data payload");
  });
});

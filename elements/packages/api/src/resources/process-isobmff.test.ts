import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { Client } from "../client.js";
import { getIsobmffProcessInfo, getIsobmffProcessProgress } from "./process-isobmff.js";

const client = new Client("ef_TEST_TOKEN", "http://localhost");
const server = setupServer();

describe("process-isobmff", () => {
  beforeAll(() => {
    server.listen();
    process.env.EF_TOKEN = "ef_SECRET_TOKEN";
    process.env.EF_HOST = "http://localhost:3000";
  });
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());
  describe("getIsobmffProcessInfo", () => {
    test("returns the process info", async () => {
      server.use(
        http.get("http://localhost/api/v1/process_isobmff/123", async () => {
          return HttpResponse.json({
            id: "123",
            created_at: "2021-01-01T00:00:00.000Z",
            updated_at: "2021-01-01T00:00:00.000Z",
          });
        }),
      );
      const info = await getIsobmffProcessInfo(client, "123");
      expect(info).toEqual({
        id: "123",
        created_at: "2021-01-01T00:00:00.000Z",
        updated_at: "2021-01-01T00:00:00.000Z",
      });
    });

    test("throws when the server returns an error", async () => {
      server.use(
        http.get("http://localhost/api/v1/process_isobmff/123", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );
      await expect(getIsobmffProcessInfo(client, "123")).rejects.toThrow(
        "Failed to get isobmff process info 500 Internal Server Error",
      );
    });
  });

  describe("getIsobmffProcessProgress", () => {
    test("returns the progress", async () => {
      server.use(
        http.get("http://localhost/api/v1/process_isobmff/123/progress", async () => {
          return HttpResponse.text("event: complete\ndata: {}\n\n");
        }),
      );
      const progress = await getIsobmffProcessProgress(client, "123");
      await expect(progress.whenComplete()).resolves.toEqual([{ type: "complete", data: {} }]);
    });
  });
});

import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import { Client } from "../client.js";
import { createURLToken } from "./url-token.js";

const server = setupServer();
const client = new Client("ef_TEST_TOKEN", "http://localhost");

describe("URL Token", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe("createURLToken", () => {
    test("Throws when server returns an error", async () => {
      server.use(
        http.post("http://localhost/api/v1/url-token", () =>
          HttpResponse.text("Internal Server Error", { status: 500 }),
        ),
      );

      await expect(createURLToken(client, "http://example.com")).rejects.toThrowError(
        "Failed to create signed url: 500 Internal Server Error Internal Server Error",
      );
    });

    test("Returns token from the http response", async () => {
      server.use(
        http.post("http://localhost/api/v1/url-token", () =>
          HttpResponse.json({ token: "test-token" }, { status: 200, statusText: "OK" }),
        ),
      );

      await expect(createURLToken(client, "http://example.com")).resolves.toBe("test-token");
    });
  });
});

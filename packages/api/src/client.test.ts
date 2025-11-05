import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import { Client } from "./client.js";

const server = setupServer();

describe("Client", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test("Throws on improperly formed tokens", () => {
    expect(() => new Client("BAD_TOKEN")).toThrowError(
      "Invalid token format. Must look like: ef_{}_{}",
    );
  });

  test("Attaches token to requests", async () => {
    const client = new Client("ef_TEST_TOKEN");

    server.use(
      http.get("http://example.org", (ctx) => {
        return HttpResponse.text(ctx.request.headers.get("Authorization"), {
          status: 200,
        });
      }),
    );

    const response = await client.authenticatedFetch("http://example.org");

    expect(await response.text()).toBe("Bearer ef_TEST_TOKEN");
  });

  test("Passes through request init", async () => {
    const client = new Client("ef_TEST_TOKEN");

    server.use(
      http.post("http://example.org", async (ctx) => {
        return HttpResponse.json(await ctx.request.json(), { status: 200 });
      }),
    );

    const response = await client.authenticatedFetch("http://example.org", {
      method: "POST",
      body: JSON.stringify({ hello: "world" }),
    });

    expect(await response.json()).toEqual({ hello: "world" });
  });
});

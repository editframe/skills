import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { sendTelemetry } from "./render.js";

const server = setupServer();

describe("sendTelemetry", () => {
  let capturedAuthHeader: string | null | undefined;

  beforeAll(() => {
    server.listen();
  });
  afterAll(() => server.close());
  afterEach(() => {
    server.resetHandlers();
    capturedAuthHeader = undefined;
  });

  it("sends Authorization header when token is provided", async () => {
    server.use(
      http.post("https://editframe.com/api/v1/telemetry", ({ request }) => {
        capturedAuthHeader = request.headers.get("authorization");
        return HttpResponse.json({}, { status: 200 });
      }),
    );

    await sendTelemetry("https://editframe.com", "ef_test_token", {
      render_path: "cli",
    });

    expect(capturedAuthHeader).toBe("Bearer ef_test_token");
  });

  it("sends no Authorization header when token is undefined", async () => {
    server.use(
      http.post("https://editframe.com/api/v1/telemetry", ({ request }) => {
        capturedAuthHeader = request.headers.get("authorization");
        return HttpResponse.json({}, { status: 200 });
      }),
    );

    await sendTelemetry("https://editframe.com", undefined, {
      render_path: "cli",
    });

    expect(capturedAuthHeader).toBeNull();
  });
});

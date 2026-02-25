import { describe, test, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockValues = vi.fn(() => ({ execute: mockExecute }));
  const mockInsertInto = vi.fn(() => ({ values: mockValues }));
  const mockLoggerError = vi.fn();
  return { mockExecute, mockValues, mockInsertInto, mockLoggerError };
});

vi.mock("@/sql-client.server", () => ({
  db: { insertInto: mocks.mockInsertInto },
}));

vi.mock("@/logging", () => ({
  logger: { error: mocks.mockLoggerError },
}));

vi.mock("~/middleware/context", () => ({
  apiIdentityContext: "apiIdentityContext",
}));

import { action } from "../api/v1/telemetry";
import { apiIdentityContext } from "~/middleware/context";

function makeSession(overrides: Record<string, unknown> = {}) {
  return { oid: "org-123", cid: "key-456", uid: "user-789", ...overrides };
}

function makeContext(session: ReturnType<typeof makeSession>) {
  const store = new Map<unknown, unknown>();
  store.set(apiIdentityContext, session);
  return { get: (key: unknown) => store.get(key) };
}

function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/v1/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockExecute.mockResolvedValue(undefined);
});

describe("POST /api/v1/telemetry", () => {
  describe("required fields", () => {
    test("accepts a minimal valid event with render_path only", async () => {
      const result = await action({
        request: makeRequest({ render_path: "client" }),
        context: makeContext(makeSession()),
      } as any);
      expect(result.ok).toBe(true);
    });

    test("rejects missing render_path", async () => {
      await expect(
        action({
          request: makeRequest({}),
          context: makeContext(makeSession()),
        } as any),
      ).rejects.toThrow();
    });

    test("rejects invalid render_path value", async () => {
      await expect(
        action({
          request: makeRequest({ render_path: "unknown-path" }),
          context: makeContext(makeSession()),
        } as any),
      ).rejects.toThrow();
    });
  });

  describe("valid render_path values", () => {
    test.each(["client", "cli", "server"])(
      "accepts render_path=%s",
      async (render_path) => {
        const result = await action({
          request: makeRequest({ render_path }),
          context: makeContext(makeSession()),
        } as any);
        expect(result.ok).toBe(true);
      },
    );
  });

  describe("optional fields", () => {
    test("stores duration_ms when provided", async () => {
      await action({
        request: makeRequest({ render_path: "cli", duration_ms: 5000 }),
        context: makeContext(makeSession()),
      } as any);
      expect(mocks.mockValues.mock.calls[0][0].duration_ms).toBe(5000);
    });

    test("stores width/height/fps when provided", async () => {
      await action({
        request: makeRequest({ render_path: "client", width: 1920, height: 1080, fps: 30 }),
        context: makeContext(makeSession()),
      } as any);
      const row = mocks.mockValues.mock.calls[0][0];
      expect(row.width).toBe(1920);
      expect(row.height).toBe(1080);
      expect(row.fps).toBe(30);
    });

    test("stores feature_usage when provided", async () => {
      const feature_usage = { hasVideo: true, hasAudio: false, elementCount: 3 };
      await action({
        request: makeRequest({ render_path: "client", feature_usage }),
        context: makeContext(makeSession()),
      } as any);
      expect(mocks.mockValues.mock.calls[0][0].feature_usage).toEqual(feature_usage);
    });

    test("stores sdk_version and cli_version when provided", async () => {
      await action({
        request: makeRequest({
          render_path: "cli",
          sdk_version: "0.40.5",
          cli_version: "0.40.5",
        }),
        context: makeContext(makeSession()),
      } as any);
      const row = mocks.mockValues.mock.calls[0][0];
      expect(row.sdk_version).toBe("0.40.5");
      expect(row.cli_version).toBe("0.40.5");
    });
  });

  describe("identity and IP extraction", () => {
    test("always records org_id and api_key_id from session", async () => {
      await action({
        request: makeRequest({ render_path: "client" }),
        context: makeContext(makeSession({ oid: "org-abc", cid: "key-def" })),
      } as any);
      const row = mocks.mockValues.mock.calls[0][0];
      expect(row.org_id).toBe("org-abc");
      expect(row.api_key_id).toBe("key-def");
    });

    test("records first IP from x-forwarded-for header", async () => {
      await action({
        request: makeRequest(
          { render_path: "client" },
          { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
        ),
        context: makeContext(makeSession()),
      } as any);
      expect(mocks.mockValues.mock.calls[0][0].ip_address).toBe("203.0.113.1");
    });

    test("falls back to x-real-ip when x-forwarded-for is absent", async () => {
      await action({
        request: makeRequest({ render_path: "cli" }, { "x-real-ip": "198.51.100.5" }),
        context: makeContext(makeSession()),
      } as any);
      expect(mocks.mockValues.mock.calls[0][0].ip_address).toBe("198.51.100.5");
    });

    test("records origin from Origin header", async () => {
      await action({
        request: makeRequest(
          { render_path: "client" },
          { origin: "https://app.example.com" },
        ),
        context: makeContext(makeSession()),
      } as any);
      expect(mocks.mockValues.mock.calls[0][0].origin).toBe("https://app.example.com");
    });
  });

  describe("response", () => {
    test("returns { ok: true } on success", async () => {
      const result = await action({
        request: makeRequest({ render_path: "server" }),
        context: makeContext(makeSession()),
      } as any);
      expect(result).toEqual({ ok: true });
    });

    test("returns { ok: true } even when db insert fails (silent fail)", async () => {
      mocks.mockExecute.mockRejectedValue(new Error("DB connection lost"));
      const result = await action({
        request: makeRequest({ render_path: "client" }),
        context: makeContext(makeSession()),
      } as any);
      expect(result).toEqual({ ok: true });
    });

    test("logs db errors via logger.error", async () => {
      const dbError = new Error("DB connection lost");
      mocks.mockExecute.mockRejectedValue(dbError);
      await action({
        request: makeRequest({ render_path: "client" }),
        context: makeContext(makeSession()),
      } as any);
      expect(mocks.mockLoggerError).toHaveBeenCalledWith(dbError, "telemetry insert failed");
    });
  });

  describe("non-POST methods", () => {
    test("rejects GET requests with 405", async () => {
      const request = new Request("http://localhost/api/v1/telemetry", { method: "GET" });
      const context = makeContext(makeSession());
      await expect(action({ request, context } as any)).rejects.toMatchObject({
        status: 405,
      });
    });
  });

  describe("malformed input", () => {
    test("rejects non-JSON body with 400", async () => {
      const request = new Request("http://localhost/api/v1/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });
      await expect(
        action({ request, context: makeContext(makeSession()) } as any),
      ).rejects.toMatchObject({ status: 400 });
    });

    test("rejects empty body with 400", async () => {
      const request = new Request("http://localhost/api/v1/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "",
      });
      await expect(
        action({ request, context: makeContext(makeSession()) } as any),
      ).rejects.toMatchObject({ status: 400 });
    });

    test("silently drops numeric fields sent as strings", async () => {
      await action({
        request: makeRequest({ render_path: "client", duration_ms: "5000", width: "1920" }),
        context: makeContext(makeSession()),
      } as any);
      const row = mocks.mockValues.mock.calls[0][0];
      expect(row.duration_ms).toBeNull();
      expect(row.width).toBeNull();
    });
  });

  describe("IP and origin edge cases", () => {
    test("stores null ip_address when no IP headers present", async () => {
      await action({
        request: makeRequest({ render_path: "client" }),
        context: makeContext(makeSession()),
      } as any);
      expect(mocks.mockValues.mock.calls[0][0].ip_address).toBeNull();
    });

    test("stores null origin when Origin header is absent", async () => {
      await action({
        request: makeRequest({ render_path: "client" }),
        context: makeContext(makeSession()),
      } as any);
      expect(mocks.mockValues.mock.calls[0][0].origin).toBeNull();
    });

    test("x-forwarded-for takes precedence over x-real-ip", async () => {
      await action({
        request: makeRequest(
          { render_path: "client" },
          { "x-forwarded-for": "203.0.113.1", "x-real-ip": "198.51.100.5" },
        ),
        context: makeContext(makeSession()),
      } as any);
      expect(mocks.mockValues.mock.calls[0][0].ip_address).toBe("203.0.113.1");
    });

    test("handles single-IP x-forwarded-for without comma", async () => {
      await action({
        request: makeRequest({ render_path: "cli" }, { "x-forwarded-for": "10.0.0.1" }),
        context: makeContext(makeSession()),
      } as any);
      expect(mocks.mockValues.mock.calls[0][0].ip_address).toBe("10.0.0.1");
    });
  });
});

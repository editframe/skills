import { describe, test, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { generateApiToken } from "./scryptPromise.server";

const APP_JWT_SECRET = process.env.APPLICATION_JWT_SECRET!;

// Build a chainable mock for kysely query builder
function createChainableMock() {
  const mock: Record<string, ReturnType<typeof vi.fn>> = {};
  const chain = new Proxy(mock, {
    get(target, prop: string) {
      if (!target[prop]) {
        target[prop] = vi.fn().mockReturnValue(chain);
      }
      return target[prop];
    },
  });
  return chain as Record<string, ReturnType<typeof vi.fn>> & {
    executeTakeFirst: ReturnType<typeof vi.fn>;
  };
}

const mockDbChain = createChainableMock();

vi.mock("@/sql-client.server", () => ({
  db: {
    selectFrom: vi.fn(() => mockDbChain),
  },
}));

import { db } from "@/sql-client.server";
const mockSelectFrom = (
  db as unknown as { selectFrom: ReturnType<typeof vi.fn> }
).selectFrom;

// Import after mocking
import {
  parseRequestSession,
  createSessionCookie,
  getSession,
} from "./session";

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/test", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectFrom.mockReturnValue(mockDbChain);
  // Reset all chain mock return values
  for (const key of Object.keys(mockDbChain)) {
    if (typeof mockDbChain[key]?.mockReturnValue === "function") {
      mockDbChain[key]!.mockReturnValue(mockDbChain);
    }
  }
  mockDbChain.executeTakeFirst!.mockResolvedValue(null);
});

describe("parseRequestSession", () => {
  describe("no auth headers or cookies", () => {
    test("returns undefined when request has no auth and no cookie", async () => {
      const request = makeRequest();
      const result = await parseRequestSession(request);
      expect(result).toBeUndefined();
    });
  });

  describe("Authorization header — ef_ API token path", () => {
    test("returns api session for valid ef_ token", async () => {
      const apiTokenValue = "ef_d6659715d9b74e9a8513597e5c6c5656";
      const apiKeyId = "36dc5699-418f-478f-951c-e800acb110c5";
      const fullToken = `${apiTokenValue}_${apiKeyId}`;

      // Generate a real scrypt hash for this token
      const [hash, salt] = await generateApiToken(apiTokenValue);

      mockDbChain.executeTakeFirst!.mockResolvedValue({
        salt,
        hash,
        id: apiKeyId,
        user_id: "user-123",
        expired_at: null,
        org_id: "org-789",
        email_address: "user@example.com",
        confirmed_at: new Date("2024-01-01"),
        is_paid: true,
      });

      const request = makeRequest({
        Authorization: `Bearer ${fullToken}`,
      });

      const result = await parseRequestSession(request);
      expect(result).toEqual({
        type: "api",
        oid: "org-789",
        uid: "user-123",
        cid: apiKeyId,
        email: "user@example.com",
        confirmed: true,
        expired_at: null,
        is_paid: true,
      });
    });

    test("returns undefined for ef_ token not found in DB", async () => {
      const request = makeRequest({
        Authorization: "Bearer ef_abc123_key456",
      });

      mockDbChain.executeTakeFirst!.mockResolvedValue(null);

      const result = await parseRequestSession(request);
      expect(result).toBeUndefined();
    });

    test("returns undefined for ef_ token that fails scrypt verification", async () => {
      // Generate hash for a DIFFERENT token than what we'll send
      const [hash, salt] = await generateApiToken("ef_differenttoken");

      mockDbChain.executeTakeFirst!.mockResolvedValue({
        salt,
        hash,
        id: "key-456",
        user_id: "user-123",
        expired_at: null,
        org_id: "org-789",
        email_address: "user@example.com",
        confirmed_at: new Date(),
        is_paid: false,
      });

      const request = makeRequest({
        Authorization: "Bearer ef_wrongtoken_key-456",
      });

      const result = await parseRequestSession(request);
      expect(result).toBeUndefined();
    });

    test("returns undefined for malformed ef_ token (no underscore separator)", async () => {
      const request = makeRequest({
        Authorization: "Bearer ef_onlytokennokey",
      });

      const result = await parseRequestSession(request);
      expect(result).toBeUndefined();
    });

    test("sets confirmed based on confirmed_at being non-null", async () => {
      const apiTokenValue = "ef_testtoken";
      const apiKeyId = "key-id";
      const [hash, salt] = await generateApiToken(apiTokenValue);

      mockDbChain.executeTakeFirst!.mockResolvedValue({
        salt,
        hash,
        id: apiKeyId,
        user_id: "user-123",
        expired_at: null,
        org_id: "org-789",
        email_address: "user@example.com",
        confirmed_at: null,
        is_paid: false,
      });

      const request = makeRequest({
        Authorization: `Bearer ${apiTokenValue}_${apiKeyId}`,
      });

      const result = await parseRequestSession(request);
      expect(result).toMatchObject({ confirmed: false });
    });
  });

  describe("Authorization header — JWT Bearer path", () => {
    test("returns session for valid JWT with email_passwords type", async () => {
      const token = jwt.sign(
        {
          type: "email_passwords",
          uid: "user-123",
          cid: "cred-456",
          email: "user@example.com",
          confirmed: true,
        },
        APP_JWT_SECRET,
        { algorithm: "HS256" },
      );

      const request = makeRequest({
        Authorization: `Bearer ${token}`,
      });

      const result = await parseRequestSession(request);
      expect(result).toMatchObject({
        type: "email_passwords",
        uid: "user-123",
        email: "user@example.com",
      });
    });

    test("returns session for valid JWT with api type", async () => {
      const token = jwt.sign(
        {
          type: "api",
          uid: "user-123",
          cid: "key-456",
          oid: "org-789",
          email: "user@example.com",
          confirmed: true,
          expired_at: null,
          is_paid: true,
        },
        APP_JWT_SECRET,
        { algorithm: "HS256" },
      );

      const request = makeRequest({
        Authorization: `Bearer ${token}`,
      });

      const result = await parseRequestSession(request);
      expect(result).toMatchObject({
        type: "api",
        uid: "user-123",
        oid: "org-789",
        is_paid: true,
      });
    });

    test("throws for JWT with valid signature but invalid session shape", async () => {
      const token = jwt.sign(
        { type: "email_passwords", uid: 123 }, // uid should be string
        APP_JWT_SECRET,
        { algorithm: "HS256" },
      );

      const request = makeRequest({
        Authorization: `Bearer ${token}`,
      });

      // The JWT verifies, but SessionSchema.safeParse fails,
      // and the function throws an Error
      await expect(parseRequestSession(request)).rejects.toThrow(
        "Failed to parse session from JWT",
      );
    });

    test("returns undefined for Authorization header without Bearer prefix", async () => {
      const request = makeRequest({
        Authorization: "Basic dXNlcjpwYXNz",
      });

      const result = await parseRequestSession(request);
      expect(result).toBeUndefined();
    });

    test("returns undefined for Authorization header with empty Bearer token", async () => {
      const request = makeRequest({
        Authorization: "Bearer ",
      });

      // "Bearer " splits on "Bearer " giving empty string after
      // Empty string is falsy, so returns undefined
      const result = await parseRequestSession(request);
      expect(result).toBeUndefined();
    });
  });

  describe("Cookie path", () => {
    test("returns session for valid cookie when user exists in DB", async () => {
      const cookie = await createSessionCookie({
        type: "email_passwords",
        uid: "user-123",
        cid: "cred-456",
        email: "user@example.com",
        confirmed: true,
      });

      // Mock DB to confirm user exists
      mockDbChain.executeTakeFirst!.mockResolvedValue({ id: "user-123" });

      const request = makeRequest({ Cookie: cookie });
      const result = await parseRequestSession(request);
      expect(result).toMatchObject({
        type: "email_passwords",
        uid: "user-123",
        email: "user@example.com",
      });
    });

    test("returns undefined for valid cookie when user does not exist in DB", async () => {
      const cookie = await createSessionCookie({
        type: "email_passwords",
        uid: "deleted-user",
        cid: "cred-456",
        email: "deleted@example.com",
        confirmed: true,
      });

      // Mock DB to return no user
      mockDbChain.executeTakeFirst!.mockResolvedValue(null);

      const request = makeRequest({ Cookie: cookie });
      const result = await parseRequestSession(request);
      expect(result).toBeUndefined();
    });

    test("returns undefined for invalid/tampered cookie", async () => {
      const request = makeRequest({ Cookie: "_session=tampered-garbage" });
      const result = await parseRequestSession(request);
      expect(result).toBeUndefined();
    });

    test("returns undefined for empty cookie", async () => {
      const request = makeRequest({ Cookie: "" });
      const result = await parseRequestSession(request);
      expect(result).toBeUndefined();
    });

    test("returns undefined when cookie has data but doesn't match any session schema", async () => {
      // Create a cookie with data that doesn't match SessionSchema
      const session = await getSession();
      session.set("randomKey", "randomValue");
      const { commitSession } = await import("./session");
      const cookie = await commitSession(session);

      const request = makeRequest({ Cookie: cookie });
      const result = await parseRequestSession(request);
      expect(result).toBeUndefined();
    });
  });

  describe("Authorization header takes precedence over Cookie", () => {
    test("uses Authorization header when both are present", async () => {
      // Create a cookie session for a different user
      const cookie = await createSessionCookie({
        type: "email_passwords",
        uid: "cookie-user",
        cid: "cookie-cred",
        email: "cookie@example.com",
        confirmed: true,
      });

      // Create a JWT for a different user
      const token = jwt.sign(
        {
          type: "email_passwords",
          uid: "jwt-user",
          cid: "jwt-cred",
          email: "jwt@example.com",
          confirmed: true,
        },
        APP_JWT_SECRET,
        { algorithm: "HS256" },
      );

      const request = makeRequest({
        Authorization: `Bearer ${token}`,
        Cookie: cookie,
      });

      const result = await parseRequestSession(request);
      // Should return the JWT user, not the cookie user
      expect(result).toMatchObject({
        uid: "jwt-user",
        email: "jwt@example.com",
      });
    });
  });
});

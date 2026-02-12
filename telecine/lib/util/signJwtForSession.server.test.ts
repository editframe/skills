import { describe, test, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import {
  signJwtForSession,
  signHasuraJwtForSession,
  verifyJwtForSession,
} from "./signJwtForSession.server";
import type { SessionInfo } from "./session";

const APP_JWT_SECRET = process.env.APPLICATION_JWT_SECRET!;

// Mock the DB module — only used by verifyJwtForSession for "url" type tokens
vi.mock("@/sql-client.server", () => {
  const mockDb = {
    selectFrom: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue(null),
  };
  return { db: mockDb };
});

// Access the mocked db for per-test configuration
import { db } from "@/sql-client.server";
const mockDb = db as unknown as {
  selectFrom: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  executeTakeFirst: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  // Reset the chain — each method returns the mock itself for chaining
  mockDb.selectFrom.mockReturnThis();
  mockDb.where.mockReturnThis();
  mockDb.select.mockReturnThis();
  mockDb.executeTakeFirst.mockResolvedValue(null);
});

describe("signJwtForSession", () => {
  test("signs email_passwords session and produces valid JWT", () => {
    const session: SessionInfo = {
      type: "email_passwords",
      uid: "user-123",
      cid: "cred-456",
      email: "user@example.com",
      confirmed: true,
    };

    const token = signJwtForSession(session);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    const decoded = jwt.decode(token) as Record<string, unknown>;
    expect(decoded.type).toBe("email_passwords");
    expect(decoded.uid).toBe("user-123");
    expect(decoded.email).toBe("user@example.com");
  });

  test("signs api session and produces valid JWT", () => {
    const session: SessionInfo = {
      type: "api",
      uid: "user-123",
      cid: "key-456",
      oid: "org-789",
      email: "user@example.com",
      confirmed: true,
      expired_at: null,
      is_paid: true,
    };

    const token = signJwtForSession(session);
    const decoded = jwt.decode(token) as Record<string, unknown>;
    expect(decoded.type).toBe("api");
    expect(decoded.oid).toBe("org-789");
    expect(decoded.is_paid).toBe(true);
  });

  test("JWT is verifiable with APP_JWT_SECRET", () => {
    const session: SessionInfo = {
      type: "email_passwords",
      uid: "user-123",
      cid: "cred-456",
      email: "user@example.com",
      confirmed: true,
    };

    const token = signJwtForSession(session);
    const verified = jwt.verify(token, APP_JWT_SECRET);
    expect(verified).toMatchObject({
      type: "email_passwords",
      uid: "user-123",
    });
  });

  test("JWT is not verifiable with wrong secret", () => {
    const session: SessionInfo = {
      type: "email_passwords",
      uid: "user-123",
      cid: "cred-456",
      email: "user@example.com",
      confirmed: true,
    };

    const token = signJwtForSession(session);
    expect(() => jwt.verify(token, "wrong-secret")).toThrow();
  });
});

describe("signHasuraJwtForSession", () => {
  test("produces JWT with Hasura claims", () => {
    const token = signHasuraJwtForSession({
      uid: "user-123",
      cid: null,
    });

    const decoded = jwt.decode(token) as Record<string, unknown>;
    const claims = decoded["https://hasura.io/jwt/claims"] as Record<
      string,
      unknown
    >;
    expect(claims["X-Hasura-user-id"]).toBe("user-123");
    expect(claims["X-Hasura-default-role"]).toBe("user");
    expect(claims["X-Hasura-allowed-roles"]).toEqual([
      "user",
      "org-admin",
      "org-primary",
      "org-editor",
      "org-reader",
    ]);
    expect(claims["X-Hasura-api-key"]).toBeUndefined();
  });

  test("includes api-key claim when cid is provided", () => {
    const token = signHasuraJwtForSession({
      uid: "user-123",
      cid: "key-456",
    });

    const decoded = jwt.decode(token) as Record<string, unknown>;
    const claims = decoded["https://hasura.io/jwt/claims"] as Record<
      string,
      unknown
    >;
    expect(claims["X-Hasura-api-key"]).toBe("key-456");
  });

  test("includes ef-admin role when isAdmin is true", () => {
    const token = signHasuraJwtForSession({
      uid: "user-123",
      cid: null,
      isAdmin: true,
    });

    const decoded = jwt.decode(token) as Record<string, unknown>;
    const claims = decoded["https://hasura.io/jwt/claims"] as Record<
      string,
      unknown
    >;
    expect(claims["X-Hasura-allowed-roles"]).toContain("ef-admin");
  });

  test("throws when uid is empty string", () => {
    expect(() =>
      signHasuraJwtForSession({ uid: "", cid: null }),
    ).toThrow("Cannot sign JWT: uid must be a non-empty string");
  });

  test("throws when uid is not a string", () => {
    expect(() =>
      signHasuraJwtForSession({
        uid: undefined as unknown as string,
        cid: null,
      }),
    ).toThrow("Cannot sign JWT: uid must be a non-empty string");
  });
});

describe("verifyJwtForSession", () => {
  describe("email_passwords / api type tokens (APP_JWT_SECRET path)", () => {
    test("verifies email_passwords JWT round-trip", async () => {
      const session: SessionInfo = {
        type: "email_passwords",
        uid: "user-123",
        cid: "cred-456",
        email: "user@example.com",
        confirmed: true,
      };

      const token = signJwtForSession(session);
      const result = await verifyJwtForSession(token);
      expect(result).toMatchObject({
        type: "email_passwords",
        uid: "user-123",
        email: "user@example.com",
      });
    });

    test("verifies api type JWT round-trip", async () => {
      const session: SessionInfo = {
        type: "api",
        uid: "user-123",
        cid: "key-456",
        oid: "org-789",
        email: "user@example.com",
        confirmed: true,
        expired_at: null,
        is_paid: true,
      };

      const token = signJwtForSession(session);
      const result = await verifyJwtForSession(token);
      expect(result).toMatchObject({
        type: "api",
        uid: "user-123",
        oid: "org-789",
      });
    });

    test("rejects token signed with wrong secret", async () => {
      const fakeToken = jwt.sign(
        { type: "email_passwords", uid: "user-123" },
        "wrong-secret",
        { algorithm: "HS256" },
      );

      await expect(verifyJwtForSession(fakeToken)).rejects.toThrow();
    });
  });

  describe("anonymous_url type tokens (APP_JWT_SECRET path)", () => {
    test("verifies anonymous_url token", async () => {
      const token = jwt.sign(
        {
          type: "anonymous_url",
          url: "https://example.com/public",
          params: { quality: "hd" },
        },
        APP_JWT_SECRET,
        { algorithm: "HS256", expiresIn: "1h" },
      );

      const result = await verifyJwtForSession(token);
      expect(result).toMatchObject({
        type: "anonymous_url",
        url: "https://example.com/public",
        params: { quality: "hd" },
        cid: null,
        oid: null,
        uid: null,
      });
    });

    test("rejects anonymous_url token signed with wrong secret", async () => {
      const token = jwt.sign(
        {
          type: "anonymous_url",
          url: "https://example.com/public",
          params: {},
        },
        "wrong-secret",
        { algorithm: "HS256" },
      );

      await expect(verifyJwtForSession(token)).rejects.toThrow();
    });
  });

  describe("url type tokens (API key hash path)", () => {
    test("verifies url token when API key hash matches", async () => {
      // URL tokens are signed with the API key's hash, not APP_JWT_SECRET
      const apiKeyHash = crypto.randomBytes(64);
      const signingKey = crypto.createSecretKey(apiKeyHash);

      const token = jwt.sign(
        {
          type: "url",
          url: "https://example.com/api/v1/files",
          params: {},
          cid: "key-456",
          oid: "org-789",
          uid: "user-123",
        },
        signingKey,
        { algorithm: "HS256", expiresIn: "1h" },
      );

      mockDb.executeTakeFirst.mockResolvedValue({ hash: apiKeyHash });

      const result = await verifyJwtForSession(token);
      expect(result).toMatchObject({
        type: "url",
        url: "https://example.com/api/v1/files",
        cid: "key-456",
        oid: "org-789",
        uid: "user-123",
      });
    });

    test("rejects url token when API key not found in DB", async () => {
      const apiKeyHash = crypto.randomBytes(64);
      const signingKey = crypto.createSecretKey(apiKeyHash);

      const token = jwt.sign(
        {
          type: "url",
          url: "https://example.com/api",
          cid: "nonexistent-key",
          oid: "org-789",
          uid: "user-123",
        },
        signingKey,
        { algorithm: "HS256" },
      );

      mockDb.executeTakeFirst.mockResolvedValue(null);

      await expect(verifyJwtForSession(token)).rejects.toThrow();
    });

    test("rejects url token signed with wrong key even if API key exists", async () => {
      const realHash = crypto.randomBytes(64);
      const wrongHash = crypto.randomBytes(64);
      const wrongKey = crypto.createSecretKey(wrongHash);

      const token = jwt.sign(
        {
          type: "url",
          url: "https://example.com/api",
          cid: "key-456",
          oid: "org-789",
          uid: "user-123",
        },
        wrongKey,
        { algorithm: "HS256" },
      );

      // DB returns the real hash, but token was signed with wrong hash
      mockDb.executeTakeFirst.mockResolvedValue({ hash: realHash });

      await expect(verifyJwtForSession(token)).rejects.toThrow();
    });
  });

  describe("decode-before-verify attack surface", () => {
    test("attacker-crafted token with type:url and valid cid is rejected if signed with APP_JWT_SECRET instead of API key hash", async () => {
      // An attacker who knows APP_JWT_SECRET but not the API key hash
      // crafts a token with type: "url" to try to get a URL session.
      // The decode step reads the unverified type/cid, looks up the API key hash,
      // and uses it for verification — which should fail since it was signed
      // with APP_JWT_SECRET.
      const realApiKeyHash = crypto.randomBytes(64);

      const maliciousToken = jwt.sign(
        {
          type: "url",
          url: "https://example.com/api",
          cid: "victim-key-456",
          oid: "victim-org",
          uid: "attacker-uid",
        },
        APP_JWT_SECRET,
        { algorithm: "HS256" },
      );

      mockDb.executeTakeFirst.mockResolvedValue({ hash: realApiKeyHash });

      await expect(verifyJwtForSession(maliciousToken)).rejects.toThrow();
    });

    test("attacker cannot forge anonymous_url token with type:url to bypass URL validation", async () => {
      // Attacker tries to create a token with type: "url" using a key
      // they don't have. The decode step will extract the cid from
      // the unverified payload and look it up — but verification will
      // fail because the token isn't signed with that API key's hash.
      const attackerKey = crypto.randomBytes(32);
      const realApiKeyHash = crypto.randomBytes(64);

      const token = jwt.sign(
        {
          type: "url",
          url: "https://example.com/api",
          cid: "target-key",
          oid: "target-org",
          uid: "attacker",
        },
        attackerKey,
        { algorithm: "HS256" },
      );

      mockDb.executeTakeFirst.mockResolvedValue({ hash: realApiKeyHash });

      await expect(verifyJwtForSession(token)).rejects.toThrow();
    });

    test("DB lookup uses unverified cid from decoded payload", async () => {
      // Pin the behavior: verifyJwtForSession calls db.selectFrom
      // with the cid from the UNVERIFIED decoded payload.
      // This is the confused-deputy pattern we want to track.
      const token = jwt.sign(
        {
          type: "url",
          url: "https://example.com/api",
          cid: "attacker-chosen-cid",
          oid: "org",
          uid: "user",
        },
        "any-key",
        { algorithm: "HS256" },
      );

      mockDb.executeTakeFirst.mockResolvedValue(null);

      // It will throw because API key not found, but the important
      // thing is that the DB was queried with the unverified cid
      await expect(verifyJwtForSession(token)).rejects.toThrow();
      expect(mockDb.where).toHaveBeenCalledWith(
        "id",
        "=",
        "attacker-chosen-cid",
      );
    });
  });

  describe("edge cases", () => {
    test("rejects string-type decoded JWT", async () => {
      // jwt.decode can return a string for non-JSON payloads
      // signJwtForSession always produces object payloads, but
      // a malicious token could have a string payload
      const parts = [
        Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
          "base64url",
        ),
        Buffer.from('"just-a-string"').toString("base64url"),
        "",
      ];
      const malformed = parts.join(".");

      await expect(verifyJwtForSession(malformed)).rejects.toThrow(
        "Invalid token",
      );
    });

    test("rejects expired token", async () => {
      const token = jwt.sign(
        {
          type: "email_passwords",
          uid: "user-123",
          cid: "cred-456",
          email: "user@example.com",
          confirmed: true,
        },
        APP_JWT_SECRET,
        { algorithm: "HS256", expiresIn: "-1s" },
      );

      await expect(verifyJwtForSession(token)).rejects.toThrow();
    });

    test("rejects completely invalid token string", async () => {
      await expect(verifyJwtForSession("not.a.jwt")).rejects.toThrow();
    });
  });
});

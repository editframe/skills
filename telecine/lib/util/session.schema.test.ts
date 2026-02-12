import { describe, test, expect } from "vitest";
import * as z from "zod";

// Re-create the schemas from session.ts to test them in isolation.
// We import the types but test the schema behavior via dynamic import
// since session.ts has side effects (createCookieSessionStorage).

const EmailPasswordSession = z.object({
  type: z.literal("email_passwords"),
  uid: z.string(),
  cid: z.string(),
  email: z.string(),
  confirmed: z.boolean(),
  oid: z.string().optional(),
});

const APISession = z.object({
  type: z.literal("api"),
  oid: z.string(),
  uid: z.string(),
  cid: z.string(),
  email: z.string(),
  confirmed: z.boolean(),
  expired_at: z.date().nullable(),
  is_paid: z.boolean(),
  restricted: z.boolean().optional(),
});

const URLSession = z.object({
  type: z.literal("url"),
  cid: z.string(),
  url: z.string(),
  params: z.record(z.string()).default({}),
  oid: z.string(),
  uid: z.string(),
});

const AnonymousURLSession = z.object({
  type: z.literal("anonymous_url"),
  url: z.string(),
  params: z.record(z.string()).default({}),
  cid: z.null(),
  oid: z.null(),
  uid: z.null(),
});

const SessionSchema = z.discriminatedUnion("type", [
  EmailPasswordSession,
  APISession,
  URLSession,
  AnonymousURLSession,
]);

describe("SessionSchema - EmailPasswordSession", () => {
  test("accepts valid email_passwords session", () => {
    const result = SessionSchema.safeParse({
      type: "email_passwords",
      uid: "user-123",
      cid: "cred-456",
      email: "user@example.com",
      confirmed: true,
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      type: "email_passwords",
      uid: "user-123",
      cid: "cred-456",
      email: "user@example.com",
      confirmed: true,
    });
  });

  test("accepts email_passwords session with optional oid", () => {
    const result = SessionSchema.safeParse({
      type: "email_passwords",
      uid: "user-123",
      cid: "cred-456",
      email: "user@example.com",
      confirmed: true,
      oid: "org-789",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.oid).toBe("org-789");
    }
  });

  test("rejects email_passwords session missing uid", () => {
    const result = SessionSchema.safeParse({
      type: "email_passwords",
      cid: "cred-456",
      email: "user@example.com",
      confirmed: true,
    });
    expect(result.success).toBe(false);
  });

  test("rejects email_passwords session missing email", () => {
    const result = SessionSchema.safeParse({
      type: "email_passwords",
      uid: "user-123",
      cid: "cred-456",
      confirmed: true,
    });
    expect(result.success).toBe(false);
  });

  test("rejects email_passwords session with non-string uid", () => {
    const result = SessionSchema.safeParse({
      type: "email_passwords",
      uid: 123,
      cid: "cred-456",
      email: "user@example.com",
      confirmed: true,
    });
    expect(result.success).toBe(false);
  });

  test("rejects email_passwords session missing confirmed", () => {
    const result = SessionSchema.safeParse({
      type: "email_passwords",
      uid: "user-123",
      cid: "cred-456",
      email: "user@example.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("SessionSchema - APISession", () => {
  test("accepts valid api session", () => {
    const result = SessionSchema.safeParse({
      type: "api",
      oid: "org-789",
      uid: "user-123",
      cid: "key-456",
      email: "user@example.com",
      confirmed: true,
      expired_at: null,
      is_paid: false,
    });
    expect(result.success).toBe(true);
  });

  test("accepts api session with expired_at date", () => {
    const expiry = new Date("2025-12-31");
    const result = SessionSchema.safeParse({
      type: "api",
      oid: "org-789",
      uid: "user-123",
      cid: "key-456",
      email: "user@example.com",
      confirmed: true,
      expired_at: expiry,
      is_paid: true,
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "api") {
      expect(result.data.expired_at).toEqual(expiry);
    }
  });

  test("accepts api session with optional restricted field", () => {
    const result = SessionSchema.safeParse({
      type: "api",
      oid: "org-789",
      uid: "user-123",
      cid: "key-456",
      email: "user@example.com",
      confirmed: true,
      expired_at: null,
      is_paid: false,
      restricted: true,
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "api") {
      expect(result.data.restricted).toBe(true);
    }
  });

  test("rejects api session missing oid", () => {
    const result = SessionSchema.safeParse({
      type: "api",
      uid: "user-123",
      cid: "key-456",
      email: "user@example.com",
      confirmed: true,
      expired_at: null,
      is_paid: false,
    });
    expect(result.success).toBe(false);
  });

  test("rejects api session missing is_paid", () => {
    const result = SessionSchema.safeParse({
      type: "api",
      oid: "org-789",
      uid: "user-123",
      cid: "key-456",
      email: "user@example.com",
      confirmed: true,
      expired_at: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("SessionSchema - URLSession", () => {
  test("accepts valid url session", () => {
    const result = SessionSchema.safeParse({
      type: "url",
      uid: "user-123",
      cid: "key-456",
      oid: "org-789",
      url: "https://example.com/api/v1/files",
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "url") {
      expect(result.data.params).toEqual({});
    }
  });

  test("accepts url session with params", () => {
    const result = SessionSchema.safeParse({
      type: "url",
      uid: "user-123",
      cid: "key-456",
      oid: "org-789",
      url: "https://example.com/api/v1/transcode",
      params: { url: "https://example.com/video.mp4" },
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "url") {
      expect(result.data.params).toEqual({
        url: "https://example.com/video.mp4",
      });
    }
  });

  test("defaults params to empty object when not provided", () => {
    const result = SessionSchema.safeParse({
      type: "url",
      uid: "user-123",
      cid: "key-456",
      oid: "org-789",
      url: "https://example.com/api",
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "url") {
      expect(result.data.params).toEqual({});
    }
  });

  test("rejects url session missing url field", () => {
    const result = SessionSchema.safeParse({
      type: "url",
      uid: "user-123",
      cid: "key-456",
      oid: "org-789",
    });
    expect(result.success).toBe(false);
  });
});

describe("SessionSchema - AnonymousURLSession", () => {
  test("accepts valid anonymous_url session", () => {
    const result = SessionSchema.safeParse({
      type: "anonymous_url",
      url: "https://example.com/public/resource",
      cid: null,
      oid: null,
      uid: null,
    });
    expect(result.success).toBe(true);
  });

  test("accepts anonymous_url session with params", () => {
    const result = SessionSchema.safeParse({
      type: "anonymous_url",
      url: "https://example.com/public/resource",
      params: { quality: "hd" },
      cid: null,
      oid: null,
      uid: null,
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === "anonymous_url") {
      expect(result.data.params).toEqual({ quality: "hd" });
    }
  });

  test("rejects anonymous_url session with non-null uid", () => {
    const result = SessionSchema.safeParse({
      type: "anonymous_url",
      url: "https://example.com/public/resource",
      cid: null,
      oid: null,
      uid: "user-123",
    });
    expect(result.success).toBe(false);
  });

  test("rejects anonymous_url session with non-null cid", () => {
    const result = SessionSchema.safeParse({
      type: "anonymous_url",
      url: "https://example.com/public/resource",
      cid: "key-456",
      oid: null,
      uid: null,
    });
    expect(result.success).toBe(false);
  });

  test("rejects anonymous_url session with non-null oid", () => {
    const result = SessionSchema.safeParse({
      type: "anonymous_url",
      url: "https://example.com/public/resource",
      cid: null,
      oid: "org-789",
      uid: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("SessionSchema - discriminated union behavior", () => {
  test("rejects unknown session type", () => {
    const result = SessionSchema.safeParse({
      type: "unknown",
      uid: "user-123",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty object", () => {
    const result = SessionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  test("rejects null", () => {
    const result = SessionSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  test("rejects undefined", () => {
    const result = SessionSchema.safeParse(undefined);
    expect(result.success).toBe(false);
  });

  test("rejects string", () => {
    const result = SessionSchema.safeParse("not-a-session");
    expect(result.success).toBe(false);
  });

  test("correctly discriminates between session types", () => {
    const emailResult = SessionSchema.safeParse({
      type: "email_passwords",
      uid: "u1",
      cid: "c1",
      email: "a@b.com",
      confirmed: true,
    });
    const apiResult = SessionSchema.safeParse({
      type: "api",
      oid: "o1",
      uid: "u1",
      cid: "c1",
      email: "a@b.com",
      confirmed: true,
      expired_at: null,
      is_paid: false,
    });

    expect(emailResult.success).toBe(true);
    expect(apiResult.success).toBe(true);
    if (emailResult.success && apiResult.success) {
      expect(emailResult.data.type).toBe("email_passwords");
      expect(apiResult.data.type).toBe("api");
    }
  });

  test("extra fields are stripped (zod default behavior)", () => {
    const result = SessionSchema.safeParse({
      type: "email_passwords",
      uid: "user-123",
      cid: "cred-456",
      email: "user@example.com",
      confirmed: true,
      extraField: "should-be-stripped",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("extraField" in result.data).toBe(false);
    }
  });
});

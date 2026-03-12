import { describe, test, expect } from "vitest";
import {
  getSession,
  commitSession,
  destroySession,
  createSessionCookie,
  createEmailPasswordSessionCookie,
  createApiTokenSessionCookie,
  sessionStorage,
} from "./session";

describe("cookie session storage round-trips", () => {
  test("getSession returns empty session when no cookie provided", async () => {
    const session = await getSession();
    expect(session.data).toEqual({});
    expect(session.id).toBe("");
  });

  test("commitSession produces a Set-Cookie string", async () => {
    const session = await getSession();
    session.set("uid", "user-123");
    const cookie = await commitSession(session);
    expect(cookie).toContain("_session=");
    expect(typeof cookie).toBe("string");
  });

  test("session data round-trips through commit and parse", async () => {
    const session = await getSession();
    session.set("uid", "user-123");
    session.set("type", "email_passwords");
    const cookie = await commitSession(session);

    const parsed = await getSession(cookie);
    expect(parsed.get("uid")).toBe("user-123");
    expect(parsed.get("type")).toBe("email_passwords");
  });

  test("destroySession returns a cookie that clears the session", async () => {
    const session = await getSession();
    session.set("uid", "user-123");
    const cookie = await commitSession(session);

    const liveSession = await getSession(cookie);
    expect(liveSession.get("uid")).toBe("user-123");

    const destroyCookie = await destroySession(liveSession);
    const destroyed = await getSession(destroyCookie);
    expect(destroyed.get("uid")).toBeUndefined();
    expect(destroyed.data).toEqual({});
  });

  test("flash data is only available once", async () => {
    const session = await getSession();
    session.flash("message", "Operation succeeded");
    const cookie = await commitSession(session);

    const first = await getSession(cookie);
    expect(first.get("message")).toBe("Operation succeeded");

    const cookie2 = await commitSession(first);
    const second = await getSession(cookie2);
    expect(second.get("message")).toBeUndefined();
  });

  test("commitSession respects maxAge option", async () => {
    const session = await getSession();
    session.set("uid", "user-123");
    const cookie = await commitSession(session, { maxAge: 3600 });
    expect(cookie).toContain("Max-Age=3600");
  });
});

describe("createSessionCookie", () => {
  test("creates cookie with email_passwords session data", async () => {
    const cookie = await createSessionCookie({
      type: "email_passwords",
      uid: "user-123",
      cid: "cred-456",
      email: "user@example.com",
      confirmed: true,
    });

    expect(typeof cookie).toBe("string");
    expect(cookie).toContain("_session=");

    const session = await getSession(cookie);
    expect(session.get("type")).toBe("email_passwords");
    expect(session.get("uid")).toBe("user-123");
    expect(session.get("cid")).toBe("cred-456");
    expect(session.get("email")).toBe("user@example.com");
    expect(session.get("confirmed")).toBe(true);
  });

  test("creates cookie with api session data", async () => {
    const cookie = await createSessionCookie({
      type: "api",
      uid: "user-123",
      cid: "key-456",
      oid: "org-789",
      email: "user@example.com",
      confirmed: true,
      expired_at: null,
      is_paid: true,
    });

    const session = await getSession(cookie);
    expect(session.get("type")).toBe("api");
    expect(session.get("oid")).toBe("org-789");
    expect(session.get("is_paid")).toBe(true);
    expect(session.get("expired_at")).toBeNull();
  });

  test("creates cookie with url session data", async () => {
    const cookie = await createSessionCookie({
      type: "url",
      uid: "user-123",
      cid: "key-456",
      oid: "org-789",
      url: "https://example.com/api/v1/files",
      params: { quality: "hd" },
    });

    const session = await getSession(cookie);
    expect(session.get("type")).toBe("url");
    expect(session.get("url")).toBe("https://example.com/api/v1/files");
    expect(session.get("params")).toEqual({ quality: "hd" });
  });

  test("creates cookie with anonymous_url session data", async () => {
    const cookie = await createSessionCookie({
      type: "anonymous_url",
      url: "https://example.com/public",
      params: {},
      cid: null,
      oid: null,
      uid: null,
    });

    const session = await getSession(cookie);
    expect(session.get("type")).toBe("anonymous_url");
    expect(session.get("uid")).toBeNull();
    expect(session.get("cid")).toBeNull();
    expect(session.get("oid")).toBeNull();
  });

  test("cookie has 7-day maxAge", async () => {
    const cookie = await createSessionCookie({
      type: "email_passwords",
      uid: "user-123",
      cid: "cred-456",
      email: "user@example.com",
      confirmed: true,
    });

    const sevenDays = 60 * 60 * 24 * 7;
    expect(cookie).toContain(`Max-Age=${sevenDays}`);
  });
});

describe("createEmailPasswordSessionCookie", () => {
  test("creates session from email_password record shape", async () => {
    const cookie = await createEmailPasswordSessionCookie({
      user_id: "user-123",
      id: "cred-456",
      email_address: "user@example.com",
      confirmed_at: new Date("2024-01-01"),
    });

    const session = await getSession(cookie);
    expect(session.get("type")).toBe("email_passwords");
    expect(session.get("uid")).toBe("user-123");
    expect(session.get("cid")).toBe("cred-456");
    expect(session.get("email")).toBe("user@example.com");
    expect(session.get("confirmed")).toBe(true);
  });

  test("sets confirmed to false when confirmed_at is null", async () => {
    const cookie = await createEmailPasswordSessionCookie({
      user_id: "user-123",
      id: "cred-456",
      email_address: "user@example.com",
      confirmed_at: null,
    });

    const session = await getSession(cookie);
    expect(session.get("confirmed")).toBe(false);
  });
});

describe("createApiTokenSessionCookie", () => {
  test("creates session from api key record shape", async () => {
    const cookie = await createApiTokenSessionCookie({
      org_id: "org-789",
      user_id: "user-123",
      credential_id: "key-456",
      email_address: "user@example.com",
      confirmed: true,
      expired_at: null,
      is_paid: true,
    });

    const session = await getSession(cookie);
    expect(session.get("type")).toBe("api");
    expect(session.get("oid")).toBe("org-789");
    expect(session.get("uid")).toBe("user-123");
    expect(session.get("cid")).toBe("key-456");
    expect(session.get("is_paid")).toBe(true);
  });

  test("expired_at Date is serialized to ISO string in cookie", async () => {
    const expiry = new Date("2025-12-31");
    const cookie = await createApiTokenSessionCookie({
      org_id: "org-789",
      user_id: "user-123",
      credential_id: "key-456",
      email_address: "user@example.com",
      confirmed: true,
      expired_at: expiry,
      is_paid: false,
    });

    const session = await getSession(cookie);
    // Dates are serialized to ISO strings by cookie storage — consumers
    // must handle both Date and string when reading expired_at from a session.
    expect(session.get("expired_at")).toBe(expiry.toISOString());
  });
});

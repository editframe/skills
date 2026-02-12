import { describe, test, expect, vi, beforeEach } from "vitest";

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
    execute: ReturnType<typeof vi.fn>;
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

import { createSessionCookie, createApiTokenSessionCookie } from "./session";
import {
  requireSession,
  requireNoSession as requireNoSessionFromServer,
  maybeSession,
  requireCookieOrTokenSession,
} from "./requireSession.server";
import { requireAdminSession } from "./requireAdminSession";
import { requireNoSession as requireNoSessionHOF } from "./requireNoSession";
import { requireAPIToken } from "./requireAPIToken";

function makeRequest(
  headers: Record<string, string> = {},
  url = "https://example.com/test",
): Request {
  return new Request(url, { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectFrom.mockReturnValue(mockDbChain);
  for (const key of Object.keys(mockDbChain)) {
    if (typeof mockDbChain[key]?.mockReturnValue === "function") {
      mockDbChain[key]!.mockReturnValue(mockDbChain);
    }
  }
  mockDbChain.executeTakeFirst!.mockResolvedValue(null);
});

async function createAuthenticatedCookie(
  uid = "user-123",
  email = "user@example.com",
) {
  return createSessionCookie({
    type: "email_passwords",
    uid,
    cid: "cred-456",
    email,
    confirmed: true,
  });
}

async function createAnonymousUrlCookie() {
  return createSessionCookie({
    type: "anonymous_url",
    url: "https://example.com/public",
    params: {},
    cid: null,
    oid: null,
    uid: null,
  });
}

describe("requireSession (requireSession.server.ts)", () => {
  test("returns session and sessionCookie for authenticated request", async () => {
    const cookie = await createAuthenticatedCookie();
    mockDbChain.executeTakeFirst!.mockResolvedValue({ id: "user-123" });

    const request = makeRequest({ Cookie: cookie });
    const result = await requireSession(request);

    expect(result.session).toMatchObject({
      type: "email_passwords",
      uid: "user-123",
    });
    expect(result.sessionCookie).toBeDefined();
    expect(result.sessionCookie.id).toBeDefined();
  });

  test("throws redirect to /auth/login for unauthenticated request", async () => {
    const request = makeRequest();

    try {
      await requireSession(request);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/login");
    }
  });

  test("throws redirect for anonymous_url session type", async () => {
    const cookie = await createAnonymousUrlCookie();
    mockDbChain.executeTakeFirst!.mockResolvedValue({ id: "placeholder" });

    const request = makeRequest({ Cookie: cookie });

    try {
      await requireSession(request);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/login");
    }
  });

  test("throws redirect when cookie has valid shape but user not in DB", async () => {
    const cookie = await createAuthenticatedCookie("deleted-user");
    mockDbChain.executeTakeFirst!.mockResolvedValue(null);

    const request = makeRequest({ Cookie: cookie });

    try {
      await requireSession(request);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(302);
    }
  });
});

describe("requireNoSession (requireSession.server.ts version)", () => {
  test("returns sessionCookie for unauthenticated request", async () => {
    const request = makeRequest();
    const result = await requireNoSessionFromServer(request);

    expect(result.sessionCookie).toBeDefined();
  });

  test("throws redirect to /welcome for authenticated request", async () => {
    const cookie = await createAuthenticatedCookie();
    mockDbChain.executeTakeFirst!.mockResolvedValue({ id: "user-123" });

    const request = makeRequest({ Cookie: cookie });

    try {
      await requireNoSessionFromServer(request);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/welcome");
    }
  });
});

describe("requireNoSession (requireNoSession.ts HOF version)", () => {
  test("returns HOF that calls inner loader when no session", async () => {
    const innerLoader = vi.fn().mockResolvedValue({ data: "inner" });
    const wrapped = requireNoSessionHOF(innerLoader);

    const args = {
      request: makeRequest(),
      params: {},
      context: {},
    } as any;

    const result = await wrapped(args);
    expect(result).toEqual({ data: "inner" });
    expect(innerLoader).toHaveBeenCalled();
  });

  test("returns HOF that redirects to /welcome when session exists", async () => {
    const cookie = await createAuthenticatedCookie();
    mockDbChain.executeTakeFirst!.mockResolvedValue({ id: "user-123" });

    const innerLoader = vi.fn();
    const wrapped = requireNoSessionHOF(innerLoader);

    const args = {
      request: makeRequest({ Cookie: cookie }),
      params: {},
      context: {},
    } as any;

    const result = await wrapped(args);
    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/welcome");
    expect(innerLoader).not.toHaveBeenCalled();
  });

  test("returns null when no loader provided and no session", async () => {
    const wrapped = requireNoSessionHOF();

    const args = {
      request: makeRequest(),
      params: {},
      context: {},
    } as any;

    const result = await wrapped(args);
    expect(result).toBeNull();
  });

  test("provides sessionCookie to inner loader", async () => {
    const innerLoader = vi.fn().mockResolvedValue(null);
    const wrapped = requireNoSessionHOF(innerLoader);

    const args = {
      request: makeRequest(),
      params: {},
      context: {},
    } as any;

    await wrapped(args);
    expect(innerLoader).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionCookie: expect.objectContaining({ id: expect.any(String) }),
      }),
    );
  });
});

describe("maybeSession", () => {
  test("returns session and sessionCookie for authenticated request", async () => {
    const cookie = await createAuthenticatedCookie();
    mockDbChain.executeTakeFirst!.mockResolvedValue({ id: "user-123" });

    const request = makeRequest({ Cookie: cookie });
    const result = await maybeSession(request);

    expect(result.session).toMatchObject({
      type: "email_passwords",
      uid: "user-123",
    });
    expect(result.sessionCookie).toBeDefined();
  });

  test("returns undefined session for unauthenticated request", async () => {
    const request = makeRequest();
    const result = await maybeSession(request);

    expect(result.session).toBeUndefined();
    expect(result.sessionCookie).toBeDefined();
  });

  test("never throws for unauthenticated request", async () => {
    const request = makeRequest();
    await expect(maybeSession(request)).resolves.toBeDefined();
  });
});

describe("requireCookieOrTokenSession", () => {
  test("returns TokenLikeSessionInfo for cookie-authenticated request with oid", async () => {
    const cookie = await createSessionCookie({
      type: "email_passwords",
      uid: "user-123",
      cid: "cred-456",
      email: "user@example.com",
      confirmed: true,
      oid: "org-789",
    });
    mockDbChain.executeTakeFirst!.mockResolvedValue({ id: "user-123" });

    const request = makeRequest({ Cookie: cookie });
    const result = await requireCookieOrTokenSession(request);

    expect(result).toEqual({
      cid: null, // email_passwords type returns null for cid
      uid: "user-123",
      oid: "org-789",
    });
  });

  test("throws 401 for unauthenticated request (DataWithResponseInit leaks through — missing await bug)", async () => {
    // BUG: requireCookieOrTokenSession has `return requireAPIToken(request)`
    // without `await`, so the catch block never fires for the API token path.
    // The DataWithResponseInit from requireAPIToken leaks through instead of
    // being wrapped in Response("Unauthorized").
    const request = makeRequest();

    try {
      await requireCookieOrTokenSession(request);
      expect.fail("Should have thrown");
    } catch (error: any) {
      // This is DataWithResponseInit, not Response, because of the missing await
      expect(error).not.toBeInstanceOf(Response);
      expect(error.init?.status).toBe(401);
    }
  });

  test("throws 401 for cookie session without oid", async () => {
    const cookie = await createSessionCookie({
      type: "email_passwords",
      uid: "user-123",
      cid: "cred-456",
      email: "user@example.com",
      confirmed: true,
      // no oid
    });
    mockDbChain.executeTakeFirst!.mockResolvedValue({ id: "user-123" });

    const request = makeRequest({ Cookie: cookie });

    try {
      await requireCookieOrTokenSession(request);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(401);
    }
  });
});

describe("requireAdminSession", () => {
  const originalEnv = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    process.env.ADMIN_EMAILS = "admin@example.com,superadmin@example.com";
  });

  test("returns session with isAdmin for admin user", async () => {
    const cookie = await createAuthenticatedCookie(
      "admin-user",
      "admin@example.com",
    );
    mockDbChain.executeTakeFirst!.mockResolvedValue({ id: "admin-user" });

    const request = makeRequest({ Cookie: cookie });
    const result = await requireAdminSession(request);

    expect(result).toMatchObject({
      uid: "admin-user",
      email: "admin@example.com",
      isAdmin: true,
    });
  });

  test("throws redirect for non-admin user", async () => {
    const cookie = await createAuthenticatedCookie(
      "user-123",
      "regular@example.com",
    );
    mockDbChain.executeTakeFirst!.mockResolvedValue({ id: "user-123" });

    const request = makeRequest({ Cookie: cookie });

    try {
      await requireAdminSession(request);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/login");
    }
  });

  test("throws redirect for unauthenticated request", async () => {
    const request = makeRequest();

    try {
      await requireAdminSession(request);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      const response = error as Response;
      expect(response.status).toBe(302);
    }
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ADMIN_EMAILS = originalEnv;
    } else {
      delete process.env.ADMIN_EMAILS;
    }
  });
});

describe("requireAPIToken", () => {
  test("throws 401 DataWithResponseInit for request without Authorization header", async () => {
    // requireAPIToken uses data() from react-router, which returns
    // DataWithResponseInit, not Response
    const request = makeRequest();

    try {
      await requireAPIToken(request);
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error).not.toBeInstanceOf(Response);
      expect(error.init?.status).toBe(401);
      expect(error.data).toEqual({ message: "Invalid or expired API token" });
    }
  });

  test("throws 401 DataWithResponseInit for email_passwords session type (not an API/URL token)", async () => {
    const cookie = await createAuthenticatedCookie();
    mockDbChain.executeTakeFirst!.mockResolvedValue({ id: "user-123" });

    // Cookie-based email_passwords session should be rejected
    const request = makeRequest({ Cookie: cookie });

    try {
      await requireAPIToken(request);
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error).not.toBeInstanceOf(Response);
      expect(error.init?.status).toBe(401);
    }
  });
});

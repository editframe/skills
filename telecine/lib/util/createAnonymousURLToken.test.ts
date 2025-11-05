import { describe, test, expect } from "vitest";
import jwt from "jsonwebtoken";
import { createAnonymousURLToken } from "./createAnonymousURLToken";
import { verifyJwtForSession } from "./signJwtForSession.server";
import { validateUrlToken } from "./validateUrlToken";

describe("createAnonymousURLToken", () => {
  test("creates valid anonymous URL token", () => {
    const url = "https://example.com/api/test";
    const params = { foo: "bar", baz: "qux" };

    const token = createAnonymousURLToken(url, params);

    expect(token).toEqual(expect.any(String));
    expect(token.split(".")).toHaveLength(3); // JWT format
  });

  test("creates token with default empty params", () => {
    const url = "https://example.com/api/test";

    const token = createAnonymousURLToken(url);
    const decoded = jwt.decode(token) as any;

    expect(decoded.params).toEqual({});
  });

  test("creates token with custom expiration", () => {
    const url = "https://example.com/api/test";

    const token = createAnonymousURLToken(url, undefined, "30m");
    const decoded = jwt.decode(token) as any;

    expect(decoded.type).toBe("anonymous_url");
    expect(decoded.url).toBe(url);
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  test("token payload has correct structure", () => {
    const url = "https://example.com/api/test";
    const params = { video: "123", quality: "hd" };

    const token = createAnonymousURLToken(url, params);
    const decoded = jwt.decode(token) as any;

    expect(decoded).toMatchObject({
      type: "anonymous_url",
      url,
      params,
      iat: expect.any(Number),
      exp: expect.any(Number),
    });
  });

  test("integration with verifyJwtForSession", async () => {
    const url = "https://example.com/api/test";
    const params = { video: "123" };

    const token = createAnonymousURLToken(url, params);
    const session = await verifyJwtForSession(token);

    expect(session).toMatchObject({
      type: "anonymous_url",
      url,
      params,
      cid: null,
      oid: null,
      uid: null,
    });
  });

  test("integration with validateUrlToken - exact URL match", () => {
    const url = "https://example.com/api/test";
    const params = { video: "123", format: "mp4" };

    const token = createAnonymousURLToken(url, params);
    const decoded = jwt.decode(token) as any;

    const session = {
      url: decoded.url,
      params: decoded.params,
    };

    // Should validate successfully for exact match
    const requestUrl = "https://example.com/api/test?video=123&format=mp4";
    const validation = validateUrlToken(session, requestUrl);

    expect(validation.isValid).toBe(true);
  });

  test("integration with validateUrlToken - URL prefix match", () => {
    const url = "https://example.com/api/";
    const params = {};

    const token = createAnonymousURLToken(url, params);
    const decoded = jwt.decode(token) as any;

    const session = {
      url: decoded.url,
      params: decoded.params,
    };

    // Should validate successfully for prefix match
    const requestUrl = "https://example.com/api/test/segment";
    const validation = validateUrlToken(session, requestUrl);

    expect(validation.isValid).toBe(true);
  });

  test("integration with validateUrlToken - parameter mismatch fails", () => {
    const url = "https://example.com/api/test";
    const params = { video: "123" };

    const token = createAnonymousURLToken(url, params);
    const decoded = jwt.decode(token) as any;

    const session = {
      url: decoded.url,
      params: decoded.params,
    };

    // Should fail validation for parameter mismatch
    const requestUrl = "https://example.com/api/test?video=456";
    const validation = validateUrlToken(session, requestUrl);

    expect(validation.isValid).toBe(false);
    expect(validation.errorDetails?.message).toContain("Parameter value mismatch");
  });
});

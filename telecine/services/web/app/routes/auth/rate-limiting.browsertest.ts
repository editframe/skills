import { describe, test, expect } from "vitest";

const WEB_HOST =
  (import.meta as any).env?.VITE_WEB_HOST || "http://localhost:3000";

describe("auth rate limiting", () => {
  test("rapid login attempts trigger rate limit", async () => {
    const responses: number[] = [];

    for (let i = 0; i < 8; i++) {
      const body = new URLSearchParams({
        email_address: `rate-limit-login-${i}@example.org`,
        password: "wrongpassword",
      });

      const response = await fetch(`${WEB_HOST}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        redirect: "manual",
      });
      responses.push(response.status);
    }

    const rateLimited = responses.some((status) => status === 429);
    expect(rateLimited).toBe(true);
  });

  test("rapid password reset requests trigger rate limit", async () => {
    const responses: number[] = [];

    for (let i = 0; i < 8; i++) {
      const body = new URLSearchParams({
        email_address: `rate-limit-reset-${i}@example.org`,
      });

      const response = await fetch(`${WEB_HOST}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        redirect: "manual",
      });
      responses.push(response.status);
    }

    const rateLimited = responses.some((status) => status === 429);
    expect(rateLimited).toBe(true);
  });
});

import { describe, test, expect } from "vitest";

const WEB_HOST =
  (import.meta as any).env?.VITE_WEB_HOST || "http://localhost:3000";

describe("invite token security", () => {
  test("expired invite token returns 404", async () => {
    const fakeToken = "00000000-0000-0000-0000-000000000000";
    const response = await fetch(`${WEB_HOST}/invitation/${fakeToken}`, {
      redirect: "manual",
    });

    expect(response.status).toBe(404);
  });

  test("invitation page does not leak invite token in response body", async () => {
    const fakeToken = "00000000-0000-0000-0000-000000000000";
    const response = await fetch(`${WEB_HOST}/invitation/${fakeToken}`, {
      redirect: "manual",
    });

    const body = await response.text();
    const tokenPattern = /invite_token/i;
    expect(tokenPattern.test(body)).toBe(false);
  });
});

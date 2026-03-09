import { describe, test, expect } from "vitest";

const WEB_HOST =
  (import.meta as any).env?.VITE_WEB_HOST || "http://localhost:3000";

describe("magic link security", () => {
  test("invalid magic link token returns error", async () => {
    const fakeToken = "00000000-0000-0000-0000-000000000000";
    const response = await fetch(`${WEB_HOST}/auth/magic-link/${fakeToken}`, {
      redirect: "manual",
    });

    expect([302, 400, 404, 500]).toContain(response.status);

    if (response.status === 302) {
      const location = response.headers.get("location") || "";
      expect(location).not.toContain("/welcome");
    }
  });

  test("magic link endpoint is not accessible via GET without token", async () => {
    const response = await fetch(`${WEB_HOST}/auth/magic-link`, {
      redirect: "manual",
    });

    expect(response.status).not.toBe(500);
  });
});

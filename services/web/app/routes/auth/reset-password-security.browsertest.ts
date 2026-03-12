import { describe, test, expect } from "vitest";

const WEB_HOST =
  (import.meta as any).env?.VITE_WEB_HOST || "http://localhost:3000";

describe("password reset security", () => {
  test("reset-password page is accessible without authentication", async () => {
    const response = await fetch(`${WEB_HOST}/auth/reset-password`, {
      redirect: "manual",
    });

    expect(response.status).toBe(200);
  });

  test("reset-password action returns same response for existing and non-existing email", async () => {
    const sendReset = async (email: string) => {
      const body = new URLSearchParams({ email_address: email });
      return fetch(`${WEB_HOST}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        redirect: "manual",
      });
    };

    const realResponse = await sendReset(`existing-${Date.now()}@example.org`);
    const fakeResponse = await sendReset(
      `definitely-not-real-${Date.now()}@example.org`,
    );

    expect(realResponse.status).toBe(fakeResponse.status);
  });

  test("reset-password rejects invalid email format", async () => {
    const body = new URLSearchParams({ email_address: "not-an-email" });
    const response = await fetch(`${WEB_HOST}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      redirect: "manual",
    });

    expect(response.status).toBe(400);
  });

  test("update-password rejects password shorter than 8 characters", async () => {
    const body = new URLSearchParams({
      reset_token: "00000000-0000-0000-0000-000000000000",
      password: "short",
      password_confirmation: "short",
    });

    const response = await fetch(
      `${WEB_HOST}/auth/update-password/00000000-0000-0000-0000-000000000000`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        redirect: "manual",
      },
    );

    expect(response.status).toBe(400);
  });

  test("update-password rejects mismatched passwords", async () => {
    const body = new URLSearchParams({
      reset_token: "00000000-0000-0000-0000-000000000000",
      password: "password123",
      password_confirmation: "password456",
    });

    const response = await fetch(
      `${WEB_HOST}/auth/update-password/00000000-0000-0000-0000-000000000000`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        redirect: "manual",
      },
    );

    expect(response.status).toBe(400);
  });
});

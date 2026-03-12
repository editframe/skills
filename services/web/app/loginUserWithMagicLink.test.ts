import { describe, test, expect, beforeEach } from "vitest";
import { db } from "@/sql-client.server";
import { sql } from "kysely";
import { safeRegisterUser } from "@/sql-client.server/safeRegisterUser";
import {
  loginUserWithMagicLink,
  getUserEmailAndPasswordByMagicToken,
} from "./loginUserWithMagicLink";

describe("loginUserWithMagicLink", () => {
  const testEmail = `magic-link-test-${Date.now()}@example.org`;

  beforeEach(async () => {
    await db
      .deleteFrom("identity.magic_link_tokens")
      .where(
        "user_id",
        "in",
        db
          .selectFrom("identity.email_passwords")
          .where("email_address", "=", testEmail)
          .select("user_id"),
      )
      .execute();
  });

  describe("loginUserWithMagicLink", () => {
    test("returns undefined for nonexistent email", async () => {
      const result = await loginUserWithMagicLink(
        "nonexistent-magic@example.org",
      );
      expect(result).toBeUndefined();
    });

    test("creates a magic link token for existing user", async () => {
      await safeRegisterUser(testEmail, "password123");
      const result = await loginUserWithMagicLink(testEmail);

      expect(result).toBeDefined();
      expect(result!.email_address).toBe(testEmail);
    });
  });

  describe("getUserEmailAndPasswordByMagicToken", () => {
    test("rejects invalid token", async () => {
      await expect(
        getUserEmailAndPasswordByMagicToken(
          "00000000-0000-0000-0000-000000000000",
        ),
      ).rejects.toThrow("Invalid or expired magic link");
    });

    test("claims and returns user for valid token", async () => {
      await safeRegisterUser(testEmail, "password123");
      await loginUserWithMagicLink(testEmail);

      const token = await db
        .selectFrom("identity.magic_link_tokens")
        .where(
          "user_id",
          "in",
          db
            .selectFrom("identity.email_passwords")
            .where("email_address", "=", testEmail)
            .select("user_id"),
        )
        .where("claimed_at", "is", null)
        .select("token")
        .executeTakeFirst();

      expect(token).toBeDefined();

      const result = await getUserEmailAndPasswordByMagicToken(token!.token);
      expect(result.email_address).toBe(testEmail);

      const claimed = await db
        .selectFrom("identity.magic_link_tokens")
        .where("token", "=", token!.token)
        .select("claimed_at")
        .executeTakeFirst();

      expect(claimed!.claimed_at).not.toBeNull();
    });

    test("rejects already-claimed token", async () => {
      await safeRegisterUser(testEmail, "password123");
      await loginUserWithMagicLink(testEmail);

      const token = await db
        .selectFrom("identity.magic_link_tokens")
        .where(
          "user_id",
          "in",
          db
            .selectFrom("identity.email_passwords")
            .where("email_address", "=", testEmail)
            .select("user_id"),
        )
        .where("claimed_at", "is", null)
        .select("token")
        .executeTakeFirst();

      await getUserEmailAndPasswordByMagicToken(token!.token);

      await expect(
        getUserEmailAndPasswordByMagicToken(token!.token),
      ).rejects.toThrow("Invalid or expired magic link");
    });

    test("rejects expired token (older than 1 hour)", async () => {
      await safeRegisterUser(testEmail, "password123");
      await loginUserWithMagicLink(testEmail);

      const token = await db
        .selectFrom("identity.magic_link_tokens")
        .where(
          "user_id",
          "in",
          db
            .selectFrom("identity.email_passwords")
            .where("email_address", "=", testEmail)
            .select("user_id"),
        )
        .where("claimed_at", "is", null)
        .select("token")
        .executeTakeFirst();

      await db
        .updateTable("identity.magic_link_tokens")
        .set({ created_at: sql`now() - interval '2 hours'` })
        .where("token", "=", token!.token)
        .execute();

      await expect(
        getUserEmailAndPasswordByMagicToken(token!.token),
      ).rejects.toThrow("Invalid or expired magic link");
    });
  });
});

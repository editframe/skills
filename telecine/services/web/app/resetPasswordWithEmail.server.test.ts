import { describe, test, expect, beforeEach } from "vitest";
import { db } from "@/sql-client.server";
import { sql } from "kysely";
import { safeRegisterUser } from "@/sql-client.server/safeRegisterUser";
import {
  resetPasswordUserWithPassword,
  getUserByResetToken,
  resetPasswordWithToken,
} from "./resetPasswordWithEmail.server";

describe("resetPasswordWithEmail", () => {
  const testEmail = `reset-test-${Date.now()}@example.org`;

  beforeEach(async () => {
    await db
      .deleteFrom("identity.password_resets")
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

  describe("resetPasswordUserWithPassword", () => {
    test("returns null for nonexistent email", async () => {
      const result = await resetPasswordUserWithPassword(
        "nonexistent@example.org",
      );
      expect(result).toBeNull();
    });

    test("creates a reset token for an existing user", async () => {
      await safeRegisterUser(testEmail, "password123");
      const result = await resetPasswordUserWithPassword(testEmail);

      expect(result).not.toBeNull();
      expect(result!.emailAddress).toBe(testEmail);
      expect(result!.reset_token).toBeDefined();
    });

    test("does not duplicate when a valid (unclaimed, <1hr) reset exists", async () => {
      await safeRegisterUser(testEmail, "password123");

      const first = await resetPasswordUserWithPassword(testEmail);
      expect(first).not.toBeNull();

      const second = await resetPasswordUserWithPassword(testEmail);
      expect(second).toBeNull();
    });

    test("creates new reset when previous reset was claimed", async () => {
      await safeRegisterUser(testEmail, "password123");

      const first = await resetPasswordUserWithPassword(testEmail);
      expect(first).not.toBeNull();

      await db
        .updateTable("identity.password_resets")
        .set({ claimed_at: sql`now()` })
        .where("reset_token", "=", first!.reset_token)
        .execute();

      const second = await resetPasswordUserWithPassword(testEmail);
      expect(second).not.toBeNull();
      expect(second!.reset_token).not.toBe(first!.reset_token);
    });
  });

  describe("getUserByResetToken", () => {
    test("returns email for valid unclaimed token", async () => {
      await safeRegisterUser(testEmail, "password123");
      const reset = await resetPasswordUserWithPassword(testEmail);

      const email = await getUserByResetToken(reset!.reset_token);
      expect(email).toBe(testEmail);
    });

    test("rejects invalid token", async () => {
      await expect(
        getUserByResetToken("00000000-0000-0000-0000-000000000000"),
      ).rejects.toThrow("Invalid reset token");
    });

    test("rejects claimed token", async () => {
      await safeRegisterUser(testEmail, "password123");
      const reset = await resetPasswordUserWithPassword(testEmail);

      await db
        .updateTable("identity.password_resets")
        .set({ claimed_at: sql`now()` })
        .where("reset_token", "=", reset!.reset_token)
        .execute();

      await expect(
        getUserByResetToken(reset!.reset_token),
      ).rejects.toThrow("Invalid reset token");
    });

    test("rejects expired token (older than 1 hour)", async () => {
      await safeRegisterUser(testEmail, "password123");
      const reset = await resetPasswordUserWithPassword(testEmail);

      await db
        .updateTable("identity.password_resets")
        .set({ created_at: sql`now() - interval '2 hours'` })
        .where("reset_token", "=", reset!.reset_token)
        .execute();

      await expect(
        getUserByResetToken(reset!.reset_token),
      ).rejects.toThrow("Invalid reset token");
    });
  });

  describe("resetPasswordWithToken", () => {
    test("resets password and claims all tokens for user", async () => {
      await safeRegisterUser(testEmail, "password123");
      const reset = await resetPasswordUserWithPassword(testEmail);

      const result = await resetPasswordWithToken(
        reset!.reset_token,
        "newpassword456",
      );

      expect(result).toBeDefined();

      const allResets = await db
        .selectFrom("identity.password_resets")
        .where(
          "user_id",
          "in",
          db
            .selectFrom("identity.email_passwords")
            .where("email_address", "=", testEmail)
            .select("user_id"),
        )
        .selectAll()
        .execute();

      for (const r of allResets) {
        expect(r.claimed_at).not.toBeNull();
      }
    });

    test("rejects already-claimed token", async () => {
      await safeRegisterUser(testEmail, "password123");
      const reset = await resetPasswordUserWithPassword(testEmail);

      await resetPasswordWithToken(reset!.reset_token, "newpassword456");

      await expect(
        resetPasswordWithToken(reset!.reset_token, "anotherpassword"),
      ).rejects.toThrow();
    });
  });
});

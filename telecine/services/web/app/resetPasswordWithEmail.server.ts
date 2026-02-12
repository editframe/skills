import { generatePassword } from "@/util/scryptPromise.server";
import { db } from "@/sql-client.server";
import { sql } from "kysely";
import { logger } from "@/logging";

export async function resetPasswordUserWithPassword(emailAddress: string) {
  const passwordReset = await db
    .insertInto("identity.password_resets")
    .columns(["user_id"])
    .expression((eb) =>
      eb
        .selectFrom("identity.email_passwords")
        .leftJoin(
          "identity.valid_password_resets",
          "identity.valid_password_resets.user_id",
          "identity.email_passwords.user_id",
        )
        .where("email_address", "=", emailAddress)
        .where("identity.valid_password_resets.user_id", "is", null)
        .select(["identity.email_passwords.user_id"]),
    )
    .returningAll()
    .executeTakeFirst();

  if (!passwordReset) {
    logger.info(
      { emailAddress },
      "Password reset not created: email not found or valid reset already pending",
    );
    return null;
  }

  return {
    emailAddress,
    reset_token: passwordReset.reset_token,
  };
}

export async function getUserByResetToken(resetToken: string) {
  const user = await db
    .selectFrom("identity.email_passwords")
    .innerJoin(
      "identity.valid_password_resets",
      "identity.valid_password_resets.user_id",
      "identity.email_passwords.user_id",
    )
    .where("identity.valid_password_resets.reset_token", "=", resetToken)
    .select([
      "identity.email_passwords.email_address",
      "identity.email_passwords.user_id",
    ])
    .executeTakeFirst();

  if (!user?.user_id) {
    throw new Error("Invalid reset token");
  }

  return user.email_address;
}
export async function resetPasswordWithToken(token: string, password: string) {
  const [hash, salt] = await generatePassword(password);

  const result = await db
    .with("select_password_reset", (cte) =>
      cte
        .selectFrom("identity.valid_password_resets")
        .where("reset_token", "=", token)
        .select(["user_id"]),
    )
    .with("select_email_password", (cte) =>
      cte
        .selectFrom("identity.email_passwords")
        .where(
          "user_id",
          "=",
          cte.selectFrom("select_password_reset").select("user_id"),
        ),
    )
    .with("update_password", (cte) =>
      cte
        .updateTable("identity.email_passwords")
        .set({ hash, salt })
        .where(
          "user_id",
          "=",
          cte.selectFrom("select_password_reset").select("user_id"),
        )
        .returningAll(),
    )
    .with("update_password_resets", (cte) =>
      cte
        .updateTable("identity.password_resets")
        .set({ claimed_at: sql`now()` })
        .where(
          "user_id",
          "=",
          cte.selectFrom("select_password_reset").select("user_id"),
        )
        .returningAll(),
    )
    .selectFrom("update_password")
    .executeTakeFirst();

  if (!result) {
    logger.error("Failed to reset password");
    throw new Error("Failed to reset password");
  }

  return result;
}

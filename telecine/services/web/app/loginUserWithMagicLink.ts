import { db } from "@/sql-client.server";
import { type SqlBool, sql } from "kysely";

export async function loginUserWithMagicLink(emailAddress: string) {
  const emailPassword = await db
    .selectFrom("identity.email_passwords")
    .innerJoin(
      "identity.users",
      "identity.email_passwords.user_id",
      "identity.users.id",
    )
    .where("identity.email_passwords.email_address", "=", emailAddress)
    .selectAll()
    .executeTakeFirst();

  if (!emailPassword) {
    return;
  }

  const emailToken = await db
    .insertInto("identity.magic_link_tokens")
    .values({
      email_address: emailAddress,
      user_id: emailPassword.user_id,
    })
    .returning(["email_address", "created_at", "updated_at"])
    .executeTakeFirst();

  if (!emailToken) {
    return;
  }

  return emailToken;
}

export async function getUserEmailAndPasswordByMagicToken(token: string) {
  const userPassword = await db
    .selectFrom("identity.magic_link_tokens")
    .innerJoin(
      "identity.email_passwords",
      "identity.magic_link_tokens.user_id",
      "identity.email_passwords.user_id",
    )
    .innerJoin(
      "identity.email_confirmations",
      "identity.email_passwords.user_id",
      "identity.email_confirmations.user_id",
    )
    .where("identity.magic_link_tokens.token", "=", token)
    .where("identity.magic_link_tokens.claimed_at", "is", null)
    .where(
      sql<SqlBool>`identity.magic_link_tokens.created_at >= now() - interval '1 hour'`,
    )
    .selectAll("identity.email_passwords")
    .select("identity.email_confirmations.confirmed_at")
    .executeTakeFirst();

  if (!userPassword) {
    throw new Error("Invalid or expired magic link");
  }

  await db
    .updateTable("identity.magic_link_tokens")
    .set({ claimed_at: sql`now()` })
    .where("token", "=", token)
    .where("claimed_at", "is", null)
    .execute();

  return userPassword;
}

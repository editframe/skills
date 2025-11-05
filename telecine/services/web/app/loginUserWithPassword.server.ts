import { sql } from "kysely";
import { db } from "@/sql-client.server";
import { verifyPassword } from "@/util/scryptPromise.server";

export async function loginUserWithPassword(
  emailAddress: string,
  passwordText: string,
) {
  const emailPassword = await db
    .with("latest_confirmations", (db) =>
      db
        .selectFrom("identity.email_confirmations")
        .selectAll("identity.email_confirmations")
        .select([
          sql<number>`ROW_NUMBER() OVER (PARTITION BY email_confirmations.user_id ORDER BY email_confirmations.created_at DESC)`.as(
            "confirmation",
          ),
        ]),
    )
    .selectFrom("identity.email_passwords")
    .innerJoin(
      "identity.users",
      "identity.email_passwords.user_id",
      "identity.users.id",
    )
    .innerJoin(
      "latest_confirmations",
      "latest_confirmations.user_id",
      "identity.users.id",
    )
    .where("identity.email_passwords.email_address", "=", emailAddress)
    .where("latest_confirmations.confirmation", "=", 1)
    .selectAll("identity.email_passwords")
    .select("latest_confirmations.confirmed_at")
    .executeTakeFirst();

  if (!emailPassword) {
    return;
  }

  if (
    await verifyPassword(passwordText, emailPassword.hash, emailPassword.salt)
  ) {
    return emailPassword;
  }
}

import { logger } from "@/logging";
import { db } from "@/sql-client.server";
import { generatePassword } from "@/util/scryptPromise.server";

export async function registerUserWithPassword(
  emailAddress: string,
  password: string,
  firstName: string | null = null,
  lastName: string | null = null,
  // Referral must be null to satisfy the kysely insertion.
  // if it was undefined, it would try to insert () instead of (null),
  // which is a syntax error
  referral: string | null = null,
) {
  const [key, salt] = await generatePassword(password);

  const maybeEmailPassword = await db
    .with("insert_user", (cte) =>
      cte
        .insertInto("identity.users")
        .values({ referral, first_name: firstName, last_name: lastName })
        .returningAll(),
    )
    .with("insert_password", (cte) =>
      cte
        .insertInto("identity.email_passwords")
        .values({
          email_address: emailAddress,
          hash: key,
          salt,
          user_id: cte.selectFrom("insert_user").select("id"),
        })
        .returningAll(),
    )
    .with("insert_email_confirmation", (cte) =>
      cte
        .insertInto("identity.email_confirmations")
        .values({
          user_id: cte.selectFrom("insert_user").select("id"),
          email_password_id: cte.selectFrom("insert_password").select("id"),
        })
        .returningAll(),
    )
    .selectFrom("insert_password")
    .selectAll()
    .executeTakeFirst();

  if (!maybeEmailPassword) {
    logger.error("Failed to create user");
    throw new Error("Failed to create user");
  }

  const org = await db
    .insertInto("identity.orgs")
    .values({
      primary_user_id: maybeEmailPassword.user_id,
      display_name: "Your first organization",
    })
    .returning(["id"])
    .executeTakeFirstOrThrow(() => new Error("Failed to create organization"));

  await db
    .insertInto("identity.memberships")
    .values({
      org_id: org.id,
      user_id: maybeEmailPassword.user_id,
      role: "admin",
    })
    .executeTakeFirstOrThrow(
      () => new Error("Failed to create organization member"),
    );

  return { confirmed_at: null, ...maybeEmailPassword } as const;
}

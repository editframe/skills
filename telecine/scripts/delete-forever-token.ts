#!/usr/bin/env node
import { db } from "@/sql-client.server";

const EMAIL = "collin@editframe.com";
const TOKEN_NAME = "Forever Token (Worktree Scripts)";

async function deleteForeverToken() {
  const user = await db
    .selectFrom("identity.email_passwords")
    .innerJoin("identity.users", "identity.email_passwords.user_id", "identity.users.id")
    .where("identity.email_passwords.email_address", "=", EMAIL)
    .select(["identity.users.id as user_id"])
    .executeTakeFirst();

  if (!user) {
    throw new Error(`User not found for email: ${EMAIL}`);
  }

  const deleted = await db
    .deleteFrom("identity.api_keys")
    .where("user_id", "=", user.user_id)
    .where("name", "=", TOKEN_NAME)
    .where("expired_at", "is", null)
    .execute();

  console.log(`Deleted ${deleted.length} existing token(s)`);
  process.exit(0);
}

deleteForeverToken().catch((error) => {
  console.error("Error deleting forever token:", error);
  process.exit(1);
});


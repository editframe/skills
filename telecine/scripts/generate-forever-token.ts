#!/usr/bin/env node
import { v4 } from "uuid";
import { db } from "@/sql-client.server";
import { createApiKey } from "~/createApiKey.server";

const EMAIL = "collin@editframe.com";
const TOKEN_NAME = "Forever Token (Worktree Scripts)";

async function generateForeverToken() {
  const user = await db
    .selectFrom("identity.email_passwords")
    .innerJoin("identity.users", "identity.email_passwords.user_id", "identity.users.id")
    .where("identity.email_passwords.email_address", "=", EMAIL)
    .selectAll("identity.email_passwords")
    .select(["identity.users.id as user_id"])
    .executeTakeFirst();

  if (!user) {
    throw new Error(`User not found for email: ${EMAIL}`);
  }

  const org = await db
    .selectFrom("identity.orgs")
    .where("primary_user_id", "=", user.user_id)
    .selectAll()
    .executeTakeFirst();

  if (!org) {
    throw new Error(`No organization found for user: ${EMAIL}`);
  }

  const existingApiKey = await db
    .selectFrom("identity.api_keys")
    .where("user_id", "=", user.user_id)
    .where("name", "=", TOKEN_NAME)
    .where("expired_at", "is", null)
    .selectAll()
    .executeTakeFirst();

  if (existingApiKey) {
    throw new Error(
      `A forever token with name "${TOKEN_NAME}" already exists (ID: ${existingApiKey.id}). ` +
      `Since tokens are hashed, we cannot retrieve the original token. ` +
      `Please either delete the existing token or use a different name.`
    );
  }

  const generatedToken = `ef_${v4().replaceAll("-", "")}`;
  const generatedSecret = `ef_webhook_${v4().replaceAll("-", "")}`;

  const apiKey = await createApiKey({
    token: generatedToken,
    webhookSecret: generatedSecret,
    name: TOKEN_NAME,
    orgId: org.id,
    userId: user.user_id,
    webhookUrl: null,
    webhookEvents: [],
    expired_at: null,
  });

  const fullToken = `${generatedToken}_${apiKey.id}`;
  
  console.log(fullToken);
  process.exit(0);
}

generateForeverToken().catch((error) => {
  console.error("Error generating forever token:", error);
  process.exit(1);
});


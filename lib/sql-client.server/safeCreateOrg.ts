import { db } from "./database";
import type { IdentityEmailPasswords } from "./kysely-codegen";

interface SafeOrgOptions {
  primary: Pick<IdentityEmailPasswords, "user_id" | "email_address">;
  displayName: string;
  admins?: Pick<IdentityEmailPasswords, "user_id" | "email_address">[];
  editors?: Pick<IdentityEmailPasswords, "user_id" | "email_address">[];
  readers?: Pick<IdentityEmailPasswords, "user_id" | "email_address">[];
}

export async function safeCreateOrg(options: SafeOrgOptions) {
  let org = await db
    .selectFrom("identity.orgs")
    .where("primary_user_id", "=", options.primary.user_id)
    .where("display_name", "=", options.displayName)
    .selectAll()
    .executeTakeFirst();

  if (!org) {
    org = await db
      .insertInto("identity.orgs")
      .values({
        primary_user_id: options.primary.user_id,
        display_name: options.displayName,
      })
      .returningAll()
      .executeTakeFirst();
  }

  if (!org) {
    throw new Error("Org not found or created");
  }

  for (const admin of options.admins ?? []) {
    await db
      .insertInto("identity.memberships")
      .values({
        org_id: org.id,
        user_id: admin.user_id,
        role: "admin",
      })
      .onConflict((b) => b.doNothing())
      .execute();
  }

  for (const editor of options.editors ?? []) {
    await db
      .insertInto("identity.memberships")
      .values({
        org_id: org.id,
        user_id: editor.user_id,
        role: "editor",
      })
      .onConflict((b) => b.doNothing())
      .execute();
  }

  for (const reader of options.readers ?? []) {
    await db
      .insertInto("identity.memberships")
      .values({
        org_id: org.id,
        user_id: reader.user_id,
        role: "reader",
      })
      .onConflict((b) => b.doNothing())
      .execute();
  }

  return org;
}

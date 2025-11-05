import { db } from "@/sql-client.server";
import { verifyPassword, generatePassword } from "@/util/scryptPromise.server";

export async function updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const emailPassword = await db
    .selectFrom("identity.email_passwords")
    .innerJoin(
      "identity.users",
      "identity.email_passwords.user_id",
      "identity.users.id",
    )
    .where("identity.email_passwords.user_id", "=", userId)
    .selectAll("identity.email_passwords")
    .executeTakeFirst();

  if (!emailPassword) {
    return;
  }
  if (
    await verifyPassword(
      currentPassword,
      emailPassword.hash,
      emailPassword.salt,
    )
  ) {
    const [hash, salt] = await generatePassword(newPassword);
    await db
      .updateTable("identity.email_passwords")
      .set({ hash, salt })
      .where("user_id", "=", userId)
      .execute();
    return emailPassword;
  }
  throw new Error("Invalid password");
}

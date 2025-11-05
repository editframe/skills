import { db } from "@/sql-client.server";
import { registerUserWithPassword } from "~/registerUserWithPassword.server";

export async function safeRegisterUser(
  emailAddress: string,
  password: string,
  firstName: string | null = null,
  lastName: string | null = null,
) {
  try {
    await registerUserWithPassword(emailAddress, password, firstName, lastName);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "constraint" in error &&
      error.constraint === "email_passwords_email_address_key"
    ) {
    } else {
      console.error("Error registering user.", error);
      throw error;
    }
  }

  const user = await db
    .selectFrom("identity.users")
    .innerJoin(
      "identity.email_passwords",
      "identity.users.id",
      "identity.email_passwords.user_id",
    )
    .where("identity.email_passwords.email_address", "=", emailAddress)
    .selectAll("identity.email_passwords")
    .select(["identity.users.first_name", "identity.users.last_name"])
    .executeTakeFirst();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

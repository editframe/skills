import type { BrowserContext } from "@playwright/test";
import { db } from "@/sql-client.server";
import { createEmailPasswordSessionCookie } from "@/util/session";
import cookieParser from "set-cookie-parser";

export async function signInAsEmailAddress(
  context: BrowserContext,
  emailAddress: string,
) {
  const emailPassword = await db
    .selectFrom("identity.email_passwords")
    .innerJoin(
      "identity.users",
      "identity.email_passwords.user_id",
      "identity.users.id",
    )
    .leftJoin(
      "identity.email_confirmations",
      "identity.users.id",
      "identity.email_confirmations.user_id",
    )
    .where("identity.email_passwords.email_address", "=", emailAddress)
    .selectAll("identity.email_passwords")
    .select("identity.email_confirmations.confirmed_at")
    .executeTakeFirst();

  if (!emailPassword) {
    throw new Error("User not found");
  }

  const cookie = await createEmailPasswordSessionCookie(emailPassword);
  const [parsedCookie] = cookieParser.parse(cookie);

  if (!parsedCookie) {
    throw new Error("Cookie not found");
  }

  await context.addCookies([
    {
      name: parsedCookie.name,
      value: parsedCookie.value,
      path: parsedCookie.path,
      // Playwright tests run inside the docker-compose environment
      domain: process.env.PLAYWRIGHT_WEB_HOST?.split("http://")[1] ?? "web",
      httpOnly: parsedCookie.httpOnly,
      // @ts-expect-error this is a valid value
      sameSite: parsedCookie.sameSite,
    },
  ]);
}

import { describe, test, expect, beforeAll } from "vitest";
import { sql } from "kysely";
import { db } from "@/sql-client.server";
import {
  setupBrowser,
  getPage,
  waitForEmail,
  followEmailLink,
  createUniqueUser,
  playwrightExpect,
} from "./setup";

setupBrowser();

let uniqueUser: Awaited<ReturnType<typeof createUniqueUser>>;

beforeAll(async () => {
  uniqueUser = await createUniqueUser("reset");
});

describe("password reset", () => {
  test("Password reset full flow", async () => {
    const page = getPage();
    await page.goto("/auth/reset-password");

    await page.getByLabel("Email address").fill(uniqueUser.email_address);
    await page.getByRole("button", { name: "Reset Password" }).click();

    await playwrightExpect(
      page.getByText(
        "If an account with that email exists, we've sent you an email with instructions to reset your password.",
      ),
    ).toBeVisible();

    await waitForEmail(
      uniqueUser.email_address,
      "[Editframe] Reset your password",
    );

    await followEmailLink("Reset your password");
    await page.waitForURL(/\/auth\/update-password\//);

    await page.getByLabel("Password", { exact: true }).fill("newpassword123");
    await page.getByLabel("Password confirmation").fill("newpassword123");
    await page.getByRole("button", { name: "Update Password" }).click();

    await playwrightExpect(page).toHaveURL(/\/auth\/login/);
  });

  test("Same success message for non-existing email", async () => {
    const page = getPage();
    await page.goto("/auth/reset-password");

    await page.getByLabel("Email address").fill("not-a-user@example.org");
    await page.getByRole("button", { name: "Reset Password" }).click();

    await playwrightExpect(
      page.getByText(
        "If an account with that email exists, we've sent you an email with instructions to reset your password.",
      ),
    ).toBeVisible();
  });

  test("Creates new reset if previous was claimed", async () => {
    const page = getPage();
    const user = await createUniqueUser("reset-claimed");

    await db
      .insertInto("identity.password_resets")
      .values({
        user_id: user.user_id,
        claimed_at: sql`now()`,
      })
      .execute();

    await page.goto("/auth/reset-password");
    await page.getByLabel("Email address").fill(user.email_address);
    await page.getByRole("button", { name: "Reset Password" }).click();

    await playwrightExpect(
      page.getByText(
        "If an account with that email exists, we've sent you an email with instructions to reset your password.",
      ),
    ).toBeVisible();

    const passwordResets = await db
      .selectFrom("identity.password_resets")
      .where("user_id", "=", user.user_id)
      .execute();

    expect(passwordResets.length).toEqual(2);
  });

  test("Does not duplicate unclaimed reset", async () => {
    const page = getPage();
    const user = await createUniqueUser("reset-dup");

    await db
      .insertInto("identity.password_resets")
      .values({ user_id: user.user_id })
      .execute();

    await page.goto("/auth/reset-password");
    await page.getByLabel("Email address").fill(user.email_address);
    await page.getByRole("button", { name: "Reset Password" }).click();

    await playwrightExpect(
      page.getByText(
        "If an account with that email exists, we've sent you an email with instructions to reset your password.",
      ),
    ).toBeVisible();

    const passwordResets = await db
      .selectFrom("identity.password_resets")
      .where("user_id", "=", user.user_id)
      .execute();

    expect(passwordResets.length).toEqual(1);
  });

  test("Rejects password shorter than 8 characters", async () => {
    const page = getPage();
    const user = await createUniqueUser("reset-short");

    await page.goto("/auth/reset-password");
    await page.getByLabel("Email address").fill(user.email_address);
    await page.getByRole("button", { name: "Reset Password" }).click();

    await waitForEmail(user.email_address, "[Editframe] Reset your password");

    await followEmailLink("Reset your password");
    await page.waitForURL(/\/auth\/update-password\//);

    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByLabel("Password confirmation").fill("short");
    await page.getByRole("button", { name: "Update Password" }).click();

    await playwrightExpect(
      page.getByText("Password must be at least 8 characters").first(),
    ).toBeVisible();
  });

  test("Expired reset token shows error", async () => {
    const page = getPage();
    const user = await createUniqueUser("reset-expired");

    await db
      .insertInto("identity.password_resets")
      .values({ user_id: user.user_id })
      .execute();

    const reset = await db
      .selectFrom("identity.password_resets")
      .where("user_id", "=", user.user_id)
      .select(["reset_token"])
      .executeTakeFirst();

    await db
      .updateTable("identity.password_resets")
      .set({ created_at: sql`now() - interval '2 hours'` })
      .where("reset_token", "=", reset!.reset_token)
      .execute();

    await page.goto(`/auth/update-password/${reset!.reset_token}`);

    await playwrightExpect(
      page.getByText("There was an error updating your password"),
    ).toBeVisible();
  });
});

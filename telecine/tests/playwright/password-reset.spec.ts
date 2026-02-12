import { sql } from "kysely";
import { test, expect, type Locator } from "../util/test";
import { db } from "@/sql-client.server";

const passwordResetTest = test.extend<{
  emailAddressField: Locator;
  submitResetRequest: Locator;
  messageSentLabel: Locator;

  passwordField: Locator;
  passwordConfirmationField: Locator;
  updatePasswordButton: Locator;
}>({
  emailAddressField: ({ page }, use) => {
    use(page.getByLabel("Email address"));
  },
  submitResetRequest: ({ page }, use) => {
    use(page.getByRole("button", { name: "Reset Password" }));
  },
  messageSentLabel: ({ page }, use) => {
    use(
      page.getByText(
        "If an account with that email exists, we've sent you an email with instructions to reset your password.",
      ),
    );
  },

  passwordField: ({ page }, use) => {
    use(page.getByLabel("Password", { exact: true }));
  },
  passwordConfirmationField: ({ page }, use) => {
    use(page.getByLabel("Password confirmation"));
  },
  updatePasswordButton: ({ page }, use) => {
    use(page.getByRole("button", { name: "Update Password" }));
  },
});

passwordResetTest(
  "Password reset full flow",
  async ({
    page,
    uniqueUser,

    emailAddressField,
    submitResetRequest,
    messageSentLabel,

    passwordField,
    passwordConfirmationField,
    updatePasswordButton,

    waitForEmail,
  }) => {
    await page.goto("/auth/reset-password");

    await emailAddressField.fill(uniqueUser.email_address);
    await submitResetRequest.click();

    await expect(messageSentLabel).toBeVisible();

    await waitForEmail(
      uniqueUser.email_address,
      "[Editframe] Reset your password",
    );

    await page.getByRole("link", { name: "Reset your password" }).click();

    await page.waitForURL(/\/auth\/update-password\//);
    await passwordField.fill("newpassword123");
    await passwordConfirmationField.fill("newpassword123");
    await updatePasswordButton.click();

    await expect(
      page.getByRole("heading", { name: "Login" }).last(),
    ).toBeVisible();
    await expect(page.getByText("Password updated successfully")).toBeVisible();
  },
);

passwordResetTest(
  "Same success message shown for non-existing email (no enumeration)",
  async ({ page, emailAddressField, submitResetRequest, messageSentLabel }) => {
    await page.goto("/auth/reset-password");

    await emailAddressField.fill("not-a-user@example.org");
    await submitResetRequest.click();

    await expect(messageSentLabel).toBeVisible();
  },
);

passwordResetTest(
  "Will create a password reset request if a previously claimed request is present",
  async ({
    page,
    uniqueUser,
    emailAddressField,
    submitResetRequest,
    messageSentLabel,
  }) => {
    await db
      .insertInto("identity.password_resets")
      .values({
        user_id: uniqueUser.user_id,
        claimed_at: sql`now()`,
      })
      .execute();

    await page.goto("/auth/reset-password");

    await emailAddressField.fill(uniqueUser.email_address);
    await submitResetRequest.click();
    await expect(messageSentLabel).toBeVisible();

    const passwordResets = await db
      .selectFrom("identity.password_resets")
      .where("user_id", "=", uniqueUser.user_id)
      .execute();

    expect(passwordResets.length).toEqual(2);
  },
);

passwordResetTest(
  "A password reset will not be duplicated if an unclaimed reset is still present",
  async ({
    page,
    uniqueUser,
    emailAddressField,
    submitResetRequest,
    messageSentLabel,
  }) => {
    await db
      .insertInto("identity.password_resets")
      .values({
        user_id: uniqueUser.user_id,
      })
      .execute();

    await page.goto("/auth/reset-password");

    await emailAddressField.fill(uniqueUser.email_address);
    await submitResetRequest.click();
    await expect(messageSentLabel).toBeVisible();

    const passwordResets = await db
      .selectFrom("identity.password_resets")
      .where("user_id", "=", uniqueUser.user_id)
      .execute();

    expect(passwordResets.length).toEqual(1);
  },
);

passwordResetTest(
  "Rejects password shorter than 8 characters",
  async ({
    page,
    uniqueUser,
    emailAddressField,
    submitResetRequest,
    waitForEmail,
    passwordField,
    passwordConfirmationField,
    updatePasswordButton,
  }) => {
    await page.goto("/auth/reset-password");
    await emailAddressField.fill(uniqueUser.email_address);
    await submitResetRequest.click();

    await waitForEmail(
      uniqueUser.email_address,
      "[Editframe] Reset your password",
    );

    await page.getByRole("link", { name: "Reset your password" }).click();
    await page.waitForURL(/\/auth\/update-password\//);

    await passwordField.fill("short");
    await passwordConfirmationField.fill("short");
    await updatePasswordButton.click();

    await expect(
      page.getByText("Password must be at least 8 characters"),
    ).toBeVisible();
  },
);

passwordResetTest(
  "Expired reset token shows error",
  async ({
    page,
    uniqueUser,
  }) => {
    await db
      .insertInto("identity.password_resets")
      .values({
        user_id: uniqueUser.user_id,
      })
      .execute();

    const reset = await db
      .selectFrom("identity.password_resets")
      .where("user_id", "=", uniqueUser.user_id)
      .select(["reset_token"])
      .executeTakeFirst();

    await db
      .updateTable("identity.password_resets")
      .set({ created_at: sql`now() - interval '2 hours'` })
      .where("reset_token", "=", reset!.reset_token)
      .execute();

    await page.goto(`/auth/update-password/${reset!.reset_token}`);

    await expect(
      page.getByText("There was an error updating your password"),
    ).toBeVisible();
  },
);

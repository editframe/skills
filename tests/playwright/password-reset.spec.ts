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
    use(page.getByRole("button", { name: "Reset password" }));
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
    use(page.getByRole("button", { name: "Update password" }));
  },
});

passwordResetTest(
  "Password reset",
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

    await page.waitForNavigation();
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
  "Password reset for non-existing user",
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
    // Manually insert a password reset
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

    // Manually confirm there are two password resets in the database for the user
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
    // Manually insert a password reset
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

    // Manually confirm there is only one password reset in the database for the user
    const passwordResets = await db
      .selectFrom("identity.password_resets")
      .where("user_id", "=", uniqueUser.user_id)
      .execute();

    expect(passwordResets.length).toEqual(1);
  },
);

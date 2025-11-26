import { deleteEmailsForAddress } from "TEST/util/mailhog";
import { test, expect } from "TEST/util/test";

test("Requires authentication", async ({ requiresAuthentication }) => {
  await requiresAuthentication("/settings");
});

test("Displays user details", async ({ page, signInAs, org }) => {
  await signInAs(org.primary);
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Account Settings" }),
  ).toBeVisible();

  const firstNameInput = page.getByPlaceholder("Enter your first name");
  const lastNameInput = page.getByPlaceholder("Enter your last name");

  await expect(firstNameInput).toBeVisible();
  await expect(lastNameInput).toBeVisible();

  await expect(firstNameInput).toHaveValue(org.primary.first_name!);
  await expect(lastNameInput).toHaveValue(org.primary.last_name!);
});

test("Disables submission until data has changed", async ({
  page,
  signInAs,
  org,
}) => {
  await signInAs(org.primary);
  await page.goto("/settings");

  const submitButton = page.getByRole("button", { name: "Save changes" });
  await expect(submitButton).toBeDisabled();

  await page.getByPlaceholder("Enter your first name").fill("Test");

  await expect(submitButton).toBeEnabled();
});

test("Updates user details", async ({ page, signInAs, uniqueUser }) => {
  await signInAs(uniqueUser);
  await page.goto("/settings");

  const firstNameInput = page.getByPlaceholder("Enter your first name");
  const lastNameInput = page.getByPlaceholder("Enter your last name");

  await firstNameInput.fill("Test");
  await lastNameInput.fill("User");

  const submitButton = page.getByRole("button", { name: "Save changes" });
  await submitButton.click();

  await expect(page.getByText("Account settings saved")).toBeVisible();
});

test("Shows link to change password", async ({ page, signInAs, org }) => {
  await signInAs(org.primary);
  await page.goto("/settings");
  await expect(
    page.getByRole("link", { name: "Change password" }),
  ).toBeVisible();
});

test("Re-sends verification email", async ({
  page,
  signInAs,
  uniqueUser,
  waitForEmail,
  followEmailLink,
}) => {
  await signInAs(uniqueUser);
  await page.goto("/settings");
  await expect(page.getByText("Unverified")).toBeVisible();

  //  We must delete any existing emails for this address, otherwise we may have a
  // race condition that finds the stale confirmation token.
  await deleteEmailsForAddress(uniqueUser.email_address);

  const resendButton = page.getByRole("button", {
    name: "Resend verification",
  });
  await resendButton.click();

  await expect(page.getByText("Verification email sent")).toBeVisible();
  await waitForEmail(uniqueUser.email_address, "Confirm your email address");
  await followEmailLink("Confirm your email address");

  await expect(page.getByText("Verified")).toBeVisible();
});

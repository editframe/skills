import { test, expect } from "TEST/util/test";

test("Requires authentication", async ({ requiresAuthentication }) => {
  await requiresAuthentication("/settings/update-password");
});

test("Updates password successfully", async ({
  page,
  signInAs,
  uniqueUser,
}) => {
  await signInAs(uniqueUser);
  await page.goto("/settings/update-password");

  await page.getByLabel("Current Password").fill("password123");
  await page.getByLabel("New Password").fill("newpassword");
  await page.getByLabel("Password confirmation").fill("newpassword");

  await page.getByRole("button", { name: "Update Password" }).click();

  // Should redirect back to settings page
  await expect(
    page.getByRole("heading", { name: "Account Settings" }),
  ).toBeVisible();
  await expect(page.getByText("Password updated")).toBeVisible();
});

test("Shows error when passwords don't match", async ({
  page,
  signInAs,
  uniqueUser,
}) => {
  await signInAs(uniqueUser);
  await page.goto("/settings/update-password");

  await page.getByLabel("Current Password").fill("password123");
  await page.getByLabel("New Password").fill("newpassword");
  await page.getByLabel("Password confirmation").fill("different");

  await page.getByRole("button", { name: "Update Password" }).click();

  await expect(
    page.getByText("New password and confirm password must match"),
  ).toBeVisible();
});

test("Shows error with incorrect current password", async ({
  page,
  signInAs,
  uniqueUser,
}) => {
  await signInAs(uniqueUser);
  await page.goto("/settings/update-password");

  await page.getByLabel("Current Password").fill("wrongpassword");
  await page.getByLabel("New Password").fill("newpassword");
  await page.getByLabel("Password confirmation").fill("newpassword");

  await page.getByRole("button", { name: "Update Password" }).click();

  await expect(
    page.getByText("There was an error updating your password"),
  ).toBeVisible();
});

test("Cancel link redirects to settings page", async ({
  page,
  signInAs,
  uniqueUser,
}) => {
  await signInAs(uniqueUser);
  await page.goto("/settings/update-password");

  await page.getByRole("link", { name: "Cancel" }).click();

  // Verify redirect to settings page
  await expect(
    page.getByRole("heading", { name: "Account Settings" }),
  ).toBeVisible();
});

test("Password fields should be empty by default", async ({
  page,
  signInAs,
  uniqueUser,
}) => {
  await signInAs(uniqueUser);
  await page.goto("/settings/update-password");

  await expect(page.getByLabel("Current Password")).toHaveValue("");
  await expect(page.getByLabel("New Password")).toHaveValue("");
  await expect(page.getByLabel("Password confirmation")).toHaveValue("");
});

test("Shows error when new password is same as current password", async ({
  page,
  signInAs,
  uniqueUser,
}) => {
  await signInAs(uniqueUser);
  await page.goto("/settings/update-password");

  await page.getByLabel("Current Password").fill("password123");
  await page.getByLabel("New Password").fill("password123");
  await page.getByLabel("Password confirmation").fill("password123");

  await page.getByRole("button", { name: "Update Password" }).click();

  await expect(
    page.getByText("New password must be different than your current password"),
  ).toBeVisible();
});

import { describe, test } from "vitest";
import {
  setupBrowser,
  getPage,
  signInAs,
  requiresAuthentication,
  createUniqueUser,
  playwrightExpect,
} from "./setup";

setupBrowser();

describe("update password", () => {
  test("Requires authentication", async () => {
    await requiresAuthentication("/settings/update-password");
  });

  test("Updates password successfully", async () => {
    const user = await createUniqueUser("updpw");
    await signInAs(user);
    const page = getPage();

    await page.goto("/settings/update-password");
    await page.getByLabel("Current Password").fill("password123");
    await page.getByLabel("New Password").fill("newpassword");
    await page.getByLabel("Password confirmation").fill("newpassword");
    await page.getByRole("button", { name: "Update Password" }).click();

    // Successful update redirects to /settings
    await playwrightExpect(page).toHaveURL(/\/settings(?!\/)/);
  });

  test("Shows error when passwords don't match", async () => {
    const user = await createUniqueUser("updpw-mm");
    await signInAs(user);
    const page = getPage();

    await page.goto("/settings/update-password");
    await page.getByLabel("Current Password").fill("password123");
    await page.getByLabel("New Password").fill("newpassword");
    await page.getByLabel("Password confirmation").fill("different");
    await page.getByRole("button", { name: "Update Password" }).click();

    await playwrightExpect(
      page.getByText("New password and confirm password must match"),
    ).toBeVisible();
  });

  test("Shows error with incorrect current password", async () => {
    const user = await createUniqueUser("updpw-wrong");
    await signInAs(user);
    const page = getPage();

    await page.goto("/settings/update-password");
    await page.getByLabel("Current Password").fill("wrongpassword");
    await page.getByLabel("New Password").fill("newpassword");
    await page.getByLabel("Password confirmation").fill("newpassword");
    await page.getByRole("button", { name: "Update Password" }).click();

    await playwrightExpect(
      page.getByText("There was an error updating your password"),
    ).toBeVisible();
  });

  test("Cancel link redirects to settings page", async () => {
    const user = await createUniqueUser("updpw-cancel");
    await signInAs(user);
    const page = getPage();

    await page.goto("/settings/update-password");
    await page.getByRole("link", { name: "Cancel" }).click();

    await playwrightExpect(
      page.getByRole("heading", { name: "Account Settings" }),
    ).toBeVisible();
  });

  test("Password fields should be empty by default", async () => {
    const user = await createUniqueUser("updpw-empty");
    await signInAs(user);
    const page = getPage();

    await page.goto("/settings/update-password");
    await playwrightExpect(page.getByLabel("Current Password")).toHaveValue("");
    await playwrightExpect(page.getByLabel("New Password")).toHaveValue("");
    await playwrightExpect(
      page.getByLabel("Password confirmation"),
    ).toHaveValue("");
  });

  test("Shows error when new password is same as current password", async () => {
    const user = await createUniqueUser("updpw-same");
    await signInAs(user);
    const page = getPage();

    await page.goto("/settings/update-password");
    await page.getByLabel("Current Password").fill("password123");
    await page.getByLabel("New Password").fill("password123");
    await page.getByLabel("Password confirmation").fill("password123");
    await page.getByRole("button", { name: "Update Password" }).click();

    await playwrightExpect(
      page.getByText(
        "New password must be different than your current password",
      ),
    ).toBeVisible();
  });
});

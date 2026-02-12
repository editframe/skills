import { describe, test, beforeAll } from "vitest";
import {
  setupBrowser,
  getPage,
  signInAs,
  waitForEmail,
  followEmailLink,
  requiresAuthentication,
  createUniqueUser,
  createFullOrgFixture,
  deleteEmailsForAddress,
  playwrightExpect,
  type FullOrgFixture,
} from "./setup";

setupBrowser();

let org: FullOrgFixture;

beforeAll(async () => {
  org = await createFullOrgFixture("settings");
});

describe("settings page", () => {
  test("Requires authentication", async () => {
    await requiresAuthentication("/settings");
  });

  test("Displays user details", async () => {
    const page = getPage();
    await signInAs(org.primary);
    await page.goto("/settings");
    await playwrightExpect(
      page.getByRole("heading", { name: "Account Settings" }),
    ).toBeVisible();

    const firstNameInput = page.getByPlaceholder("Enter your first name");
    const lastNameInput = page.getByPlaceholder("Enter your last name");

    await playwrightExpect(firstNameInput).toBeVisible();
    await playwrightExpect(lastNameInput).toBeVisible();
    await playwrightExpect(firstNameInput).toHaveValue(
      org.primary.first_name!,
    );
    await playwrightExpect(lastNameInput).toHaveValue(
      org.primary.last_name!,
    );
  });

  test("Disables submission until data has changed", async () => {
    const page = getPage();
    await signInAs(org.primary);
    await page.goto("/settings");

    const submitButton = page.getByRole("button", { name: "Save changes" });
    await playwrightExpect(submitButton).toBeDisabled();

    await page.getByPlaceholder("Enter your first name").fill("Test");
    await playwrightExpect(submitButton).toBeEnabled();
  });

  test("Updates user details", async () => {
    const user = await createUniqueUser("settings-upd");
    const page = getPage();
    await signInAs(user);
    await page.goto("/settings");

    await page.getByPlaceholder("Enter your first name").fill("Test");
    await page.getByPlaceholder("Enter your last name").fill("User");

    await page.getByRole("button", { name: "Save changes" }).click();
    await playwrightExpect(
      page.getByText("Account settings saved"),
    ).toBeVisible();
  });

  test("Shows link to change password", async () => {
    const page = getPage();
    await signInAs(org.primary);
    await page.goto("/settings");
    await playwrightExpect(
      page.getByRole("link", { name: "Change password" }),
    ).toBeVisible();
  });

  test("Re-sends verification email", async () => {
    const user = await createUniqueUser("settings-verify");
    const page = getPage();
    await signInAs(user);
    await page.goto("/settings");
    await playwrightExpect(page.getByText("Unverified")).toBeVisible();

    await deleteEmailsForAddress(user.email_address);

    const resendButton = page.getByRole("button", {
      name: "Resend verification",
    });
    await resendButton.click();

    await playwrightExpect(
      page.getByText("Verification email sent"),
    ).toBeVisible();

    await waitForEmail(
      user.email_address,
      "Confirm your email address",
    );
    await followEmailLink("Confirm your email address");

    await playwrightExpect(page.getByText("Verified")).toBeVisible();
  });
});

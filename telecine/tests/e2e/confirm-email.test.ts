import { describe, test } from "vitest";
import {
  setupBrowser,
  getPage,
  signInAs,
  waitForEmail,
  followEmailLink,
  createUniqueUser,
  playwrightExpect,
} from "./setup";

setupBrowser();

describe("email confirmation", () => {
  test("Confirm email redirects to login if not logged in", async () => {
    const user = await createUniqueUser("confirm");
    await waitForEmail(
      user.email_address,
      "[Editframe] Confirm your email address",
    );
    await followEmailLink("Confirm your email address");
    const page = getPage();
    await page.waitForURL(/\/auth\/login/);
    await playwrightExpect(page.getByText("Email confirmed!")).toBeVisible();
  });

  test("Confirm email redirects to settings if logged in", async () => {
    const user = await createUniqueUser("confirm-in");
    await signInAs(user);
    await waitForEmail(
      user.email_address,
      "[Editframe] Confirm your email address",
    );
    await followEmailLink("Confirm your email address");
    const page = getPage();
    await page.waitForURL(/\/settings/);
    await playwrightExpect(page.getByText("Verified")).toBeVisible();
  });

  test("Confirm email cannot use the token more than one time", async () => {
    const user = await createUniqueUser("confirm-dup");
    await waitForEmail(
      user.email_address,
      "[Editframe] Confirm your email address",
    );
    await followEmailLink("Confirm your email address");

    // Navigate back to the email and try to use the link again
    await waitForEmail(
      user.email_address,
      "[Editframe] Confirm your email address",
    );
    await followEmailLink("Confirm your email address");
    const page = getPage();

    await playwrightExpect(page.locator("h3").first()).toHaveText(
      "Failed to confirm email",
    );
  });
});

import { describe, test } from "vitest";
import {
  setupBrowser,
  getPage,
  signInAs,
  waitForEmail,
  createUniqueUser,
  playwrightExpect,
} from "./setup";

setupBrowser();

describe("email confirmation", () => {
  test("Confirm email redirects to login if not logged in", async () => {
    const user = await createUniqueUser("confirm");
    const page = getPage();
    await waitForEmail(
      user.email_address,
      "[Editframe] Confirm your email address",
    );
    await page
      .getByRole("link", { name: "Confirm your email address" })
      .click();
    await page.waitForURL(/\/auth\/login/);
    await playwrightExpect(page.getByText("Email confirmed!")).toBeVisible();
  });

  test("Confirm email redirects to settings if logged in", async () => {
    const user = await createUniqueUser("confirm-in");
    const page = getPage();
    await signInAs(user);
    await waitForEmail(
      user.email_address,
      "[Editframe] Confirm your email address",
    );
    await page
      .getByRole("link", { name: "Confirm your email address" })
      .click();
    await page.waitForURL(/\/settings/);
    await playwrightExpect(page.getByText("Email confirmed!")).toBeVisible();
    await playwrightExpect(page.getByText("Verified")).toBeVisible();
  });

  test("Confirm email cannot use the token more than one time", async () => {
    const user = await createUniqueUser("confirm-dup");
    const page = getPage();
    await waitForEmail(
      user.email_address,
      "[Editframe] Confirm your email address",
    );
    await page
      .getByRole("link", { name: "Confirm your email address" })
      .click();

    // Navigate back to the email and try to use the link again
    await waitForEmail(
      user.email_address,
      "[Editframe] Confirm your email address",
    );
    await page
      .getByRole("link", { name: "Confirm your email address" })
      .click();

    await playwrightExpect(
      page.locator("h3").first(),
    ).toHaveText("Failed to confirm email");
  });
});

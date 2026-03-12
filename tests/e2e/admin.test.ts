import { describe, test } from "vitest";
import {
  setupBrowser,
  getPage,
  createUniqueUser,
  waitForEmail,
  playwrightExpect,
} from "./setup";

setupBrowser();

describe("admin dashboard", () => {
  test.skip("Editframe non admin user", async () => {
    const user = await createUniqueUser("admin-test");
    const page = getPage();

    await page.goto("/auth/register");

    const email = "collin@editframe.com";

    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm password").fill("password123");
    await page.getByRole("button", { name: "Register" }).click();

    await page.getByLabel("First name").fill("Test");
    await page.getByLabel("Last name").fill("User");
    await page.getByLabel("Organization name").fill("Editframe");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Finish setup" }).click();

    await playwrightExpect(page.getByText(`Welcome ${email}`)).toBeVisible();

    await waitForEmail(
      user.email_address,
      "[Editframe] Confirm your email address",
    );
    await page
      .getByRole("link", { name: "Confirm your email address" })
      .click();

    await page.goto("/admin");
    await playwrightExpect(page.getByText(`Welcome ${email}`)).toBeVisible();
  });
});

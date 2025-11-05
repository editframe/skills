import { test, expect, type Locator } from "../util/test";

const emailConfirmationTest = test.extend<{
  confirmationLink: Locator;
}>({
  confirmationLink: async ({ page }, use) => {
    await use(page.getByRole("link", { name: "Confirm your email address" }));
  },
});

emailConfirmationTest(
  "Confirm email",
  async ({ page, uniqueUser, waitForEmail, confirmationLink }) => {
    await waitForEmail(
      uniqueUser.email_address,
      "[Editframe] Confirm your email address",
    );
    await confirmationLink.click();
    await expect(page.locator("h1").first()).toHaveText("Login");
  },
);

emailConfirmationTest(
  "Confirm email cannot use the token more than one time",
  async ({ page, uniqueUser, waitForEmail, confirmationLink }) => {
    await waitForEmail(
      uniqueUser.email_address,
      "[Editframe] Confirm your email address",
    );
    await confirmationLink.click();

    await waitForEmail(
      uniqueUser.email_address,
      "[Editframe] Confirm your email address",
    );
    await confirmationLink.click();

    await expect(page.locator("h3").first()).toHaveText(
      "Failed to confirm email",
    );
  },
);

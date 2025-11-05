import { expect, test, type Locator } from "TEST/util/test";

const emailConfirmationTest = test.extend<{
  confirmationLink: Locator;
}>({
  confirmationLink: async ({ page }, use) => {
    await use(page.getByRole("link", { name: "Confirm your email address" }));
  },
});

emailConfirmationTest(
  "Redirects to login if not logged in",
  async ({ page, uniqueUser, waitForEmail, confirmationLink }) => {
    await waitForEmail(uniqueUser.email_address, "Confirm your email address");
    await confirmationLink.click();
    await expect(page).toHaveURL("/auth/login");
    await expect(
      page.getByText("Email confirmed!"),
    ).toBeVisible();
  },
);

emailConfirmationTest(
  "Redirects to settings if logged in",
  async ({ page, uniqueUser, waitForEmail, confirmationLink, signInAs }) => {
    await signInAs(uniqueUser);
    await waitForEmail(uniqueUser.email_address, "Confirm your email address");
    await confirmationLink.click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByText("Email confirmed!")).toBeVisible();
    await expect(page.getByText("Verified")).toBeVisible();
  },
);

// emailConfirmationTest(
//   "Confirmation tokens can be used",
//   async ({ page, uniqueUser, waitForEmail, confirmationLink }) => {
//     await waitForEmail(uniqueUser.email_address, "Confirm your email address");
//     await confirmationLink.click();

//     await expect(page.locator("h3").first()).toHaveText(
//       "Failed to confirm email",
//     );
//   },
// );

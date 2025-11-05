import { test, expect, type Locator } from "../util/test";
import { safeRegisterUser } from "@/sql-client.server/safeRegisterUser";
import { signInAsEmailAddress } from "tests/util/signInAsEmailAddress";

const updatePasswordTest = test.extend<{
  currentPasswordField: Locator;
  newPasswordField: Locator;
  passwordConfirmationField: Locator;
  updateButton: Locator;
  updateFailedMessage: Locator;
  updateSuccessMessage: Locator;
}>({
  currentPasswordField: async ({ page }, use) => {
    await use(page.getByLabel("Current password"));
  },
  newPasswordField: async ({ page }, use) => {
    await use(page.getByLabel("New password"));
  },
  passwordConfirmationField: async ({ page }, use) => {
    await use(page.getByLabel("Password confirmation"));
  },
  updateButton: async ({ page }, use) => {
    await use(page.getByRole("button", { name: "Update password" }));
  },
  updateFailedMessage: async ({ page }, use) => {
    await use(
      page.getByText(
        "There was an error updating your password. Please try again.",
      ),
    );
  },
  updateSuccessMessage: async ({ page }, use) => {
    await use(page.getByText("Password updated successfully"));
  },
});

updatePasswordTest(
  "Successful password update",
  async ({
    page,
    currentPasswordField,
    newPasswordField,
    passwordConfirmationField,
    updateButton,
    updateSuccessMessage,
    context,
    waitForEmail,
  }) => {
    const email = `${Date.now()}@example.org`;
    await safeRegisterUser(email, "password123");
    await signInAsEmailAddress(context, email);
    await page.goto("/settings/update-password");
    await currentPasswordField.fill("password123");
    await newPasswordField.fill("newpassword123");
    await passwordConfirmationField.fill("newpassword123");
    await updateButton.click();
    await expect(updateSuccessMessage).toBeVisible();
    await waitForEmail(email, "[Editframe] Your password has been updated");
  },
);

updatePasswordTest(
  "Failed password update",
  async ({
    page,
    currentPasswordField,
    newPasswordField,
    passwordConfirmationField,
    updateButton,
    updateFailedMessage,
    context,
  }) => {
    const email = `${Date.now()}@example.org`;
    await safeRegisterUser(email, "password123");
    await signInAsEmailAddress(context, email);
    await page.goto("/settings/update-password");
    await currentPasswordField.fill("wrongpassword");
    await newPasswordField.fill("newpassword123");
    await passwordConfirmationField.fill("newpassword123");
    await updateButton.click();
    await expect(updateFailedMessage).toBeVisible();
  },
);

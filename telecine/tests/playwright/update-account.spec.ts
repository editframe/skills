import { test, expect, type Locator } from "../util/test";
import { safeRegisterUser } from "@/sql-client.server/safeRegisterUser";
import { signInAsEmailAddress } from "tests/util/signInAsEmailAddress";

const updateAccountTest = test.extend<{
  firstNameField: Locator;
  lastNameField: Locator;
  emailField: Locator;
  updateButton: Locator;
  updateFailedMessage: Locator;
  updateSuccessMessage: Locator;
}>({
  firstNameField: async ({ page }, use) => {
    await use(page.getByLabel("First name"));
  },
  lastNameField: async ({ page }, use) => {
    await use(page.getByLabel("Last name"));
  },
  emailField: async ({ page }, use) => {
    await use(page.getByLabel("Email"));
  },
  updateButton: async ({ page }, use) => {
    await use(page.getByRole("button", { name: "Save changes" }));
  },
  updateFailedMessage: async ({ page }, use) => {
    await use(
      page.getByText(
        "There was an error updating your account. Please try again.",
      ),
    );
  },
  updateSuccessMessage: async ({ page }, use) => {
    await use(page.getByText("User updated successfully!"));
  },
});

updateAccountTest(
  "Successful account update",
  async ({
    page,
    firstNameField,
    lastNameField,
    emailField,
    updateButton,
    updateSuccessMessage,
    context,
    waitForEmail,
  }) => {
    const email = `${Date.now()}@example.org`;
    await safeRegisterUser(email, "password123");
    await signInAsEmailAddress(context, email);
    await page.goto("/settings");
    await firstNameField.fill("John");
    await lastNameField.fill("Doe");
    const newEmail = `${Date.now()}@example.org`;
    await emailField.fill(newEmail);
    await updateButton.click();
    await expect(updateSuccessMessage).toBeVisible();
    await waitForEmail(
      newEmail,
      "[Editframe] Confirm your updated email address",
    );
  },
);

updateAccountTest(
  "Failed account update",
  async ({
    page,
    firstNameField,
    lastNameField,
    emailField,
    updateButton,
    updateFailedMessage,
    context,
  }) => {
    const email = `${Date.now()}@example.org`;
    await safeRegisterUser(email, "password123");
    await signInAsEmailAddress(context, email);
    await page.goto("/settings");
    await firstNameField.fill("John");
    await lastNameField.fill("Doe");
    await emailField.fill("invalid-email");
    await updateButton.click();
    await expect(updateFailedMessage).toBeVisible();
  },
);

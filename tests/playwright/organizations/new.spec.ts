import { test, expect, type Locator } from "../../util/test";

const newOrgTest = test.extend<{
  displayNameField: Locator;
  submitButton: Locator;
}>({
  displayNameField: async ({ page }, use) => {
    use(page.getByLabel("Display Name"));
  },
  submitButton: async ({ page }, use) => {
    use(page.getByRole("button", { name: "Create Organization" }));
  },
});

newOrgTest(
  "New org page requires authentication",
  async ({ requiresAuthentication }) => {
    await requiresAuthentication("/organizations/new");
  },
);

newOrgTest(
  "Create new organization",
  async ({ page, signInAs, uniqueUser, displayNameField, submitButton }) => {
    await signInAs(uniqueUser);
    await page.goto("/organizations/new");

    const displayName = `New Organization ${uniqueUser.email_address}`;

    await displayNameField.fill(displayName);
    await submitButton.click();

    await expect(page.getByRole("heading").first()).toHaveText(
      `Organization: ${displayName}`,
    );
  },
);

import { test, expect, type Locator } from "../../tests/util/test";

const newTest = test.extend<{
  navigate: undefined;
  snapshotField: Locator;
  submitButton: Locator;
  invalidJSONMessage: Locator;
  validJSON: string;
}>({
  navigate: [
    async ({ page, uniqueUser, signInAs }, use) => {
      await signInAs(uniqueUser);
      await page.goto("/renders/new");
      await use(undefined);
    },
    { auto: true },
  ],
  snapshotField: ({ page }, use) => use(page.getByLabel("Snapshot")),
  submitButton: ({ page }, use) => use(page.getByText("Create Render")),
  invalidJSONMessage: ({ page }, use) => use(page.getByText("Invalid JSON")),

  validJSON: ({}, use) => use(JSON.stringify({ id: "test-id" })),
});

test("Requires authentication", async ({ requiresAuthentication }) => {
  await requiresAuthentication("/renders/new");
});

newTest(
  "Validates JSON data is json shaped",
  async ({ snapshotField, submitButton, invalidJSONMessage }) => {
    await snapshotField.fill("not json");
    await submitButton.click();
    await expect(invalidJSONMessage).toBeVisible();
  },
);

newTest(
  "Creates a new render",
  async ({ page, snapshotField, submitButton, validJSON }) => {
    await snapshotField.fill(validJSON);
    await submitButton.click();
    await expect(
      page.getByRole("heading", { name: /Show Render/ }),
    ).toBeVisible();
  },
);

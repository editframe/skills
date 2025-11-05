import { test, expect, type Locator } from "../../util/test";
import { safeCreateOrg } from "@/sql-client.server/safeCreateOrg";

const editOrgTest = test.extend<{
  displayNameField: Locator;
  submitButton: Locator;
  editableOrg: Awaited<ReturnType<typeof safeCreateOrg>>;
}>({
  displayNameField: async ({ page }, use) => {
    use(page.getByLabel("Display Name"));
  },
  submitButton: async ({ page }, use) => {
    use(page.getByRole("button", { name: "Save changes" }));
  },
  editableOrg: async ({ uniqueUser }, use) => {
    const displayName = `New Organization ${uniqueUser.email_address}`;
    const organization = await safeCreateOrg({
      displayName,
      primary: uniqueUser,
      admins: [uniqueUser],
    });
    use(organization);
  },
});

editOrgTest(
  "Edit org page requires authentication",
  async ({ requiresAuthentication }) => {
    await requiresAuthentication("/organizations/1/");
  },
);

// `editor` in the org-editors role refers to being able to create projects,
// only admins can edit the org itself
editOrgTest("org-editors can not edit org", async ({ page, signInAs, org }) => {
  await signInAs(org.editor);
  await page.goto(`/organizations/${org.id}/`);
  await expect(
    page.getByText(
      "Restricted access: Only the organization owner can edit the organization details.",
    ),
  ).toBeVisible();
});

editOrgTest("org-readers can not edit org", async ({ page, signInAs, org }) => {
  await signInAs(org.reader);
  await page.goto(`/organizations/${org.id}/`);
  await expect(
    page.getByText(
      "Restricted access: Only the organization owner can edit the organization details.",
    ),
  ).toBeVisible();
});

editOrgTest(
  "Edit new organization",
  async ({
    page,
    uniqueUser,
    editableOrg,
    signInAs,
    displayNameField,
    submitButton,
  }) => {
    await signInAs(uniqueUser);

    await page.goto(`/organizations/${editableOrg.id}/`);

    await displayNameField.fill("Edited");
    await submitButton.click();
    await expect(page.locator("h1").first()).toHaveText("Organization: Edited");
    await expect(
      page.getByText("Organization edited successfully!"),
    ).toBeVisible();
  },
);

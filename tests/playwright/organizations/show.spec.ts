import { test, expect, type Locator } from "../../util/test";

const showOrgTest = test.extend<{
  editLinkLocator: Locator;
  inviteLinkLocator: Locator;
  deleteMemberLinkLocator: Locator;
}>({
  editLinkLocator: async ({ page }, use) => {
    use(page.getByRole("button", { name: "Save changes", exact: true }));
  },
  inviteLinkLocator: async ({ page }, use) => {
    use(page.getByRole("button", { name: "Invite member" }));
  },
  deleteMemberLinkLocator: async ({ page }, use) => {
    use(page.getByRole("button", { name: "Delete member" }).first());
  },
});

showOrgTest("requires authentication", async ({ requiresAuthentication }) => {
  await requiresAuthentication("/organizations/1");
});

showOrgTest(
  "requires access to the org",
  async ({ page, org, signInAs, otherOrg }) => {
    await signInAs(org.admin);
    await page.goto(`/organizations/${otherOrg.id}`);
    await expect(page.getByText("Organization not found")).toBeVisible();
  },
);

showOrgTest(
  "org admins see edit/invite controls",
  async ({ page, editLinkLocator, inviteLinkLocator, signInAs, org }) => {
    await signInAs(org.admin);
    await page.goto(`/organizations/${org.id}`);
    await expect(editLinkLocator).toBeVisible();
    await expect(inviteLinkLocator).toBeVisible();
  },
);

showOrgTest(
  "org primary cannot delete their membership",
  async ({ page, signInAs, org }) => {
    await signInAs(org.primary);
    await page.goto(`/organizations/${org.id}`);
    await expect(
      page.getByRole("button", {
        name: `Delete  ${org.primary.email_address} from ${org.display_name}`,
      }),
    ).not.toBeVisible();
  },
);

showOrgTest(
  "org editors do not see edit/invite controls",
  async ({ page, org, editLinkLocator, inviteLinkLocator, signInAs }) => {
    await signInAs(org.editor);
    await page.goto(`/organizations/${org.id}`);
    await expect(editLinkLocator).not.toBeVisible();
    await expect(inviteLinkLocator).not.toBeVisible();
  },
);

showOrgTest(
  "org readers do not see edit/invite controls",
  async ({ page, org, editLinkLocator, inviteLinkLocator, signInAs }) => {
    await signInAs(org.reader);
    await page.goto(`/organizations/${org.id}`);
    await expect(editLinkLocator).not.toBeVisible();
    await expect(inviteLinkLocator).not.toBeVisible();
  },
);

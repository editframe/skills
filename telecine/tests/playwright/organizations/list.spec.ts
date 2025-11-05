import { test, expect, type Locator } from "../../util/test";

const listOrgsTest = test.extend<{
  orgLinkLocator: Locator;
  otherOrgLinkLocator: Locator;
}>({
  orgLinkLocator: async ({ page }, use) => {
    use(page.getByRole("link", { name: "New Organization" }));
  },
  otherOrgLinkLocator: async ({ page }, use) => {
    use(page.getByRole("link", { name: "Other Organization" }));
  },
});

listOrgsTest(
  "organization list requires authentication",
  async ({ requiresAuthentication }) => {
    await requiresAuthentication("/organizations");
  },
);

listOrgsTest(
  "org admins only see their own organization",
  async ({ signInAs, page, org, orgLinkLocator, otherOrgLinkLocator }) => {
    await signInAs(org.admin);
    await page.goto("/organizations");
    await expect(orgLinkLocator).toBeVisible();
    await expect(otherOrgLinkLocator).not.toBeVisible();
  },
);

listOrgsTest(
  "org editors only see their own organization",
  async ({ signInAs, page, org, orgLinkLocator, otherOrgLinkLocator }) => {
    await signInAs(org.editor);
    await page.goto("/organizations");
    await expect(orgLinkLocator).toBeVisible();
    await expect(otherOrgLinkLocator).not.toBeVisible();
  },
);

listOrgsTest(
  "org readers only see their own organization",
  async ({ signInAs, page, org, orgLinkLocator, otherOrgLinkLocator }) => {
    await signInAs(org.reader);
    await page.goto("/organizations");
    await expect(orgLinkLocator).toBeVisible();
    await expect(otherOrgLinkLocator).not.toBeVisible();
  },
);

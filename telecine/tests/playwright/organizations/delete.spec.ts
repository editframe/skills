import { test, expect, type Locator } from "../../util/test";
import type { safeCreateOrg } from "@/sql-client.server/safeCreateOrg";

const showOrgTest = test.extend<{
  deleteLinkLocator: Locator;
  deleteButtonLocator: Locator;
  createOrgWithPrimary: Awaited<ReturnType<typeof safeCreateOrg>>;
}>({
  deleteLinkLocator: async ({ page }, use) => {
    use(page.getByRole("link", { name: "Delete organization" }));
  },
  deleteButtonLocator: async ({ page }, use) => {
    use(page.getByRole("button", { name: "Delete organization" }));
  },
});

showOrgTest("requires authentication", async ({ requiresAuthentication }) => {
  await requiresAuthentication("/organizations/1");
});

showOrgTest(
  "org primary users do see delete button",
  async ({ page, deleteLinkLocator, deleteButtonLocator, signInAs, org }) => {
    await signInAs(org.primary);
    await page.goto(`/organizations/${org.id}`);
    await deleteLinkLocator.click();
    await expect(
      page.getByText(`Delete ${org.display_name} organization`),
    ).toBeVisible();
    await expect(
      page.getByText(
        "By deleting this organization, you will remove all members and their access to the organization. All renders and projects associated with this organization will be deleted. This action cannot be undone.",
      ),
    ).toBeVisible();
    await deleteButtonLocator.last().click();
    await expect(
      page.getByText(
        "Failed to delete organization, you may not have permission",
      ),
    ).not.toBeVisible();
  },
);
showOrgTest(
  "non-org primary users cannot delete org",
  async ({ page, deleteLinkLocator, signInAs, org }) => {
    await signInAs(org.editor);
    await page.goto(`/organizations/${org.id}`);
    await expect(deleteLinkLocator).not.toBeVisible();

    const url = `/organizations/${org.id}/delete`;

    const response = await page.evaluate(async (url) => {
      const res = await fetch(url, {
        method: "POST",
        redirect: "follow",
      });
      const html = await res.text();
      console.log(html);
      return html;
    }, url);

    expect(response).toContain(
      "Failed to delete organization, you may not have permission",
    );
  },
);

showOrgTest(
  "org editors do not see delete button",
  async ({ page, org, deleteLinkLocator, signInAs }) => {
    await signInAs(org.editor);
    await page.goto(`/organizations/${org.id}`);
    await expect(deleteLinkLocator).not.toBeVisible();
  },
);

showOrgTest(
  "org readers do not see delete button",
  async ({ page, org, deleteLinkLocator, signInAs }) => {
    await signInAs(org.reader);
    await page.goto(`/organizations/${org.id}`);
    await expect(deleteLinkLocator).not.toBeVisible();
  },
);

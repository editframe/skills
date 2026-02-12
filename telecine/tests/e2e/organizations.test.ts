import { describe, test, beforeAll } from "vitest";
import { safeCreateOrg } from "@/sql-client.server/safeCreateOrg";
import {
  setupBrowser,
  getPage,
  signInAs,
  requiresAuthentication,
  createUniqueUser,
  createFullOrgFixture,
  playwrightExpect,
  type FullOrgFixture,
} from "./setup";

setupBrowser();

describe("organizations - list", () => {
  let org: FullOrgFixture;

  beforeAll(async () => {
    org = await createFullOrgFixture("org-list");
  });

  test("organization list requires authentication", async () => {
    await requiresAuthentication("/organizations");
  });

  test("org admins only see their own organization", async () => {
    const page = getPage();
    await signInAs(org.admin);
    await page.goto("/organizations");
    await playwrightExpect(
      page.getByRole("link", { name: "New Organization" }),
    ).toBeVisible();
  });

  test("org editors only see their own organization", async () => {
    const page = getPage();
    await signInAs(org.editor);
    await page.goto("/organizations");
    await playwrightExpect(
      page.getByRole("link", { name: "New Organization" }),
    ).toBeVisible();
  });

  test("org readers only see their own organization", async () => {
    const page = getPage();
    await signInAs(org.reader);
    await page.goto("/organizations");
    await playwrightExpect(
      page.getByRole("link", { name: "New Organization" }),
    ).toBeVisible();
  });
});

describe("organizations - show", () => {
  let org: FullOrgFixture;
  let otherOrg: FullOrgFixture;

  beforeAll(async () => {
    org = await createFullOrgFixture("org-show");
    otherOrg = await createFullOrgFixture("org-show-other");
  });

  test("requires authentication", async () => {
    await requiresAuthentication("/organizations/1");
  });

  test("requires access to the org", async () => {
    const page = getPage();
    await signInAs(org.admin);
    await page.goto(`/organizations/${otherOrg.id}`);
    await playwrightExpect(
      page.getByText("Organization not found"),
    ).toBeVisible();
  });

  test("org admins see edit/invite controls", async () => {
    const page = getPage();
    await signInAs(org.admin);
    await page.goto(`/organizations/${org.id}`);
    await playwrightExpect(
      page.getByRole("button", { name: "Save changes", exact: true }),
    ).toBeVisible();
    await playwrightExpect(
      page.getByRole("button", { name: "Invite member" }),
    ).toBeVisible();
  });

  test("org primary cannot delete their membership", async () => {
    const page = getPage();
    await signInAs(org.primary);
    await page.goto(`/organizations/${org.id}`);
    await playwrightExpect(
      page.getByRole("button", {
        name: `Delete  ${org.primary.email_address} from ${org.display_name}`,
      }),
    ).not.toBeVisible();
  });

  test("org editors do not see edit/invite controls", async () => {
    const page = getPage();
    await signInAs(org.editor);
    await page.goto(`/organizations/${org.id}`);
    await playwrightExpect(
      page.getByRole("button", { name: "Save changes", exact: true }),
    ).not.toBeVisible();
    await playwrightExpect(
      page.getByRole("button", { name: "Invite member" }),
    ).not.toBeVisible();
  });

  test("org readers do not see edit/invite controls", async () => {
    const page = getPage();
    await signInAs(org.reader);
    await page.goto(`/organizations/${org.id}`);
    await playwrightExpect(
      page.getByRole("button", { name: "Save changes", exact: true }),
    ).not.toBeVisible();
    await playwrightExpect(
      page.getByRole("button", { name: "Invite member" }),
    ).not.toBeVisible();
  });
});

describe("organizations - new", () => {
  test("New org page requires authentication", async () => {
    await requiresAuthentication("/organizations/new");
  });

  test("Create new organization", async () => {
    const user = await createUniqueUser("org-new");
    const page = getPage();
    await signInAs(user);
    await page.goto("/organizations/new");

    const displayName = `New Organization ${user.email_address}`;
    await page.getByLabel("Display Name").fill(displayName);
    await page.getByRole("button", { name: "Create Organization" }).click();

    await playwrightExpect(page.getByRole("heading").first()).toHaveText(
      `Organization: ${displayName}`,
    );
  });
});

describe("organizations - edit", () => {
  let org: FullOrgFixture;

  beforeAll(async () => {
    org = await createFullOrgFixture("org-edit");
  });

  test("Edit org page requires authentication", async () => {
    await requiresAuthentication("/organizations/1/");
  });

  test("org-editors can not edit org", async () => {
    const page = getPage();
    await signInAs(org.editor);
    await page.goto(`/organizations/${org.id}/`);
    await playwrightExpect(
      page.getByText(
        "Restricted access: Only the organization owner can edit the organization details.",
      ),
    ).toBeVisible();
  });

  test("org-readers can not edit org", async () => {
    const page = getPage();
    await signInAs(org.reader);
    await page.goto(`/organizations/${org.id}/`);
    await playwrightExpect(
      page.getByText(
        "Restricted access: Only the organization owner can edit the organization details.",
      ),
    ).toBeVisible();
  });

  test("Edit new organization", async () => {
    const user = await createUniqueUser("org-edit-user");
    const editableOrg = await safeCreateOrg({
      displayName: `New Organization ${user.email_address}`,
      primary: user,
      admins: [user],
    });
    const page = getPage();
    await signInAs(user);

    await page.goto(`/organizations/${editableOrg.id}/`);
    await page.getByLabel("Display Name").fill("Edited");
    await page
      .getByRole("button", { name: "Save changes" })
      .click();
    await playwrightExpect(page.locator("h1").first()).toHaveText(
      "Organization: Edited",
    );
    await playwrightExpect(
      page.getByText("Organization edited successfully!"),
    ).toBeVisible();
  });
});

describe("organizations - delete", () => {
  test("requires authentication", async () => {
    await requiresAuthentication("/organizations/1");
  });

  test("org primary users do see delete button", async () => {
    const org = await createFullOrgFixture("org-del-primary");
    const page = getPage();
    await signInAs(org.primary);
    await page.goto(`/organizations/${org.id}`);
    await page.getByRole("link", { name: "Delete organization" }).click();

    await playwrightExpect(
      page.getByText(`Delete ${org.display_name} organization`),
    ).toBeVisible();
    await playwrightExpect(
      page.getByText(
        "By deleting this organization, you will remove all members and their access to the organization. All renders and projects associated with this organization will be deleted. This action cannot be undone.",
      ),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Delete organization" })
      .last()
      .click();
    await playwrightExpect(
      page.getByText(
        "Failed to delete organization, you may not have permission",
      ),
    ).not.toBeVisible();
  });

  test("non-org primary users cannot delete org", async () => {
    const org = await createFullOrgFixture("org-del-editor");
    const page = getPage();
    await signInAs(org.editor);
    await page.goto(`/organizations/${org.id}`);
    await playwrightExpect(
      page.getByRole("link", { name: "Delete organization" }),
    ).not.toBeVisible();

    const url = `/organizations/${org.id}/delete`;

    await page.evaluate(async (url) => {
      const res = await fetch(url, {
        method: "POST",
        redirect: "follow",
      });
      return await res.text();
    }, url);

    await playwrightExpect(
      page.getByText(
        "Failed to delete organization, you may not have permission",
      ),
    ).not.toBeVisible();
  });

  test("org editors do not see delete button", async () => {
    const org = await createFullOrgFixture("org-del-ed2");
    const page = getPage();
    await signInAs(org.editor);
    await page.goto(`/organizations/${org.id}`);
    await playwrightExpect(
      page.getByRole("link", { name: "Delete organization" }),
    ).not.toBeVisible();
  });

  test("org readers do not see delete button", async () => {
    const org = await createFullOrgFixture("org-del-rd");
    const page = getPage();
    await signInAs(org.reader);
    await page.goto(`/organizations/${org.id}`);
    await playwrightExpect(
      page.getByRole("link", { name: "Delete organization" }),
    ).not.toBeVisible();
  });
});

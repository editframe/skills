import { test, expect } from "@playwright/test";
import { safeRegisterUser } from "@/sql-client.server/safeRegisterUser";
import { signInAsEmailAddress } from "tests/util/signInAsEmailAddress";
import { safeCreateOrg } from "@/sql-client.server/safeCreateOrg";

test("Lists all user's projects", async ({ page, context }) => {
  await safeRegisterUser("project-user@example.org", "password123");
  await signInAsEmailAddress(context, "project-user@example.org");
  await page.goto("/projects/new");
});

test("Redirects to /auth/login if not signed in", async ({ page }) => {
  await page.goto("/projects/new");
  await expect(
    page.getByRole("button", { name: "login" }).last(),
  ).toBeVisible();
});

test.describe("As org admin", () => {
  test.skip("Creates a new project", async ({ page, context }) => {
    // Skipping for now, it seems to work, but loading the editor doesn't wor in playwright yet
    const admin = await safeRegisterUser(
      "org-admin@example.org",
      "password123",
    );
    await safeCreateOrg({
      primary: admin,
      displayName: "Example Org",
      admins: [admin],
      editors: [],
      readers: [],
    });
    await signInAsEmailAddress(context, "org-admin@example.org");

    await page.goto("/projects/new");
    await page.getByLabel("Project Name").fill("My New Project");
    await page.getByLabel("Org").selectOption("Example Org");
    await page.getByRole("button", { name: "Create project" }).click();

    await expect(page.getByText("EDITING")).toBeVisible();
  });
});

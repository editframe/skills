import { describe, test } from "vitest";
import { safeRegisterUser } from "@/sql-client.server/safeRegisterUser";
import { safeCreateOrg } from "@/sql-client.server/safeCreateOrg";
import { setupBrowser, getPage, getContext, playwrightExpect } from "./setup";
import { signInAsEmailAddress } from "../util/signInAsEmailAddress";

setupBrowser();

describe.skip("projects", () => {
  test.skip("Lists all user's projects", async () => {
    const context = getContext();
    await safeRegisterUser("project-user@example.org", "password123");
    await signInAsEmailAddress(context, "project-user@example.org");
    const page = getPage();
    await page.goto("/projects");
    await playwrightExpect(
      page.getByRole("heading", { name: "Projects" }),
    ).toBeVisible();
    await playwrightExpect(
      page.getByText("No projects yet. Create one!"),
    ).toBeVisible();
  });

  test("Redirects to /auth/login if not signed in", async () => {
    const page = getPage();
    await page.goto("/projects");
    await playwrightExpect(
      page.getByRole("button", { name: "login" }).last(),
    ).toBeVisible();
  });
});

describe.skip("projects/new", () => {
  test("Lists all user's projects", async () => {
    const context = getContext();
    await safeRegisterUser("project-user@example.org", "password123");
    await signInAsEmailAddress(context, "project-user@example.org");
    const page = getPage();
    await page.goto("/projects/new");
  });

  test("Redirects to /auth/login if not signed in", async () => {
    const page = getPage();
    await page.goto("/projects/new");
    await playwrightExpect(
      page.getByRole("button", { name: "login" }).last(),
    ).toBeVisible();
  });

  test.skip("As org admin, creates a new project", async () => {
    const context = getContext();
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
    const page = getPage();

    await page.goto("/projects/new");
    await page.getByLabel("Project Name").fill("My New Project");
    await page.getByLabel("Org").selectOption("Example Org");
    await page.getByRole("button", { name: "Create project" }).click();

    await playwrightExpect(page.getByText("EDITING")).toBeVisible();
  });
});

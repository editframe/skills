import { test, expect } from "@playwright/test";
import { safeRegisterUser } from "@/sql-client.server/safeRegisterUser";
import { signInAsEmailAddress } from "tests/util/signInAsEmailAddress";

test.skip("Lists all user's projects", async ({ page, context }) => {
  await safeRegisterUser("project-user@example.org", "password123");
  await signInAsEmailAddress(context, "project-user@example.org");
  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByText("No projects yet. Create one!")).toBeVisible();
});

test("Redirects to /auth/login if not signed in", async ({ page }) => {
  await page.goto("/projects");
  await expect(
    page.getByRole("button", { name: "login" }).last(),
  ).toBeVisible();
});

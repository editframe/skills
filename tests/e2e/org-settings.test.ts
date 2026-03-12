import { describe, test, beforeAll } from "vitest";
import {
  setupBrowser,
  getPage,
  signInAs,
  createFullOrgFixture,
  playwrightExpect,
  type FullOrgFixture,
} from "./setup";

setupBrowser();

let org: FullOrgFixture;

beforeAll(async () => {
  org = await createFullOrgFixture("org-settings");
});

describe("org settings", () => {
  test("Requires authentication", async () => {
    const page = getPage();
    await page.goto("/org/settings?org=123", {
      waitUntil: "domcontentloaded",
    });
    await playwrightExpect(page).toHaveURL(/\/auth\/login/);
  });

  test("Displays organization details", async () => {
    const page = getPage();
    await signInAs(org.primary);
    await page.goto(`/org/settings?org=${org.id}`);

    await playwrightExpect(
      page.getByRole("heading", { name: "Organization Settings" }),
    ).toBeVisible();

    const nameInput = page.getByLabel("Organization Name");
    const websiteInput = page.getByPlaceholder("Enter organization website");

    await playwrightExpect(nameInput).toBeVisible();
    await playwrightExpect(websiteInput).toBeVisible();
    await playwrightExpect(nameInput).toHaveValue(org.display_name);
    await playwrightExpect(websiteInput).toHaveValue(org.website || "");
  });

  test("Non-admin users see disabled fields", async () => {
    const page = getPage();
    await signInAs(org.reader);
    await page.goto(`/org/settings?org=${org.id}`);

    const nameInput = page.getByLabel("Organization Name");
    const websiteInput = page.getByPlaceholder("Enter organization website");
    const saveButton = page.getByRole("button", { name: "Save Changes" });

    await playwrightExpect(nameInput).toBeDisabled();
    await playwrightExpect(websiteInput).toBeDisabled();
    await playwrightExpect(saveButton).not.toBeVisible();
  });

  test("Updates organization details as admin", async () => {
    const freshOrg = await createFullOrgFixture("org-settings-upd");
    const page = getPage();
    await signInAs(freshOrg.primary);
    await page.goto(`/org/settings?org=${freshOrg.id}`);

    const nameInput = page.getByLabel("Organization Name");
    const websiteInput = page.getByPlaceholder("Enter organization website");

    await nameInput.fill("Updated Org Name");
    await websiteInput.fill("https://example.com");

    await page.getByRole("button", { name: "Save Changes" }).click();
    await playwrightExpect(
      page.getByText("Organization settings saved"),
    ).toBeVisible();

    await page.reload();
    await playwrightExpect(nameInput).toHaveValue("Updated Org Name");
    await playwrightExpect(websiteInput).toHaveValue("https://example.com");
  });

  test("Validates required fields", async () => {
    const page = getPage();
    await signInAs(org.primary);
    await page.goto(`/org/settings?org=${org.id}`);

    const nameInput = page.getByLabel("Organization Name");
    await nameInput.fill("");

    await page.getByRole("button", { name: "Save Changes" }).click();
    await playwrightExpect(
      page.getByText("Organization name is required"),
    ).toBeVisible();
  });

  test("Validates website format", async () => {
    const page = getPage();
    await signInAs(org.primary);
    await page.goto(`/org/settings?org=${org.id}`);

    const websiteInput = page.getByPlaceholder("Enter organization website");
    await websiteInput.fill("not-a-url");

    await page.getByRole("button", { name: "Save Changes" }).click();
    await playwrightExpect(page.getByText("Invalid URL")).toBeVisible();
  });
});

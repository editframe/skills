import { test, expect } from "TEST/util/test";

test("Requires authentication", async ({ requiresAuthentication }) => {
  await requiresAuthentication("/org/settings?org=123");
});

test("Displays organization details", async ({ page, signInAs, org }) => {
  await signInAs(org.primary);
  await page.goto(`/org/settings?org=${org.id}`);

  await expect(
    page.getByRole("heading", { name: "Organization Settings" })
  ).toBeVisible();

  const nameInput = page.getByLabel("Organization Name");
  const websiteInput = page.getByPlaceholder('Enter organization website');

  await expect(nameInput).toBeVisible();
  await expect(websiteInput).toBeVisible();

  await expect(nameInput).toHaveValue(org.display_name);
  await expect(websiteInput).toHaveValue(org.website || "");
});

test("Non-admin users see disabled fields", async ({ page, signInAs, org }) => {
  await signInAs(org.reader);
  await page.goto(`/org/settings?org=${org.id}`);

  const nameInput = page.getByLabel("Organization Name");
  const websiteInput = page.getByPlaceholder('Enter organization website');
  const saveButton = page.getByRole("button", { name: "Save Changes" });

  await expect(nameInput).toBeDisabled();
  await expect(websiteInput).toBeDisabled();
  await expect(saveButton).not.toBeVisible();
});

test("Updates organization details as admin", async ({ page, signInAs, org }) => {
  await signInAs(org.primary);
  await page.goto(`/org/settings?org=${org.id}`);

  const nameInput = page.getByLabel("Organization Name");
  const websiteInput = page.getByPlaceholder('Enter organization website');

  await nameInput.fill("Updated Org Name");
  await websiteInput.fill("https://example.com");

  await page.getByRole("button", { name: "Save Changes" }).click();

  await expect(page.getByText("Organization settings saved")).toBeVisible();

  // Verify persistence
  await page.reload();
  await expect(nameInput).toHaveValue("Updated Org Name");
  await expect(websiteInput).toHaveValue("https://example.com");
});

test("Validates required fields", async ({ page, signInAs, org }) => {
  await signInAs(org.primary);
  await page.goto(`/org/settings?org=${org.id}`);

  const nameInput = page.getByLabel("Organization Name");
  await nameInput.fill("");
  
  await page.getByRole("button", { name: "Save Changes" }).click();
  
  await expect(page.getByText("Organization name is required")).toBeVisible();
});

test("Validates website format", async ({ page, signInAs, org }) => {
  await signInAs(org.primary);
  await page.goto(`/org/settings?org=${org.id}`);

  const websiteInput = page.getByPlaceholder('Enter organization website');
  await websiteInput.fill("not-a-url");
  
  await page.getByRole("button", { name: "Save Changes" }).click();
  
  await expect(page.getByText("Invalid URL")).toBeVisible();
});

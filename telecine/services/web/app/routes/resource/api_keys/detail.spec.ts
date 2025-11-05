import { test, expect } from "TEST/util/test";

test("Requires authentication", async ({ requiresAuthentication }) => {
  await requiresAuthentication("/resource/api_keys/123");
});

test("Requires editor permissions", async ({ page, signInAs, org }) => {
  await signInAs(org.reader);
  await page.goto(`/resource/api_keys/${org.apiKey.id}?org=${org.id}`);

  // Should show permission denied message
  await expect(page.getByText(/You don't have permission/)).toBeVisible();
  // Edit button should not be visible
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).not.toBeVisible();
  // Go back button should be visible
  await page.getByRole("link", { name: "Go back" }).click();
  // Should redirect to the API keys page
  expect(page.url()).toMatch(/\/resource\/api_keys/);
});

test("Displays API key details for admin", async ({ page, signInAs, org }) => {
  await signInAs(org.primary);
  await page.goto(`/resource/api_keys/${org.apiKey.id}?org=${org.id}`);

  // Check that all main elements are visible
  await expect(page.getByText(`API Key: ${org.apiKey.name}`)).toBeVisible();
  // Check expiration message is visible
  await expect(page.getByText(/This API key will/)).toBeVisible();
});

test("Can regenerate API token", async ({ page, signInAs, org }) => {
  await signInAs(org.primary);
  await page.goto(`/resource/api_keys/${org.apiKey.id}?org=${org.id}`);

  await page.getByRole("button", { name: "Regenerate Token" }).click();
  await page.getByLabel(/Type .* to confirm/).fill(org.apiKey.name);
  await page.getByRole("button", { name: "Regenerate", exact: true }).click();

  await expect(page.getByText("Regenerated!")).toBeVisible();
  // Check that secret field is displayed
  await expect(page.getByText("Copy API Token")).toBeVisible();
});

test("Can update API key details", async ({ page, signInAs, org }) => {
  await signInAs(org.primary);
  await page.goto(`/resource/api_keys/${org.apiKey.id}?org=${org.id}`);

  await page.getByLabel("name").fill("Updated API Key");

  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText("API Key: Updated API Key")).toBeVisible();
});

test("Can configure webhooks", async ({ page, signInAs, org }) => {
  await signInAs(org.primary);
  await page.goto(`/resource/api_keys/${org.apiKey.id}?org=${org.id}`);

  await page.getByLabel("Webhook URL").fill("https://example.com/webhook");
  await page.getByText("render.created").click();
  await page.getByText("render.failed").click();

  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(
    page.getByRole("heading", { name: "API key updated successfully" }),
  ).toBeVisible();
});

test("Can regenerate webhook signing secret", async ({
  page,
  signInAs,
  org,
}) => {
  await signInAs(org.primary);
  await page.goto(`/resource/api_keys/${org.apiKey.id}?org=${org.id}`);

  await page.getByRole("button", { name: "Regenerate Webhook Secret" }).click();
  await page.getByLabel(/Type .* to confirm/).fill(org.apiKey.name);
  await page.getByRole("button", { name: "Regenerate", exact: true }).click();

  await expect(page.getByText("Regenerated!")).toBeVisible();
  // Check that secret field is displayed
  await expect(page.getByText("Copy Webhook Signing Secret")).toBeVisible();
});

test("Can extend expiration", async ({ page, signInAs, org }) => {
  await signInAs(org.primary);
  await page.goto(`/resource/api_keys/${org.apiKey.id}?org=${org.id}`);

  await page.getByRole("button", { name: "Extend Expiration" }).click();
  await page.getByLabel("Extension period").click();
  await page.getByRole("option", { name: "day" }).click();
  await page.getByRole("button", { name: "Extend Expiration" }).click();

  await expect(
    page.getByText("will expire in 23 hours from now"),
  ).toBeVisible();
});

test("Can delete API key", async ({ page, signInAs, org }) => {
  await signInAs(org.primary);
  await page.goto(`/resource/api_keys/${org.apiKey.id}?org=${org.id}`);

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByLabel(/Type .* to confirm/).fill(org.apiKey.name);
  await page
    .getByLabel("Delete API key for Test API")
    .getByRole("button", { name: "Delete" })
    .click();

  await expect(page.getByText("API key deleted")).toBeVisible();
});

test("Validates webhook URL format when updating", async ({
  page,
  signInAs,
  org,
}) => {
  await signInAs(org.primary);
  await page.goto(`/resource/api_keys/${org.apiKey.id}?org=${org.id}`);

  await page.getByLabel("Webhook URL").fill("not-a-url");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(
    page.getByText("Must be a valid URL starting with http:// or https://"),
  ).toBeVisible();
});
